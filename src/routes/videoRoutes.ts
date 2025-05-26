import { Router } from 'express';
import { VideoController } from '../controllers/videoController';
import { handleVideoUpload } from '../middleware/upload';
import { LocalFileStorageService } from '../services/LocalFileStorageService';
import { RedisCacheService } from '../services/RedisCacheService';
import { CachingFileStorageService } from '../services/CachingFileStorageService';
import path from 'path';

const router = Router();

const uploadDir = path.join(process.cwd(), 'uploads');

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = process.env.REDIS_PORT || '6379';
const redisUrl = `redis://${redisHost}:${redisPort}`;

const redisCacheService = new RedisCacheService(redisUrl);

const localFileStorage = new LocalFileStorageService(uploadDir);
const fileStorageService = new CachingFileStorageService(
  localFileStorage,
  redisCacheService
);

const videoController = new VideoController(fileStorageService);

redisCacheService.connect()
  .then(() => console.log('Connected to Redis'))
  .catch(err => console.error('Failed to connect to Redis:', err));

/**
 * @route   POST /upload/video
 * @desc    Upload a video file
 * @access  Public
 * @param   {file} video - The video file to upload (max 10MB)
 * @returns {204} Success - No content
 * @returns {400} Bad Request - If file is not a video or exceeds size limit
 */
router.post('/upload/video', handleVideoUpload, videoController.uploadVideo);

/**
 * @route   GET /static/video/:filename
 * @desc    Stream a video file with support for range requests
 * @access  Public
 * @param   {string} filename - The name of the video file to stream
 * @returns {200} Success - Streams the video file
 * @returns {206} Partial Content - Streams part of the video file for range requests
 * @returns {404} Not Found - If the video file doesn't exist
 */
router.get('/static/video/:filename', videoController.streamVideo);

export default router;
