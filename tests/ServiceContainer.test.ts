import { ServiceContainer } from '@/services/ServiceContainer';
import { RedisCacheService } from '@/services/RedisCacheService';
import { LocalFileStorageService } from '@/services/LocalFileStorageService';
import { CachingFileStorageService } from '@/services/CachingFileStorageService';

jest.mock('@/services/RedisCacheService');
const MockedRedisCacheService = RedisCacheService as jest.MockedClass<typeof RedisCacheService>;

jest.mock('@/services/LocalFileStorageService');
const MockedLocalFileStorageService = LocalFileStorageService as jest.MockedClass<typeof LocalFileStorageService>;

jest.mock('@/services/CachingFileStorageService');
const MockedCachingFileStorageService = CachingFileStorageService as jest.MockedClass<typeof CachingFileStorageService>;

describe('ServiceContainer', () => {
  let mockRedisCacheService: jest.Mocked<RedisCacheService>;
  let mockLocalFileStorage: jest.Mocked<LocalFileStorageService>;
  let mockCachingFileStorage: jest.Mocked<CachingFileStorageService>;
  
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRedisCacheService = {
      connect: jest.fn().mockResolvedValue(undefined),
      get: jest.fn(),
      set: jest.fn(),
    } as unknown as jest.Mocked<RedisCacheService>;
    
    mockLocalFileStorage = {
      saveFile: jest.fn(),
      getFile: jest.fn(),
      fileExists: jest.fn(),
      getFileSize: jest.fn(),
    } as unknown as jest.Mocked<LocalFileStorageService>;
    
    mockCachingFileStorage = {
      saveFile: jest.fn(),
      getFile: jest.fn(),
      fileExists: jest.fn(),
      getFileSize: jest.fn(),
    } as unknown as jest.Mocked<CachingFileStorageService>;

    MockedRedisCacheService.mockImplementation(() => mockRedisCacheService);
    MockedLocalFileStorageService.mockImplementation(() => mockLocalFileStorage);
    MockedCachingFileStorageService.mockImplementation(() => mockCachingFileStorage);
    
    jest.spyOn(process, 'cwd').mockReturnValue('/test/dir');
    
    process.env = { ...originalEnv };
    
    (ServiceContainer as any).instance = undefined;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getInstance', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = ServiceContainer.getInstance();
      const instance2 = ServiceContainer.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should initialize services with default values', async () => {
      const serviceContainer = ServiceContainer.getInstance();
      
      await serviceContainer.initialize();
      
      expect(MockedRedisCacheService).toHaveBeenCalledWith('redis://localhost:6379');
      expect(MockedLocalFileStorageService).toHaveBeenCalledWith('/test/dir/uploads');
      expect(MockedCachingFileStorageService).toHaveBeenCalledWith(
        mockLocalFileStorage,
        mockRedisCacheService
      );
      expect(mockRedisCacheService.connect).toHaveBeenCalled();
      expect((serviceContainer as any).isInitialized).toBe(true);
    });

    it('should use environment variables for Redis configuration', async () => {
      process.env.REDIS_HOST = 'custom-redis';
      process.env.REDIS_PORT = '6380';
      const serviceContainer = ServiceContainer.getInstance();
      
      await serviceContainer.initialize();
      
      expect(MockedRedisCacheService).toHaveBeenCalledWith('redis://custom-redis:6380');
    });

    it('should call the callback after successful initialization', async () => {
      const callback = jest.fn();
      const serviceContainer = ServiceContainer.getInstance();
      
      await serviceContainer.initialize(callback);
      
      expect(callback).toHaveBeenCalled();
    });

    it('should not reinitialize if already initialized', async () => {
      const serviceContainer = ServiceContainer.getInstance();
      await serviceContainer.initialize();
      
      jest.clearAllMocks();
      
      await serviceContainer.initialize();
      
      expect(mockRedisCacheService.connect).not.toHaveBeenCalled();
    });

    it('should throw an error if Redis connection fails', async () => {
      const error = new Error('Connection failed');
      mockRedisCacheService.connect.mockRejectedValue(error);
      const serviceContainer = ServiceContainer.getInstance();
      
      await expect(serviceContainer.initialize())
        .rejects
        .toThrow('Connection failed');
      
      expect((serviceContainer as any).isInitialized).toBe(false);
    });
  });

  describe('getFileStorageService', () => {
    it('should return the file storage service after initialization', async () => {
      const serviceContainer = ServiceContainer.getInstance();
      await serviceContainer.initialize();
      
      const result = serviceContainer.getFileStorageService();
      
      expect(result).toBe(mockCachingFileStorage);
    });

    it('should throw an error if called before initialization', () => {
      const serviceContainer = ServiceContainer.getInstance();
      
      expect(() => serviceContainer.getFileStorageService())
        .toThrow('ServiceContainer has not been initialized. Call initialize() first.');
    });
  });

  describe('getRedisCacheService', () => {
    it('should return the Redis cache service after initialization', async () => {
      const serviceContainer = ServiceContainer.getInstance();
      await serviceContainer.initialize();
      
      const result = serviceContainer.getRedisCacheService();
      
      expect(result).toBe(mockRedisCacheService);
    });

    it('should throw an error if called before initialization', () => {
      const serviceContainer = ServiceContainer.getInstance();
      
      expect(() => serviceContainer.getRedisCacheService())
        .toThrow('ServiceContainer has not been initialized. Call initialize() first.');
    });
  });
});
