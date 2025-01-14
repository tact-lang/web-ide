import { ContractLanguage, Tree } from '@/interfaces/workspace.interface';
import { replaceFileExtension } from './filePath';
import { getFileExtension, stripPrefix, stripSuffix } from './utils';

export function filterABIFiles(
  files: Tree[],
  basePath: string,
  lang: ContractLanguage,
) {
  return files
    .filter((file) => {
      const fileExtension = getFileExtension(file.name);
      const isAbiFile =
        file.path.startsWith(`${basePath}/dist`) && fileExtension === 'abi';

      if (lang === 'func') {
        return isAbiFile;
      }

      // For tact we have to check if both ABI and It's wrapper TS file is present.
      const hasTsFile = files.some(
        (f) => f.path === replaceFileExtension(file.path, '.abi', '.ts'),
      );
      return isAbiFile && hasTsFile;
    })
    .map((file) => ({
      id: file.id,
      name: cleanAbiFileName(file.name),
      path: file.path,
    }));
}

/**
 * A convenience function to remove .abi if at the end,
 * and also remove 'tact_' or 'func_' prefixes if at the start.
 */
export function cleanAbiFileName(rawName: string): string {
  let name = stripSuffix(rawName, '.abi');
  name = stripPrefix(name, 'tact_');
  name = stripPrefix(name, 'func_');
  return name;
}
