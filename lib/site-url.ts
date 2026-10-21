/** The configured canonical origin, never a guessed deployment hostname. */
export function getSiteOrigin(): string | undefined {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configured) return undefined;
  try {
    const url = new URL(configured);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    )
      return undefined;
    const local =
      url.hostname === "localhost" ||
      url.hostname.endsWith(".localhost") ||
      url.hostname === "[::1]" ||
      url.hostname.startsWith("127.") ||
      url.hostname === "0.0.0.0";
    if (
      process.env.NODE_ENV === "production" &&
      (local || url.protocol !== "https:")
    )
      return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}
