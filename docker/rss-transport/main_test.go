package main

import (
	"net"
	"testing"
)

func TestValidateTarget(t *testing.T) {
	valid := []string{
		"https://feeds.example.com/rss.xml",
		"https://feeds.example.com:8443/rss.xml?signed=value",
	}
	for _, target := range valid {
		if _, err := validateTarget(target); err != nil {
			t.Fatalf("expected %q to be valid: %v", target, err)
		}
	}
	blocked := []string{
		"http://feeds.example.com/rss.xml",
		"https://user@example.com/rss.xml",
		"https://localhost/rss.xml",
		"https://homeassistant.local/rss.xml",
		"https://127.0.0.1/rss.xml",
		"https://[::1]/rss.xml",
	}
	for _, target := range blocked {
		if _, err := validateTarget(target); err == nil {
			t.Fatalf("expected %q to be blocked", target)
		}
	}
}

func TestPrivateIPPolicy(t *testing.T) {
	blocked := []string{"0.0.0.0", "10.0.0.1", "100.64.0.1", "127.0.0.1", "169.254.1.1", "172.16.0.1", "192.168.0.1", "224.0.0.1", "::", "::1", "fc00::1", "fe80::1", "fec0::1", "::ffff:127.0.0.1"}
	for _, address := range blocked {
		if !isPrivateIP(net.ParseIP(address)) {
			t.Fatalf("expected %s to be private", address)
		}
	}
	for _, address := range []string{"8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"} {
		if isPrivateIP(net.ParseIP(address)) {
			t.Fatalf("expected %s to be public", address)
		}
	}
}

func TestXMLContentTypes(t *testing.T) {
	for _, contentType := range []string{"application/rss+xml; charset=utf-8", "application/atom+xml", "application/xml", "text/xml"} {
		if !isAllowedXMLContentType(contentType) {
			t.Fatalf("expected %q to be accepted", contentType)
		}
	}
	for _, contentType := range []string{"", "text/html", "application/json"} {
		if isAllowedXMLContentType(contentType) {
			t.Fatalf("expected %q to be rejected", contentType)
		}
	}
}
