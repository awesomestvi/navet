var FEED_URL_PATTERN = /^https?:\/\//;
var ACCEPT_HEADER =
  'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8';
var USER_AGENT = 'Navet RSS Reader/1.0';

function sendJson(r, statusCode, payload) {
  r.headersOut['Cache-Control'] = 'no-store';
  r.headersOut['Content-Type'] = 'application/json; charset=utf-8';
  r.return(statusCode, JSON.stringify(payload));
}

async function handle(r) {
  var targetUrl = typeof r.args.url === 'string' ? r.args.url.trim() : '';

  if (!targetUrl) {
    sendJson(r, 400, { error: 'Missing url query parameter' });
    return;
  }

  if (!FEED_URL_PATTERN.test(targetUrl)) {
    sendJson(r, 400, { error: 'Invalid protocol' });
    return;
  }

  try {
    var response = await ngx.fetch(targetUrl, {
      headers: {
        Accept: ACCEPT_HEADER,
        'User-Agent': USER_AGENT,
      },
    });

    if (!response.ok) {
      sendJson(r, 502, {
        error: 'Upstream feed request failed with status ' + response.status,
      });
      return;
    }

    var body = await response.text();
    var contentType = response.headers.get('Content-Type');

    r.headersOut['Cache-Control'] = 'no-store';
    r.headersOut['Content-Type'] = contentType
      ? contentType
      : 'application/xml; charset=utf-8';
    r.return(200, body);
  } catch (error) {
    sendJson(r, 502, { error: 'Unable to load feed' });
  }
}

export default { handle: handle };
