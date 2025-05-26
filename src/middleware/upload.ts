import { Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { MulterError } from 'multer';

declare global {
  namespace Express {
    interface Request {
      file?: Express.Multer.File;
    }
  }
}

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only video files are allowed'));
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter,
});

export const handleVideoUpload = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const uploadSingle = upload.single('video');

  uploadSingle(req, res, (err: unknown) => {
    if (err) {
      if (err instanceof MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({ error: 'File size exceeds 10MB limit' });
          return;
        }
        res.status(400).json({ error: err.message });
        return;
      } else if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
    }

    if (!req.file) {
      res.status(400).json({ error: 'No video file provided' });
      return;
    }

    next();
  });
};
