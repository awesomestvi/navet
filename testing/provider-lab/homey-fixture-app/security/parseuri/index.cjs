const { parseUri } = require('parseuri-patched');

// Preserve the fields consumed by socket.io 2 / engine.io 3 without their ReDoS parser.
module.exports = function parseuri(source) {
  const parsed = parseUri(source, 'friendly');
  const ipv6uri = parsed.hostname.startsWith('[');
  const host = ipv6uri ? parsed.hostname.slice(1, -1) : parsed.hostname;
  return {
    source,
    protocol: parsed.protocol.toLowerCase(),
    authority: ipv6uri ? parsed.authority.replace('[', '').replace(']', '') : parsed.authority,
    userInfo: parsed.userinfo,
    user: parsed.username,
    password: parsed.password,
    host,
    port: parsed.port,
    relative: parsed.resource,
    path: parsed.pathname,
    directory: parsed.directory,
    file: parsed.filename,
    query: parsed.query,
    anchor: parsed.fragment,
    ipv6uri,
    pathNames: parsed.pathname.split('/').filter(Boolean),
    queryKey: Object.fromEntries(parsed.queryParams),
  };
};
