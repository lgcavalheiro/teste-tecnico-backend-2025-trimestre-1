import { CachingFileStorageService } from '@/services/CachingFileStorageService';
import { IFileStorageService } from '@/interfaces/IFileStorageService';
import { ICacheService } from '@/interfaces/ICacheService';
import { Readable, PassThrough } from 'stream';

const originalConsoleError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (args[0] === 'Cache read error, falling back to storage:') {
      return;
    }
    originalConsoleError(...args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
});

describe('CachingFileStorageService', () => {
  let service: CachingFileStorageService;
  let mockFileStorage: jest.Mocked<IFileStorageService>;
  let mockCacheService: jest.Mocked<ICacheService>;
  
  const testFilename = 'test.mp4';
  const testContent = Buffer.from('test content');
  const testBase64Content = testContent.toString('base64');
  const cacheKey = `file:${testFilename}:full`;

  beforeEach(() => {
    mockFileStorage = {
      saveFile: jest.fn().mockResolvedValue(undefined),
      fileExists: jest.fn().mockResolvedValue(true),
      getFileSize: jest.fn().mockResolvedValue(testContent.length),
      createReadStream: jest.fn(),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    };

    mockCacheService = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      has: jest.fn().mockResolvedValue(false),
    };

    service = new CachingFileStorageService(mockFileStorage, mockCacheService);
  });

  describe('saveFile', () => {
    it('should save file to cache and storage', async () => {
      await service.saveFile(testFilename, testContent);
      
      expect(mockCacheService.set).toHaveBeenCalledWith(
        cacheKey,
        testBase64Content,
        60
      );
      
      expect(mockFileStorage.saveFile).toHaveBeenCalledWith(testFilename, testContent);
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists in cache', async () => {
      mockCacheService.has.mockResolvedValueOnce(true);
      
      const exists = await service.fileExists(testFilename);
      
      expect(exists).toBe(true);
      expect(mockCacheService.has).toHaveBeenCalledWith(cacheKey);
      expect(mockFileStorage.fileExists).not.toHaveBeenCalled();
    });

    it('should check storage when not in cache', async () => {
      mockCacheService.has.mockResolvedValueOnce(false);
      mockFileStorage.fileExists.mockResolvedValueOnce(true);
      
      const exists = await service.fileExists(testFilename);
      
      expect(exists).toBe(true);
      expect(mockFileStorage.fileExists).toHaveBeenCalledWith(testFilename);
    });
  });

  describe('getFileSize', () => {
    it('should return size from cache when available', async () => {
      mockCacheService.get.mockResolvedValueOnce(testBase64Content);
      
      const size = await service.getFileSize(testFilename);
      
      expect(size).toBe(testContent.length);
      expect(mockFileStorage.getFileSize).not.toHaveBeenCalled();
    });

    it('should get size from storage when not in cache', async () => {
      mockCacheService.get.mockResolvedValueOnce(undefined);
      
      await service.getFileSize(testFilename);
      
      expect(mockFileStorage.getFileSize).toHaveBeenCalledWith(testFilename);
    });
  });

  describe('createReadStream', () => {
    it('should return cached content when available', (done) => {
      mockCacheService.get.mockResolvedValueOnce(testBase64Content);
      
      const stream = service.createReadStream(testFilename);
      
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => {
        const result = Buffer.concat(chunks);
        expect(result).toEqual(testContent);
        expect(mockFileStorage.createReadStream).not.toHaveBeenCalled();
        done();
      });
    });

    it('should stream from storage and cache when not in cache', (done) => {
      const mockReadStream = new PassThrough();
      mockFileStorage.createReadStream.mockReturnValue(mockReadStream);
      
      mockCacheService.get.mockImplementationOnce(() => Promise.resolve(undefined));
      
      const stream = service.createReadStream(testFilename, 10, 20);
      
      process.nextTick(() => {
        mockReadStream.emit('data', testContent);
        mockReadStream.emit('end');
      });
      
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => {
        try {
          const result = Buffer.concat(chunks);
          expect(result).toEqual(testContent);
          expect(mockFileStorage.createReadStream).toHaveBeenCalledWith(testFilename, 10, 20);
          done();
        } catch (err) {
          done(err);
        }
      });
    }, 10000);

    it('should handle cache read errors gracefully', (done) => {
      const error = new Error('Cache error');
      mockCacheService.get.mockRejectedValueOnce(error);
      
      const mockReadStream = new PassThrough();
      mockFileStorage.createReadStream.mockReturnValue(mockReadStream);
      
      const stream = service.createReadStream(testFilename);
      
      process.nextTick(() => {
        mockReadStream.emit('data', testContent);
        mockReadStream.emit('end');
      });
      
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => {
        try {
          const result = Buffer.concat(chunks);
          expect(result).toEqual(testContent);
          done();
        } catch (err) {
          done(err);
        }
      });
    }, 10000);
  });

  describe('deleteFile', () => {
    it('should delete file from both cache and storage', async () => {
      await service.deleteFile(testFilename);
      
      expect(mockCacheService.del).toHaveBeenCalledWith(cacheKey);
      expect(mockFileStorage.deleteFile).toHaveBeenCalledWith(testFilename);
    });
  });

  describe('getCacheKey', () => {
    it('should generate correct cache key for full file', () => {
      const key = (service as any).getCacheKey(testFilename);
      expect(key).toBe(`file:${testFilename}:full`);
    });

    it('should handle partial range specifications', () => {
      let key = (service as any).getCacheKey(testFilename, { start: 10 });
      expect(key).toBe(`file:${testFilename}:10-end`);
      
      key = (service as any).getCacheKey(testFilename, { end: 20 });
      expect(key).toBe(`file:${testFilename}:start-20`);
    });
  });
});
