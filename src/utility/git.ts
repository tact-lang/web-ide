import GitManager from '@/lib/git';

export const setConfigValue = async (
  key: string,
  value: string,
  dest: string,
) => {
  const git = new GitManager();
  await git.setConfig({
    path: key,
    dest,
    value: value,
  });
};

export const getConfigValue = async (
  key: string,
  fallback: string,
  dest: string,
): Promise<string | null> => {
  const git = new GitManager();
  const gitConfig = JSON.parse(localStorage.getItem('gitConfig') ?? '{}');

  // Check Git configuration first, then fallback to localStorage if not found
  const gitValue = await git.getConfig({
    path: key,
    dest,
  });
  return gitValue ?? gitConfig[fallback] ?? null;
};
