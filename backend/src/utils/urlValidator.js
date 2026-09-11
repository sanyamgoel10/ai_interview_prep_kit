const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^::1$/,
  /^localhost$/i,
  /^0\./,
  /^169\.254\./,
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
