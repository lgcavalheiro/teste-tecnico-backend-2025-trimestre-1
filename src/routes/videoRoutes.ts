import { Router } from 'express';
import { uploadVideo } from '../controllers/videoController';
import { handleVideoUpload } from '../middleware/upload';

const router = Router();

/**
 * @route   POST /upload/video
 * @desc    Upload a video file
 * @access  Public
 * @param   {file} video - The video file to upload (max 10MB)
 * @returns {204} Success - No content
 * @returns {400} Bad Request - If file is not a video or exceeds size limit
 */
router.post('/upload/video', handleVideoUpload, uploadVideo);

export default router;
