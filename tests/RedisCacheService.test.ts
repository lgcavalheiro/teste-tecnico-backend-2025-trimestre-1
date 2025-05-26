import { RedisCacheService } from '@/services/RedisCacheService';
import { createClient } from 'redis';

jest.mock('redis', () => ({
  createClient: jest.fn(),
}));

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

const mockClient = {
  isOpen: false,
  connect: jest.fn(),
  quit: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  setEx: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  on: jest.fn(),
};

describe('RedisCacheService', () => {
  let redisService: RedisCacheService;
  const redisUrl = 'redis://localhost:6379';

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockClient.isOpen = false;
    mockCreateClient.mockReturnValue(mockClient as any);
    
    redisService = new RedisCacheService(redisUrl);
  });

  describe('constructor', () => {
    it('should create a Redis client with the provided URL', () => {
      expect(mockCreateClient).toHaveBeenCalledWith({
        url: redisUrl,
      });
    });

    it('should set up error handler', () => {
      expect(mockClient.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('connect', () => {
    it('should connect if not already connected', async () => {
      mockClient.isOpen = false;
      
      await redisService.connect();
      
      expect(mockClient.connect).toHaveBeenCalled();
    });

    it('should not connect if already connected', async () => {
      mockClient.isOpen = true;
      
      await redisService.connect();
      
      expect(mockClient.connect).not.toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('should disconnect if connected', async () => {
      mockClient.isOpen = true;
      
      await redisService.disconnect();
      
      expect(mockClient.quit).toHaveBeenCalled();
    });

    it('should not disconnect if not connected', async () => {
      mockClient.isOpen = false;
      
      await redisService.disconnect();
      
      expect(mockClient.quit).not.toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('should return parsed value when key exists', async () => {
      const testKey = 'test-key';
      const testValue = { data: 'test' };
      mockClient.get.mockResolvedValue(JSON.stringify(testValue));
      
      const result = await redisService.get(testKey);
      
      expect(mockClient.get).toHaveBeenCalledWith(testKey);
      expect(result).toEqual(testValue);
    });

    it('should return null when key does not exist', async () => {
      mockClient.get.mockResolvedValue(null);
      
      const result = await redisService.get('nonexistent');
      
      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      const originalConsoleError = console.error;
      console.error = jest.fn();
      mockClient.get.mockRejectedValue(new Error('Redis error'));
      
      const result = await redisService.get('error-key');
      
      expect(console.error).toHaveBeenCalled();
      expect(result).toBeNull();
      console.error = originalConsoleError;
    });
  });

  describe('set', () => {
    it('should set value with TTL when ttlSeconds > 0', async () => {
      const testKey = 'test-key';
      const testValue = { data: 'test' };
      const ttl = 60;
      
      await redisService.set(testKey, testValue, ttl);
      
      expect(mockClient.setEx).toHaveBeenCalledWith(
        testKey,
        ttl,
        JSON.stringify(testValue)
      );
    });

    it('should set value without TTL when ttlSeconds is 0', async () => {
      const testKey = 'test-key';
      const testValue = { data: 'test' };
      
      await redisService.set(testKey, testValue, 0);
      
      expect(mockClient.set).toHaveBeenCalledWith(
        testKey,
        JSON.stringify(testValue)
      );
    });

    it('should throw error in non-production environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      const originalConsoleError = console.error;
      console.error = jest.fn();
      process.env.NODE_ENV = 'development';
      const error = new Error('Redis error');
      mockClient.setEx.mockRejectedValue(error);
      
      await expect(redisService.set('error-key', 'value')).rejects.toThrow(error);
      
      process.env.NODE_ENV = originalEnv;
      console.error = originalConsoleError;
    });
  });

  describe('del', () => {
    it('should delete key', async () => {
      const testKey = 'test-key';
      
      await redisService.del(testKey);
      
      expect(mockClient.del).toHaveBeenCalledWith(testKey);
    });

    it('should throw error in non-production environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      const originalConsoleError = console.error;
      console.error = jest.fn();
      process.env.NODE_ENV = 'development';
      const error = new Error('Redis error');
      mockClient.del.mockRejectedValue(error);
      
      await expect(redisService.del('error-key')).rejects.toThrow(error);
      
      process.env.NODE_ENV = originalEnv;
      console.error = originalConsoleError;
    });
  });

  describe('has', () => {
    it('should return true when key exists', async () => {
      mockClient.exists.mockResolvedValue(1);
      
      const result = await redisService.has('existing-key');
      
      expect(result).toBe(true);
      expect(mockClient.exists).toHaveBeenCalledWith('existing-key');
    });

    it('should return false when key does not exist', async () => {
      mockClient.exists.mockResolvedValue(0);
      
      const result = await redisService.has('nonexistent-key');
      
      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      const originalConsoleError = console.error;
      console.error = jest.fn();
      mockClient.exists.mockRejectedValue(new Error('Redis error'));
      
      const result = await redisService.has('error-key');
      
      expect(console.error).toHaveBeenCalled();
      expect(result).toBe(false);
      console.error = originalConsoleError;
    });
  });

  describe('ensureConnected', () => {
    it('should connect if not connected', async () => {
      mockClient.isOpen = false;
      
      await (redisService as any).ensureConnected();
      
      expect(mockClient.connect).toHaveBeenCalled();
    });

    it('should not connect if already connected', async () => {
      mockClient.isOpen = true;
      
      await (redisService as any).ensureConnected();
      
      expect(mockClient.connect).not.toHaveBeenCalled();
    });
  });
});
