import { AppConfig } from '@/config/AppConfig';
import { Tree } from '@/interfaces/workspace.interface';
import fileSystem from '@/lib/fs';
import ZIP from '@/lib/zip';
import axios from 'axios';

async function convertToZipUrl(
  gitUrl: string,
): Promise<{ url: string; path: string }> {
  try {
    const cleanedUrl = gitUrl.replace(/\/$/, '');
    const regex = /github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+))?/;
    const match = cleanedUrl.match(regex);
    let pathName = '';

    if (cleanedUrl.includes('/tree/') && cleanedUrl.split('/').length >= 6) {
      pathName = cleanedUrl.split('tree/')[1].split('/').slice(1).join('/');
    }

    if (match) {
      const [_, owner, repo, branch] = match;

      // Fetch the default branch if it's not provided in the URL
      let branchName = branch;
      if (!branchName) {
        const response = await fetch(
          `https://api.github.com/repos/${owner}/${repo}`,
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || 'Failed to fetch repository details',
          );
        }
        const repoData = await response.json();
        branchName = repoData.default_branch;
      }

      const zipUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/${branchName}.zip`;
      return { url: zipUrl, path: pathName };
    }

    throw new Error('Invalid GitHub URL format');
  } catch (error) {
    throw new Error(
      (error as Error).message ||
        'Invalid GitHub URL or failed to fetch repository details',
    );
  }
}

export async function downloadRepo(repoURL: string): Promise<Tree[]> {
  const { url, path } = await convertToZipUrl(repoURL);
  if (!url) {
    throw new Error('Invalid GitHub URL');
  }

  const zipResponse = await axios.get(`${AppConfig.proxy.url}${url}`, {
    headers: { 'x-cors-api-key': AppConfig.proxy.key },
    responseType: 'arraybuffer',
  });

  const blob = new Blob([zipResponse.data], { type: 'application/zip' });
  const filesData = await new ZIP(fileSystem).importZip(blob, '', false);

  if (filesData.length === 0) {
    throw new Error('No files found in the repository');
  }

  return filesData.reduce((acc: Tree[], item) => {
    // Remove the repo name from the path. Ex. /repo-name/file.ts -> /file.ts
    item.path = item.path.split('/').slice(2).join('/');

    if (path && item.path.startsWith(path)) {
      item.path = item.path.replace(path, '').replace(/^\/+/, ''); // Remove leading '/'
      acc.push({ ...item, type: 'file' }); // Add modified item to accumulator
    } else if (!path) {
      acc.push({ ...item, type: 'file' }); // Add unmodified item if no path is provided
    }

    return acc;
  }, []);
}
