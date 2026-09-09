package main

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"mime"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"
)

const (
	socketPath     = "/run/navet/rss-transport.sock"
	maxFeedBytes   = 1024 * 1024
	maxURLBytes    = 8192
	requestLimit   = 32
	requestTimeout = 10 * time.Second
)

type feedResponse struct {
	status      int
	contentType string
	body        []byte
}

type errorBody struct {
	Error string `json:"error"`
}

func rssError(status int, message string) feedResponse {
	body, _ := json.Marshal(errorBody{Error: message})
	return feedResponse{status: status, contentType: "application/json; charset=utf-8", body: body}
}

func isBlockedHostname(hostname string) bool {
	normalized := strings.TrimSuffix(strings.ToLower(hostname), ".")
	return normalized == "localhost" || strings.HasSuffix(normalized, ".localhost") ||
		strings.HasSuffix(normalized, ".local")
}

func isPrivateIP(ip net.IP) bool {
	if !ip.IsGlobalUnicast() || ip.IsLoopback() || ip.IsPrivate() ||
		ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsUnspecified() {
		return true
	}
	if ipv4 := ip.To4(); ipv4 != nil {
		return ipv4[0] == 0 || ipv4[0] == 127 || ipv4[0] >= 224 ||
			(ipv4[0] == 100 && ipv4[1] >= 64 && ipv4[1] <= 127) ||
			(ipv4[0] == 169 && ipv4[1] == 254)
	}
	// Deprecated IPv6 site-local space fec0::/10 is not classified by net.IP.IsPrivate.
	return len(ip) == net.IPv6len && ip[0] == 0xfe && ip[1]&0xc0 == 0xc0
}

func validateTarget(rawTarget string) (*url.URL, error) {
	if len([]byte(rawTarget)) > maxURLBytes {
		return nil, fmt.Errorf("feed URL is too large")
	}
	target, err := url.ParseRequestURI(rawTarget)
	if err != nil || target.Scheme != "https" || target.Host == "" || target.User != nil {
		return nil, fmt.Errorf("only HTTPS feeds without credentials are allowed")
	}
	if isBlockedHostname(target.Hostname()) {
		return nil, fmt.Errorf("private feed hosts are not allowed")
	}
	if literal := net.ParseIP(target.Hostname()); literal != nil && isPrivateIP(literal) {
		return nil, fmt.Errorf("private feed hosts are not allowed")
	}
	return target, nil
}

func resolvePublicAddresses(ctx context.Context, hostname string) ([]net.IP, error) {
	addresses, err := net.DefaultResolver.LookupIP(ctx, "ip", hostname)
	if err != nil || len(addresses) == 0 {
		return nil, fmt.Errorf("feed hostname lookup failed")
	}
	for _, address := range addresses {
		if isPrivateIP(address) {
			return nil, fmt.Errorf("private DNS targets are not allowed")
		}
	}
	return addresses, nil
}

func isAllowedXMLContentType(value string) bool {
	mediaType, _, err := mime.ParseMediaType(value)
	if err != nil {
		return false
	}
	mediaType = strings.ToLower(mediaType)
	return mediaType == "application/rss+xml" || mediaType == "application/atom+xml" ||
		mediaType == "application/xml" || mediaType == "text/xml" ||
		strings.HasSuffix(mediaType, "+xml") || strings.HasSuffix(mediaType, "/rss") ||
		strings.HasSuffix(mediaType, "/atom") || strings.HasSuffix(mediaType, "/xml")
}

