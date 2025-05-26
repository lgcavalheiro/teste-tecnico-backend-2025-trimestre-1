import { VideoController } from '@/controllers/VideoController';
import { IFileStorageService } from '@/interfaces/IFileStorageService';
import { Request, Response, NextFunction } from 'express';
import { Readable, Writable } from 'stream';
import { EventEmitter } from 'events';

const createMockResponse = (): jest.Mocked<Response> => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  
  Object.setPrototypeOf(res, EventEmitter.prototype);
  EventEmitter.call(res);
  
  res.pipe = jest.fn().mockImplementation(function(this: any) {
    return this;
  });
  
  res.on = jest.fn().mockImplementation(EventEmitter.prototype.on);
  res.once = jest.fn().mockImplementation(EventEmitter.prototype.once);
  res.emit = jest.fn().mockImplementation(EventEmitter.prototype.emit);
  
  return res as jest.Mocked<Response>;
};

describe('VideoController', () => {
  let controller: VideoController;
  let mockFileStorageService: jest.Mocked<IFileStorageService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;
  let mockFile: Express.Multer.File;

  beforeEach(() => {
    mockFileStorageService = {
      saveFile: jest.fn().mockResolvedValue(undefined),
      fileExists: jest.fn().mockResolvedValue(true),
      getFileSize: jest.fn().mockResolvedValue(1024 * 1024),
      createReadStream: jest.fn(),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    };

    mockFile = {
      fieldname: 'video',
      originalname: 'test.mp4',
      encoding: '7bit',
      mimetype: 'application/mp4',
      size: 1024 * 1024,
      buffer: Buffer.from('test video content'),
      stream: new Readable(),
      destination: '',
      filename: 'test.mp4',
      path: '/path/to/test.mp4'
    } as Express.Multer.File;

    mockRequest = {
      file: mockFile,
      params: { filename: 'test.mp4' },
      headers: { range: '' },
    };

    mockResponse = createMockResponse();

    mockNext = jest.fn();

    controller = new VideoController(mockFileStorageService);
  });

  describe('uploadVideo', () => {
    it('should return 400 if no file is provided', async () => {
      mockRequest.file = undefined;
      
      await controller.uploadVideo(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'No video file provided' });
    });

    it('should save the file with a unique name', async () => {
      const originalSaveFile = mockFileStorageService.saveFile;
      mockFileStorageService.saveFile = jest.fn().mockImplementation((filename: string) => {
        expect(filename).toMatch(/^\d+-\d+_video_test\.mp4$/);
        return originalSaveFile(filename, mockFile.buffer);
      });
      
      await controller.uploadVideo(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockFileStorageService.saveFile).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it('should handle errors during file save', async () => {
      const error = new Error('Save failed');
      mockFileStorageService.saveFile.mockRejectedValueOnce(error);
      
      await controller.uploadVideo(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('streamVideo', () => {
    let mockReadStream: Readable;
    
    beforeEach(() => {
      mockReadStream = new Readable();
      mockReadStream._read = () => {};
      mockFileStorageService.createReadStream.mockReturnValue(mockReadStream);
      
      mockReadStream.pipe = jest.fn().mockImplementation(function(this: Readable, destination: Writable) {
        destination.emit('pipe', mockReadStream);
        return destination;
      });
    });
    
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should return 404 if video does not exist', async () => {
      mockFileStorageService.fileExists.mockResolvedValueOnce(false);
      
      await controller.streamVideo(
        mockRequest as Request,
        mockResponse as unknown as Response,
        mockNext
      );
      
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Video not found' });
    });

    it('should stream the full video if no range header', async () => {
      await controller.streamVideo(
        mockRequest as Request,
        mockResponse as unknown as Response,
        mockNext
      );
      
      expect(mockFileStorageService.createReadStream).toHaveBeenCalledWith('test.mp4');
      expect(mockResponse.set).toHaveBeenCalledWith({
        'Content-Length': 1024 * 1024,
        'Content-Type': 'application/mp4',
        'Accept-Ranges': 'bytes'
      });
    });

    it('should handle range requests', async () => {
      const range = 'bytes=0-499';
      const requestWithRange = {
        ...mockRequest,
        headers: { ...mockRequest.headers, range }
      } as Request;
      
      await controller.streamVideo(
        requestWithRange,
        mockResponse as unknown as Response,
        mockNext
      );
      
      expect(mockResponse.status).toHaveBeenCalledWith(206);
      expect(mockResponse.set).toHaveBeenCalledWith({
        'Content-Range': 'bytes 0-499/1048576',
        'Accept-Ranges': 'bytes',
        'Content-Length': 500,
        'Content-Type': 'application/mp4'
      });
      expect(mockFileStorageService.createReadStream).toHaveBeenCalledWith('test.mp4', 0, 499);
    });

    it('should handle invalid range headers', async () => {
      const requestWithInvalidRange = {
        ...mockRequest,
        headers: { ...mockRequest.headers, range: 'invalid-range' }
      } as Request;
      
      await controller.streamVideo(
        requestWithInvalidRange,
        mockResponse as unknown as Response,
        mockNext
      );
      
      expect(mockResponse.status).not.toHaveBeenCalledWith(206);
      expect(mockResponse.set).toHaveBeenCalledWith({
        'Content-Length': 1024 * 1024,
        'Content-Type': 'application/mp4',
        'Accept-Ranges': 'bytes'
      });
    });
  });
});
