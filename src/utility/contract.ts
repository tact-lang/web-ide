import { relativePath } from './filePath';
import { stripPrefix, stripSuffix } from './utils';

/**
 * Extracts the contract name from a file path like:
 *   /projects/projectName/dist/func_contractName.abi
 */
export function extractContractName(
  contractFilePath: string,
  projectPath: string,
): string {
  let filePath = relativePath(contractFilePath, projectPath);

  filePath = stripPrefix(filePath, 'dist/');

  // Remove either 'tact_' or 'func_' from start, if present
  filePath = stripPrefix(filePath, 'tact_');
  filePath = stripPrefix(filePath, 'func_');

  // Remove extension
  filePath = stripSuffix(filePath, '.abi');

  return filePath;
}
