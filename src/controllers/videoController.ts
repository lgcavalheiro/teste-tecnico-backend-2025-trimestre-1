import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import { parseRange } from '../utils/rangeParser';

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

export const uploadVideo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No video file provided' });
      return;
    }

    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `${uniqueSuffix}_video_${req.file.originalname}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    await fs.promises.writeFile(filepath, req.file.buffer);

    res.status(204).send();
  } catch (error) {
    console.error('Error uploading video:', error);
    next(error);
  }
};

export const streamVideo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { filename } = req.params;
    const filepath = path.join(UPLOAD_DIR, filename);

    if (!fs.existsSync(filepath)) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }

    const stat = await fs.promises.stat(filepath);
    const fileSize = stat.size;
    const range = req.headers.range;
    
    const contentType = mime.lookup(filepath) || 'application/octet-stream';

    const rangeObj = range ? parseRange(range, fileSize) : null;

    if (rangeObj) {
      const { start, end, length } = rangeObj;
      
      res.status(206);
      res.set({
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': length,
        'Content-Type': contentType,
      });

      const fileStream = fs.createReadStream(filepath, { start, end });
      fileStream.pipe(res);
      
      fileStream.on('error', (error) => {
        console.error('Error streaming video:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error streaming video' });
        }
      });
    } else {
      res.set({
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes'
      });

      const fileStream = fs.createReadStream(filepath);
      fileStream.pipe(res);
      
      fileStream.on('error', (error) => {
        console.error('Error streaming video:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error streaming video' });
        }
      });
    }
  } catch (error) {
    console.error('Error in streamVideo:', error);
    next(error);
  }
};
