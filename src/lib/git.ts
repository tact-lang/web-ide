import { PromisifiedFS } from '@isomorphic-git/lightning-fs';
import git from 'isomorphic-git';
import fileSystem from './fs';

class GitManager {
  private fs: PromisifiedFS;

  constructor() {
    this.fs = fileSystem.fsInstance;
  }

  async init(dest: string) {
    await git.init({ fs: this.fs, dir: dest, defaultBranch: 'main' });
  }

  async isInitialized(dest: string) {
    // It only checks if .git/HEAD file exists. It doesn't check if the repo has any commits
    try {
      await this.fs.readFile(`${dest}/.git/HEAD`, 'utf8');
      return true;
    } catch (error) {
      return false;
    }
  }

  async addFiles(files: { path: string }[], dest: string) {
    for (const file of files) {
      // TODO: check if git.writeBlob is necessary
      await git.add({
        fs: this.fs,
        dir: dest,
        filepath: file.path,
      });
    }
  }

  async unstageFile(files: { path: string }[], dest: string) {
    for (const file of files) {
      await git.remove({
        fs: this.fs,
        dir: dest,
        filepath: file.path,
      });
    }
  }

  async commit(
    message: string,
    dest: string,
    author: { name: string; email: string },
  ) {
    const sha = await git.commit({
      fs: this.fs,
      dir: dest,
      message,
      author,
    });
    console.log('commit sha', sha);
  }

  async log(dest: string, depth = 10) {
    return git.log({ fs: this.fs, dir: dest, depth });
  }

  async getOldCommit(dest: string, stepBack = 1) {
    const commits = await this.log(dest, stepBack);
    if (commits.length > stepBack) {
      return commits[stepBack].oid;
    }
    throw new Error('Not enough commits in the history.');
  }

  async status(dest: string, filepath: string) {
    const status = await git.status({ fs: this.fs, dir: dest, filepath });
    console.log('status', status);
  }

  async addRemote(repoURL: string, dest: string) {
    await git.addRemote({
      fs: this.fs,
      dir: dest,
      remote: 'origin',
      url: repoURL,
    });
  }

  async removeRemote(dest: string) {
    await git.deleteRemote({ fs: this.fs, dir: dest, remote: 'origin' });
  }

  async getRemote(dest: string) {
    return git.listRemotes({ fs: this.fs, dir: dest });
  }

  async setConfig({
    path,
    value,
    dest,
  }: {
    path: string; // e.g. 'user.name'
    value: string;
    dest: string;
  }): Promise<void> {
    await git.setConfig({
      fs: this.fs,
      dir: dest,
      path,
      value,
    });
  }

  async getConfig({
    path,
    dest,
  }: {
    path: string; // e.g. 'user.name'
    dest: string;
  }) {
    return git.getConfig({
      fs: this.fs,
      dir: dest,
      path,
    });
  }

  async getFileCollection(
    dest: string,
  ): Promise<{ path: string; status: string; staged: boolean }[]> {
    try {
      const statusMatrix = await git.statusMatrix({ fs: this.fs, dir: dest });

      // Map over the status matrix to get the status for each file
      const filesWithStatus = statusMatrix.map(
        ([filePath, headStatus, workDirStatus, stageStatus]) => {
          const workDir = workDirStatus;
          const stage = stageStatus;
          const head = headStatus;

          type StatusKey =
            | '0,2,0'
            | '1,2,0'
            | '1,2,1'
            | '1,2,2'
            | '0,0,2'
            | '0,2,2'
            | '1,0,0'
            | '1,0,2'
            | '1,1,0'
            | '1,1,3'
            | '1,2,3';

          const statusMap: Record<
            StatusKey,
            { status: string; isStaged: boolean }
          > = {
            '0,2,0': { status: 'U', isStaged: false }, // Untracked file
            '1,2,0': { status: 'M', isStaged: false }, // Modified but not staged
            '1,2,1': { status: 'M', isStaged: false }, // Modified in working directory but not staged
            '1,2,2': { status: 'M', isStaged: true }, // Modified and staged
            '0,0,2': { status: 'A', isStaged: true }, // Added (new file staged but not yet committed)
            '0,2,2': { status: 'A', isStaged: true }, // New file, modified, and staged
            '1,0,0': { status: 'D', isStaged: false }, // Deleted (file deleted but not staged)
            '1,0,2': { status: 'D', isStaged: true }, // Deleted and staged
            '1,1,0': { status: '', isStaged: false }, // Unchanged file, no action needed
            '1,1,3': { status: 'C', isStaged: false }, // Conflict, requires resolution
            '1,2,3': { status: 'C', isStaged: false }, // Modified file with conflicts, requires resolution
          };

          const key = `${head},${workDir},${stage}` as StatusKey;
          const { status, isStaged } = statusMap[key];

          return { path: filePath, status, staged: isStaged };
        },
      );

      return filesWithStatus;
    } catch (error) {
      console.error('Error getting files to commit:', error);
      throw error;
    }
  }

  async readBlob(oid: string, dest: string, filePath: string) {
    return git.readBlob({
      fs: this.fs,
      dir: dest,
      oid: oid,
      filepath: filePath,
    });
  }

  // async clone(repo, dest) {
  // }

  // async pull(repo, dest) {
  // }
}

export default GitManager;
