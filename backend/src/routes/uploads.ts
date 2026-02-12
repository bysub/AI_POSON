import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import { logger } from "../utils/logger.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = Router();

// 업로드 디렉토리 설정
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer 스토리지 설정
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    // 고유한 파일명 생성
    const uniqueSuffix = crypto.randomBytes(8).toString("hex");
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uniqueSuffix}${ext}`);
  },
});

// 파일 필터 (이미지만 허용)
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("지원하지 않는 파일 형식입니다. (jpg, png, gif, webp만 가능)"));
  }
};

// Multer 인스턴스
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB 제한
  },
});

/**
 * Multer 에러 핸들러
 */
function handleMulterError(err: Error, _req: Request, res: Response, next: NextFunction): void {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({
        success: false,
        error: {
          code: "FILE_TOO_LARGE",
          message: "파일 크기는 5MB를 초과할 수 없습니다",
        },
      });
      return;
    }
    res.status(400).json({
      success: false,
      error: {
        code: "UPLOAD_ERROR",
        message: err.message,
      },
    });
    return;
  }
  if (err) {
    res.status(400).json({
      success: false,
      error: {
        code: "UPLOAD_ERROR",
        message: err.message,
      },
    });
    return;
  }
  next();
}

/**
 * POST /api/v1/uploads/image
 * 이미지 업로드 (관리자만)
 */
router.post(
  "/image",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  upload.single("image"),
  handleMulterError,
  (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: {
            code: "NO_FILE",
            message: "파일이 업로드되지 않았습니다",
          },
        });
        return;
      }

      const fileUrl = `/uploads/${req.file.filename}`;

      logger.info({ filename: req.file.filename, size: req.file.size }, "File uploaded");

      res.json({
        success: true,
        data: {
          url: fileUrl,
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
        },
      });
    } catch (error) {
      logger.error({ error }, "Upload failed");
      res.status(500).json({
        success: false,
        error: {
          code: "UPLOAD_FAILED",
          message: "파일 업로드에 실패했습니다",
        },
      });
    }
  },
);

/**
 * DELETE /api/v1/uploads/:filename
 * 업로드된 파일 삭제
 */
router.delete(
  "/:filename",
  authenticate,
  authorize("SUPER_ADMIN", "ADMIN", "MANAGER"),
  (req: Request, res: Response) => {
    try {
      const { filename } = req.params;
      const filePath = path.join(uploadDir, filename);

      // 경로 조작 방지
      const resolvedPath = path.resolve(filePath);
      if (!resolvedPath.startsWith(uploadDir)) {
        res.status(400).json({
          success: false,
          error: {
            code: "INVALID_PATH",
            message: "잘못된 파일 경로입니다",
          },
        });
        return;
      }

      if (!fs.existsSync(filePath)) {
        res.status(404).json({
          success: false,
          error: {
            code: "FILE_NOT_FOUND",
            message: "파일을 찾을 수 없습니다",
          },
        });
        return;
      }

      fs.unlinkSync(filePath);

      logger.info({ filename }, "File deleted");

      res.json({
        success: true,
        data: { deleted: filename },
      });
    } catch (error) {
      logger.error({ error }, "Delete failed");
      res.status(500).json({
        success: false,
        error: {
          code: "DELETE_FAILED",
          message: "파일 삭제에 실패했습니다",
        },
      });
    }
  },
);

export { router as uploadsRouter };
