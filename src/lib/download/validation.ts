import { lookup } from 'dns/promises';

/**
 * Checks if a hostname string is a known private/localhost identifier
 * (does not perform DNS resolution)
 */
function isPrivateHostname(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '[::1]'
  );
}

/**
 * Checks if an IP address (v4 or v6) is in a private/reserved range
 */
function isPrivateIP(ip: string): boolean {
  // IPv4 private ranges
  if (ip.startsWith('192.168.')) return true;
  if (ip.startsWith('10.')) return true;

  // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
  const parts = ip.split('.');
  if (parts.length === 4 && parts[0] === '172') {
    const second = parseInt(parts[1], 10);
    if (second >= 16 && second <= 31) return true;
  }

  // Loopback (127.0.0.0/8)
  if (ip === '127.0.0.1' || ip.startsWith('127.')) return true;

  // Link-local (169.254.0.0/16)
  if (ip.startsWith('169.254.')) return true;

  // IPv6 localhost
  if (ip === '::1' || ip.toLowerCase().startsWith('::ffff:127.')) return true;

  // IPv6 link-local (fe80::/10)
  if (ip.toLowerCase().startsWith('fe80:')) return true;

  return false;
}

/**
 * Validates a URL for security before passing to yt-dlp
 * @throws Error if URL is invalid or potentially malicious
 */
export async function validateUrl(url: string): Promise<void> {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch (error) {
    throw new Error(`Invalid URL: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Only allow http/https protocols
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`Unsupported protocol: ${parsed.protocol}`);
  }

  // Blocklist localhost/private IPs (SSRF prevention)
  const hostname = parsed.hostname.toLowerCase();

  // First check hostname string (blocks direct IP access)
  if (isPrivateHostname(hostname) || isPrivateIP(hostname)) {
    throw new Error('Private IP addresses are not allowed');
  }

  // Then resolve DNS and check all resulting IPs
  try {
    const addresses = await lookup(hostname, { all: true });
    for (const { address } of addresses) {
      if (isPrivateIP(address)) {
        throw new Error(
          `Domain ${hostname} resolves to private IP ${address}. ` +
          `Private IP addresses are not allowed.`
        );
      }
    }
  } catch (error) {
    // DNS lookup failures should propagate
    if (error instanceof Error && error.message.includes('resolves to private IP')) {
      throw error; // Re-throw our validation errors
    }
    throw new Error(
      `DNS resolution failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
