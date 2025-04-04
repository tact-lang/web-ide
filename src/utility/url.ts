export function getUrlParams(): URLSearchParams {
  const search = window.location.search;
  const hash = window.location.hash;

  // Prefer `search`, fallback to `hash` (converted to query format)
  const queryString =
    search || (hash.startsWith('#') ? `?${hash.slice(1)}` : '');

  return new URLSearchParams(queryString);
}
