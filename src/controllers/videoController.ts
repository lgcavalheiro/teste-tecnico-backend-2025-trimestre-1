import { Request, Response, NextFunction } from 'express';
import mime from 'mime-types';
import { parseRange } from '../utils/rangeParser';
import { IFileStorageService } from '../interfaces/IFileStorageService';

export class VideoController {
  constructor(private readonly fileStorageService: IFileStorageService) {}

  uploadVideo = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No video file provided' });
        return;
      }

      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const filename = `${uniqueSuffix}_video_${req.file.originalname}`;

      await this.fileStorageService.saveFile(filename, req.file.buffer);

      res.status(204).send();
    } catch (error) {
      console.error('Error uploading video:', error);
      next(error);
    }
  };

  streamVideo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { filename } = req.params;
      
      const fileExists = await this.fileStorageService.fileExists(filename);
      if (!fileExists) {
        res.status(404).json({ error: 'Video not found' });
        return;
      }

      const fileSize = await this.fileStorageService.getFileSize(filename);
      const range = req.headers.range;
      
      const contentType = mime.lookup(filename) || 'application/octet-stream';
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

        const fileStream = this.fileStorageService.createReadStream(filename, start, end);
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

        const fileStream = this.fileStorageService.createReadStream(filename);
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
}
