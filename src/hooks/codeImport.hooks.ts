import { ContractLanguage } from '@/interfaces/workspace.interface';
import { decodeBase64 } from '@/utility/utils';
import { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useFileTab from './fileTabs.hooks';
import { baseProjectPath, useProject } from './projectV2.hooks';

export const useCodeImport = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { createProject } = useProject();
  const { open: openTab } = useFileTab();

  const removeImportParams = useCallback(() => {
    // Remove all query params related to importing code
    const keysToRemove = ['code', 'lang', 'importURL', 'name'];
    const finalQueryParam = new URLSearchParams(searchParams);

    keysToRemove.forEach((key) => {
      finalQueryParam.delete(key);
    });

    navigate(`?${finalQueryParam.toString()}`, { replace: true });
  }, [navigate, searchParams]);

  const importEncodedCode = useCallback(
    async (code: string, language: ContractLanguage) => {
      const fileExtension = language === 'func' ? 'fc' : language;
      const defaultFileName = `main.${fileExtension}`;

      removeImportParams();

      await createProject({
        name: 'temp',
        language,
        template: 'import',
        file: null,
        defaultFiles: [
          {
            id: '',
            parent: null,
            path: defaultFileName,
            type: 'file' as const,
            name: defaultFileName,
            content: decodeBase64(code),
          },
        ],
        isTemporary: true,
      });

      openTab(defaultFileName, `${baseProjectPath}/temp/${defaultFileName}`);
    },
    [createProject, openTab, removeImportParams],
  );

  return {
    importEncodedCode,
    removeImportParams,
  };
};
