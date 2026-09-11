const PRIVATE_RANGES = [
  /^127\./,           // loopback
  /^10\./,            // RFC1918
  /^192\.168\./,      // RFC1918
  /^172\.(1[6-9]|2\d|3[01])\./, // RFC1918
  /^0\./,             // this-network
  /^169\.254\./,      // link-local (AWS/GCP metadata lives here)
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // CGNAT RFC6598
  /^::1$/,            // IPv6 loopback
  /^::ffff:/i,        // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1)
  /^fe80:/i,          // IPv6 link-local
  /^fc[0-9a-f]/i,     // IPv6 unique-local fc00::/7
  /^fd[0-9a-f]/i,     // IPv6 unique-local fd00::/8
  /^localhost$/i,
  /^metadata\.google\.internal$/i, // GCP metadata endpoint
];

function isPrivateHost(hostname) {
  return PRIVATE_RANGES.some(r => r.test(hostname));
}

function validateExternalUrl(urlString) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { valid: false, reason: 'Only http/https URLs allowed' };
  }

  // In production, block private IPs. In development/test allow localhost for batch testing.
  if (process.env.NODE_ENV === 'production' && isPrivateHost(parsed.hostname)) {
    return { valid: false, reason: 'Private/loopback addresses not allowed in production' };
  }

  return { valid: true, url: parsed };
}

module.exports = { validateExternalUrl, isPrivateHost };
