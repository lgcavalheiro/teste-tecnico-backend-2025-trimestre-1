import { LocalFileStorageService } from '@/services/LocalFileStorageService';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    writeFile: jest.fn(),
    access: jest.fn(),
    stat: jest.fn(),
    unlink: jest.fn(),
  },
  mkdirSync: jest.fn(),
  existsSync: jest.fn(),
  createReadStream: jest.fn(),
  constants: {
    F_OK: 0
  }
}));

describe('LocalFileStorageService', () => {
  let service: LocalFileStorageService;
  const basePath = '/test/storage';
  const testFilename = 'test.mp4';
  const testContent = Buffer.from('test content');
  const testFilePath = path.join(basePath, testFilename);

  const mockMkdirSync = fs.mkdirSync as jest.Mock;
  const mockWriteFile = fs.promises.writeFile as jest.Mock;
  const mockAccess = fs.promises.access as jest.Mock;
  const mockStat = fs.promises.stat as jest.Mock;
  const mockCreateReadStream = fs.createReadStream as jest.Mock;
  const mockUnlink = fs.promises.unlink as jest.Mock;
  const mockExistsSync = fs.existsSync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockWriteFile.mockResolvedValue(undefined);
    mockAccess.mockResolvedValue(undefined);
    mockStat.mockResolvedValue({ size: 12345 });
    mockCreateReadStream.mockImplementation(() => new Readable());
    mockUnlink.mockResolvedValue(undefined);
    
    service = new LocalFileStorageService(basePath);
  });

  describe('constructor', () => {
    it('should create directory if it does not exist', () => {
      mockExistsSync.mockReturnValue(false);
      
      new LocalFileStorageService(basePath);
      
      expect(mockMkdirSync).toHaveBeenCalledWith(basePath, { recursive: true });
    });

    it('should not create directory if it already exists', () => {
      mockExistsSync.mockReturnValue(true);
      
      const originalMkdirSync = mockMkdirSync.mock.calls.length;
      
      new LocalFileStorageService(basePath);
      
      expect(mockMkdirSync).toHaveBeenCalledTimes(originalMkdirSync);
    });
  });

  describe('saveFile', () => {
    it('should save file with correct path and content', async () => {
      await service.saveFile(testFilename, testContent);
      
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        testFilePath,
        testContent
      );
    });

    it('should throw error for invalid file path', async () => {
      const invalidPath = '../invalid.mp4';
      
      await expect(service.saveFile(invalidPath, testContent))
        .rejects
        .toThrow('Invalid file path');
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      mockAccess.mockResolvedValue(undefined);
      
      const exists = await service.fileExists(testFilename);
      
      expect(exists).toBe(true);
      expect(fs.promises.access).toHaveBeenCalledWith(
        testFilePath,
        fs.constants.F_OK
      );
    });

    it('should return false when file does not exist', async () => {
      const error = new Error('File not found');
      (error as NodeJS.ErrnoException).code = 'ENOENT';
      mockAccess.mockRejectedValue(error);
      
      const exists = await service.fileExists('nonexistent.mp4');
      
      expect(exists).toBe(false);
    });
  });

  describe('getFileSize', () => {
    it('should return file size', async () => {
      const fileSize = 12345;
      mockStat.mockResolvedValue({ size: fileSize });
      
      const size = await service.getFileSize(testFilename);
      
      expect(size).toBe(fileSize);
      expect(fs.promises.stat).toHaveBeenCalledWith(testFilePath);
    });
  });

  describe('createReadStream', () => {
    it('should create read stream with correct path and options', () => {
      const start = 10;
      const end = 20;
      const mockStream = new Readable();
      mockCreateReadStream.mockReturnValue(mockStream);
      
      const stream = service.createReadStream(testFilename, start, end);
      
      expect(stream).toBe(mockStream);
      expect(fs.createReadStream).toHaveBeenCalledWith(testFilePath, { start, end });
    });

    it('should create read stream without options', () => {
      const mockStream = new Readable();
      mockCreateReadStream.mockReturnValue(mockStream);
      
      const stream = service.createReadStream(testFilename);
      
      expect(stream).toBe(mockStream);
      expect(fs.createReadStream).toHaveBeenCalledWith(testFilePath, {});
    });
  });

  describe('deleteFile', () => {
    it('should delete file', async () => {
      await service.deleteFile(testFilename);
      
      expect(fs.promises.unlink).toHaveBeenCalledWith(testFilePath);
    });

    it('should throw error for invalid file path', async () => {
      const invalidPath = '../invalid.mp4';
      
      await expect(service.deleteFile(invalidPath))
        .rejects
        .toThrow('Invalid file path');
    });
  });

  describe('getFullPath', () => {
    it('should return correct full path', () => {
      const fullPath = (service as any).getFullPath(testFilename);
      expect(fullPath).toBe(testFilePath);
    });

    it('should prevent directory traversal', () => {
      expect(() => (service as any).getFullPath('../malicious.mp4'))
        .toThrow('Invalid file path');
      
      expect(() => (service as any).getFullPath('/absolute/path.mp4'))
        .toThrow('Invalid file path');
    });
  });
});
