import { Tree } from '@/interfaces/workspace.interface';
import { BlobReader, BlobWriter, ZipReader, ZipWriter } from '@zip.js/zip.js';
import { RcFile } from 'antd/es/upload';
import { FileSystem } from './fs';

class ZIP {
  private fs: FileSystem;
  constructor(fs: FileSystem) {
    this.fs = fs;
  }

  async importZip(
    file: RcFile | Blob,
    outputDir: string,
    writeFiles: boolean = true,
  ) {
    const reader = new ZipReader(new BlobReader(file));
    const entries = await reader.getEntries();
    const filesToSkip = [
      '._',
      '._.DS_Store',
      '.DS_Store',
      'node_modules',
      'build',
      '.zip',
    ];

    const files = [];

    for (const entry of entries) {
      const outputPath = `${outputDir}/${entry.filename}`;

      // Skip files or folders that match any pattern in filesToSkip
      if (filesToSkip.some((skip) => entry.filename.includes(skip))) {
        continue;
      }
      if (entry.directory) {
        if (writeFiles) {
          await this.fs.mkdir(outputDir);
        }
      } else if (entry.getData) {
        // Ensure getData is defined before calling it
        const writer = new BlobWriter();
        await entry.getData(writer);
        const fileBlob = await writer.getData();
        const arrayBuffer = await fileBlob.arrayBuffer();
        const fileContent = new Uint8Array(arrayBuffer);
        const utf8Decoder = new TextDecoder('utf-8');
        if (writeFiles) {
          await this.fs.writeFile(outputPath, fileContent);
        } else {
          files.push({
            path: outputPath,
            content: utf8Decoder.decode(fileContent),
          });
        }
      }
    }

    await reader.close();
    return files as Tree[];
  }

  // zip files and directories and trigger download
  async bundleFilesAndDownload(
    pathsToZip: string[],
    zipFilename: string = 'archive.zip',
  ) {
    // Create a BlobWriter for the ZipWriter to write the zip file data to a Blob
    const blobWriter = new BlobWriter();
    const writer: ZipWriter<BlobWriter> = new ZipWriter<BlobWriter>(blobWriter);

    for (const path of pathsToZip) {
      const stat = await this.fs.stat(path);
      if (stat.isDirectory()) {
        await this.addDirectoryToZip(writer, path, path);
      } else {
        await this.addFileToZip(writer, path, path);
      }
    }

    await writer.close();
    // Get the Blob containing the zip file data
    const blob = await blobWriter.getData();
    // Trigger download
    this.downloadBlob(blob, zipFilename);
  }

  // Add files to the ZIP
  private async addFileToZip(
    writer: ZipWriter<BlobWriter>,
    filePath: string,
    rootPath: string,
  ) {
    const data = await this.fs.readFile(filePath);
    const blob = new Blob([data]); // Create a Blob from the file data
    const reader = new BlobReader(blob);
    await writer.add(filePath.replace(rootPath + '/', ''), reader); // Add the file to the zip
  }

  // Add directories to the ZIP
  private async addDirectoryToZip(
    writer: ZipWriter<BlobWriter>,
    dirPath: string,
    rootPath: string,
  ) {
    const files = await this.fs.readdir(dirPath);
    for (const file of files) {
      const fullPath = `${dirPath}/${file}`;
      const stat = await this.fs.stat(fullPath);
      if (stat.isDirectory()) {
        await this.addDirectoryToZip(writer, fullPath, rootPath);
      } else {
        await this.addFileToZip(writer, fullPath, rootPath);
      }
    }
  }

  // Helper method to trigger the download
  private downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export default ZIP;