func fetchFeed(ctx context.Context, rawTarget string) feedResponse {
	target, err := validateTarget(rawTarget)
	if err != nil {
		if strings.Contains(err.Error(), "too large") {
			return rssError(http.StatusRequestEntityTooLarge, "Feed URL is too large")
		}
		if strings.Contains(err.Error(), "private") {
			return rssError(http.StatusBadRequest, "Private feed hosts are not allowed")
		}
		return rssError(http.StatusBadRequest, "Only HTTPS feeds without credentials are allowed")
	}

	addresses, err := resolvePublicAddresses(ctx, target.Hostname())
	if err != nil {
		if strings.Contains(err.Error(), "private") {
			return rssError(http.StatusBadRequest, "Private feed hosts are not allowed")
		}
		return rssError(http.StatusBadGateway, "Unable to load feed")
	}

	dialer := &net.Dialer{Timeout: 5 * time.Second}
	transport := &http.Transport{
		Proxy:             nil,
		DisableKeepAlives: true,
		TLSClientConfig:   &tls.Config{MinVersion: tls.VersionTLS12},
		DialContext: func(dialContext context.Context, network, address string) (net.Conn, error) {
			_, port, splitErr := net.SplitHostPort(address)
			if splitErr != nil {
				return nil, splitErr
			}
			var lastError error
			for _, ip := range addresses {
				connection, dialErr := dialer.DialContext(dialContext, network, net.JoinHostPort(ip.String(), port))
				if dialErr == nil {
					return connection, nil
				}
				lastError = dialErr
			}
			return nil, lastError
		},
	}
	defer transport.CloseIdleConnections()

	request, _ := http.NewRequestWithContext(ctx, http.MethodGet, target.String(), nil)
	request.Header.Set("Accept", "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9")
	request.Header.Set("User-Agent", "Navet RSS Reader/1.0")
	client := &http.Client{
		Transport:     transport,
		CheckRedirect: func(_ *http.Request, _ []*http.Request) error { return http.ErrUseLastResponse },
	}
	response, err := client.Do(request)
	if err != nil {
		return rssError(http.StatusBadGateway, "Unable to load feed")
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return rssError(http.StatusBadGateway, fmt.Sprintf("Upstream feed request failed with status %d", response.StatusCode))
	}
	contentType := response.Header.Get("Content-Type")
	if !isAllowedXMLContentType(contentType) {
		return rssError(http.StatusBadGateway, "Upstream feed returned an unsupported content type")
	}
	if response.ContentLength > maxFeedBytes {
		return rssError(http.StatusBadGateway, "Upstream feed is too large")
	}
	body, err := io.ReadAll(io.LimitReader(response.Body, maxFeedBytes+1))
	if err != nil {
		return rssError(http.StatusBadGateway, "Unable to load feed")
	}
	if len(body) > maxFeedBytes {
		return rssError(http.StatusBadGateway, "Upstream feed is too large")
	}
	return feedResponse{status: http.StatusOK, contentType: contentType, body: body}
}

func writeResponse(writer http.ResponseWriter, response feedResponse) {
	writer.Header().Set("Cache-Control", "no-store")
	writer.Header().Set("Connection", "close")
	writer.Header().Set("Content-Type", response.contentType)
	writer.Header().Set("X-Content-Type-Options", "nosniff")
	writer.WriteHeader(response.status)
	_, _ = writer.Write(response.body)
}

func main() {
	if err := os.Remove(socketPath); err != nil && !errors.Is(err, os.ErrNotExist) {
		log.Fatal(err)
	}
	listener, err := net.Listen("unix", socketPath)
	if err != nil {
		log.Fatal(err)
	}
	if err := os.Chmod(socketPath, 0o660); err != nil {
		_ = listener.Close()
		log.Fatal(err)
	}
	defer os.Remove(socketPath)

	semaphore := make(chan struct{}, requestLimit)
	handler := http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		select {
		case semaphore <- struct{}{}:
			defer func() { <-semaphore }()
		default:
			writeResponse(writer, rssError(http.StatusServiceUnavailable, "Feed transport is busy"))
			return
		}
		if request.Method != http.MethodPost || request.URL.Path != "/" {
			writeResponse(writer, rssError(http.StatusMethodNotAllowed, "Only feed transport POST requests are supported"))
			return
		}
		request.Body = http.MaxBytesReader(writer, request.Body, maxURLBytes)
		body, readErr := io.ReadAll(request.Body)
		if readErr != nil {
			writeResponse(writer, rssError(http.StatusRequestEntityTooLarge, "Feed URL is too large"))
			return
		}
		target := strings.TrimSpace(string(body))
		if target == "" {
			writeResponse(writer, rssError(http.StatusBadRequest, "Missing feed URL"))
			return
		}
		ctx, cancel := context.WithTimeout(request.Context(), requestTimeout)
		defer cancel()
		writeResponse(writer, fetchFeed(ctx, target))
	})
	server := &http.Server{
		Handler:           handler,
		ReadHeaderTimeout: requestTimeout,
		ReadTimeout:       requestTimeout,
		WriteTimeout:      12 * time.Second,
		IdleTimeout:       requestTimeout,
	}

	shutdownContext, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	go func() {
		<-shutdownContext.Done()
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		_ = server.Shutdown(ctx)
	}()
	log.Printf("RSS transport ready on %s", socketPath)
	if err := server.Serve(listener); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}
