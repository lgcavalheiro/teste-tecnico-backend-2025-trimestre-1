import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { IFileStorageService } from '../interfaces/IFileStorageService';

export class LocalFileStorageService implements IFileStorageService {
  constructor(private readonly basePath: string) {
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  async saveFile(filename: string, content: Buffer): Promise<void> {
    const filePath = this.getFullPath(filename);
    await fs.promises.writeFile(filePath, content);
  }

  async fileExists(filename: string): Promise<boolean> {
    try {
      await fs.promises.access(this.getFullPath(filename), fs.constants.F_OK);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getFileSize(filename: string): Promise<number> {
    const stats = await fs.promises.stat(this.getFullPath(filename));
    return stats.size;
  }

  createReadStream(filename: string, start?: number, end?: number): Readable {
    const filePath = this.getFullPath(filename);
    return fs.createReadStream(filePath, { start, end });
  }

  async deleteFile(filename: string): Promise<void> {
    const filePath = this.getFullPath(filename);
    await fs.promises.unlink(filePath);
  }

  private getFullPath(filename: string): string {
    const fullPath = path.resolve(this.basePath, filename);
    const relativePath = path.relative(this.basePath, fullPath);
    
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      throw new Error('Invalid file path');
    }
    
    return fullPath;
  }
}
