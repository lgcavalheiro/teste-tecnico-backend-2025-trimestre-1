import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

export const uploadVideo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No video file provided' });
      return;
    }

    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `${uniqueSuffix}_video_${req.file.originalname}`;
    const filepath = path.join(uploadDir, filename);

    await fs.promises.writeFile(filepath, req.file.buffer);

    res.status(204).send();
  } catch (error) {
    console.error('Error uploading video:', error);
    next(error);
  }
};
