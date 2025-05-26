import { Router } from 'express';
import { VideoController } from '../controllers/VideoController';
import { handleVideoUpload } from '../middleware/upload';
import { serviceContainer } from '../services/ServiceContainer';

const router = Router();

const serviceInitializerCallback = () => {
  const videoController = new VideoController(serviceContainer.getFileStorageService());

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

  console.log('Services initialized successfully');
}

serviceContainer.initialize(serviceInitializerCallback)
  .catch(err => {
    console.error('Failed to initialize services:', err);
    process.exit(1);
  });

export default router;
