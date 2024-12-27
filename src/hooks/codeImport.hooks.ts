import { ContractLanguage } from '@/interfaces/workspace.interface';
import { decodeBase64 } from '@/utility/utils';
import { useRouter } from 'next/router';
import { useCallback } from 'react';
import useFileTab from './fileTabs.hooks';
import { baseProjectPath, useProject } from './projectV2.hooks';

export const useCodeImport = () => {
  const router = useRouter();
  const { createProject } = useProject();
  const { open: openTab } = useFileTab();

  const removeImportParams = useCallback(async () => {
    // Remove all query params related to importing code
    const keysToRemove = ['code', 'lang', 'importURL', 'name'];
    const finalQueryParam = Object.fromEntries(
      Object.entries(router.query).filter(
        ([key]) => !keysToRemove.includes(key),
      ),
    );

    await router.replace({ query: finalQueryParam });
  }, [router]);

  const importEncodedCode = useCallback(
    async (code: string, language: ContractLanguage) => {
      const fileExtension = language === 'func' ? 'fc' : language;
      const defaultFileName = `main.${fileExtension}`;

      await removeImportParams();

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
