import { stripPrefix } from './utils';

export function relativePath(fullPath: string, basePath: string): string {
  let path = stripPrefix(fullPath, basePath);

  // If there's a leading slash (after removing basePath), remove it:
  if (path.startsWith('/')) {
    path = path.slice(1);
  }

  return path;
}

export function replaceFileExtension(
  filePath: string,
  oldExt: string,
  newExt: string,
): string {
  if (filePath.endsWith(oldExt)) {
    return filePath.slice(0, -oldExt.length) + newExt;
  }
  // If the file doesn’t end with `oldExt`, return unchanged, or handle otherwise
  return filePath;
}
