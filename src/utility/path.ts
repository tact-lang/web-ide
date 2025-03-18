import Path from '@isomorphic-git/lightning-fs/src/path';

export function normalizeRelativePath(path: string, basePath: string): string {
  const normalizedPath: string = Path.normalize(path);
  const normalizedBase: string = Path.normalize(basePath);

  if (normalizedPath.startsWith(normalizedBase + '/')) {
    return normalizedPath.slice(normalizedBase.length + 1);
  }

  // Return original path if it doesn't start with the base path
  return normalizedPath;
}
