/**
 * `localhost`, `*.localhost`, `127.0.0.1` or `[::1]`: the vite dev server or the
 * Rusty Buns desktop host (which binds 127.0.0.1), never the live site. Requests
 * from these hosts skip the HTTPS redirect and are never parsed for an org subdomain
 * (`127.0.0.1` splits into four parts and would otherwise read as the org "127").
 */
export function isLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '127.0.0.1' || hostname === '[::1]';
}

/** An IP loopback host: no subdomains are possible, so there is no org to extract. */
export function isLoopbackIp(hostname: string): boolean {
  return hostname === '127.0.0.1' || hostname === '[::1]';
}
