import { Readable } from 'stream';
import { IFileStorageService } from '../interfaces/IFileStorageService';
import { ICacheService } from '../interfaces/ICacheService';
import { PassThrough } from 'stream';

export class CachingFileStorageService implements IFileStorageService {
  private static DEFAULT_CACHE_TTL = 60; // 60 seconds
  private cachePrefix = 'file:';

  constructor(
    private readonly fileStorage: IFileStorageService,
    private readonly cacheService: ICacheService
  ) {}

  private getCacheKey(filename: string, range?: { start?: number; end?: number }): string {
    if (!range) {
      return `${this.cachePrefix}${filename}:full`;
    }
    return `${this.cachePrefix}${filename}:${range.start ?? 'start'}-${range.end ?? 'end'}`;
  }

  async saveFile(filename: string, content: Buffer): Promise<void> {
    const cacheKey = this.getCacheKey(filename);
    
    await this.cacheService.set(
      cacheKey, 
      content.toString('base64'), 
      CachingFileStorageService.DEFAULT_CACHE_TTL
    );
    
    this.fileStorage.saveFile(filename, content)
      .catch(error => {
        console.error('Background file save failed:', error);
      });
  }

  async fileExists(filename: string): Promise<boolean> {
    const cacheKey = this.getCacheKey(filename);
    
    const cached = await this.cacheService.has(cacheKey);
    if (cached) {
      return true;
    }
    
    return this.fileStorage.fileExists(filename);
  }

  async getFileSize(filename: string): Promise<number> {
    const cacheKey = this.getCacheKey(filename);
    
    const cachedData = await this.cacheService.get<string>(cacheKey);
    if (cachedData) {
      return Buffer.from(cachedData, 'base64').length;
    }
    
    return this.fileStorage.getFileSize(filename);
  }

  createReadStream(filename: string, start?: number, end?: number): Readable {
    const cacheKey = this.getCacheKey(filename, { start, end });
    
    const passThrough = new PassThrough();
    
    this.cacheService.get<string>(cacheKey)
      .then(cachedData => {
        if (cachedData) {
          const buffer = Buffer.from(cachedData, 'base64');
          passThrough.end(buffer);
        } else {
          const fileStream = this.fileStorage.createReadStream(filename, start, end);
          fileStream.pipe(passThrough);
          
          const chunks: Buffer[] = [];
          fileStream.on('data', (chunk: Buffer) => chunks.push(chunk));
          fileStream.on('end', () => {
            const fileContent = Buffer.concat(chunks);
            this.cacheService.set(
              cacheKey,
              fileContent.toString('base64'), 
              CachingFileStorageService.DEFAULT_CACHE_TTL
            ).catch(console.error);
          });
        }
      })
      .catch(error => {
        console.error('Cache read error, falling back to storage:', error);
        const fileStream = this.fileStorage.createReadStream(filename, start, end);
        fileStream.pipe(passThrough);
      });
    
    return passThrough;
  }

  async deleteFile(filename: string): Promise<void> {
    const cacheKey = this.getCacheKey(filename);
    
    await this.cacheService.del(cacheKey);
    
    await this.fileStorage.deleteFile(filename);
  }
}
