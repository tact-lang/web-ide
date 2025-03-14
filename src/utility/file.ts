import { ProjectSetting, Tree } from '@/interfaces/workspace.interface';
import { relativePath, replaceFileExtension } from './filePath';
import { getFileExtension, stripPrefix, stripSuffix } from './utils';

export function filterABIFiles(files: Tree[], project: ProjectSetting) {
  return files
    .filter((file) => {
      const fileExtension = getFileExtension(file.name);
      const projectBuildDir = project.path + '/dist';
      const relativeFilePath = relativePath(file.path, projectBuildDir);

      const isAbiFile =
        file.path.startsWith(projectBuildDir) && fileExtension === 'abi';

      if (isAbiFile && project.buildContractList && project.selectedContract) {
        const abiCollection =
          project.buildContractList[
            relativePath(project.selectedContract, project.path!)
          ];
        return (
          Array.isArray(abiCollection) &&
          abiCollection.includes(relativeFilePath)
        );
      }

      if (project.language === 'func') {
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
