import { Router } from 'express';
import { uploadVideo, streamVideo } from '../controllers/videoController';
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

/**
 * @route   GET /static/video/:filename
 * @desc    Stream a video file with support for range requests
 * @access  Public
 * @param   {string} filename - The name of the video file to stream
 * @returns {200} Success - Full video content if no range specified
 * @returns {206} Partial Content - Partial video content if range specified
 * @returns {404} Not Found - If video file doesn't exist
 * @header  {string} Range - Optional. Format: "bytes=start-end"
 */
router.get('/static/video/:filename', streamVideo);

export default router;
