export function parseMdlSlug(value: string) {
  // Preserve the upstream slug: Kuryana's numeric-only title lookup returns {}.
  const match = /^mdl-([1-9]\d{0,14}-[a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(value);
  return value.length <= 100 && match ? match[1] : null;
}
