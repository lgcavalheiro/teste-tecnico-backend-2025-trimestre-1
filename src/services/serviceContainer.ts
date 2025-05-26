import { join } from 'path';
import { RedisCacheService } from './RedisCacheService';
import { LocalFileStorageService } from './LocalFileStorageService';
import { CachingFileStorageService } from './CachingFileStorageService';
import { IFileStorageService } from '../interfaces/IFileStorageService';

export class ServiceContainer {
  private static instance: ServiceContainer;
  private fileStorageService!: IFileStorageService;
  private redisCacheService!: RedisCacheService;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  public async initialize(cb?: () => void): Promise<void> {
    if (this.isInitialized) return;

    const uploadDir = join(process.cwd(), 'uploads');
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = process.env.REDIS_PORT || '6379';
    const redisUrl = `redis://${redisHost}:${redisPort}`;

    this.redisCacheService = new RedisCacheService(redisUrl);
    const localFileStorage = new LocalFileStorageService(uploadDir);
    
    try {
      await this.redisCacheService.connect();
      console.log('Connected to Redis');
    } catch (err) {
      console.error('Failed to connect to Redis:', err);
      throw err;
    }

    this.fileStorageService = new CachingFileStorageService(
      localFileStorage,
      this.redisCacheService
    );

    this.isInitialized = true;

    if (cb) cb();
  }

  public getFileStorageService(): IFileStorageService {
    if (!this.isInitialized) {
      throw new Error('ServiceContainer has not been initialized. Call initialize() first.');
    }
    return this.fileStorageService;
  }

  public getRedisCacheService(): RedisCacheService {
    if (!this.isInitialized) {
      throw new Error('ServiceContainer has not been initialized. Call initialize() first.');
    }
    return this.redisCacheService;
  }
}

export const serviceContainer = ServiceContainer.getInstance();
