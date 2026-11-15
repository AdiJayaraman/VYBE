/**
 * CORS is allowlist-driven in production (`CORS_ORIGINS`), and reflects the
 * request origin in development so localhost ports work without config.
 */
export function parseAllowedOrigins(raw: string | undefined = process.env.CORS_ORIGINS): string[] {
  return (raw ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export function resolveCorsOrigin(): string[] | boolean {
  const allowed = parseAllowedOrigins();
  if (allowed.length > 0) return allowed;
  return process.env.NODE_ENV === 'production' ? false : true;
}
