# Routes Patterns

## routes/index.js

```javascript
const express = require("express");
const router = express.Router();

// Common routes
const codeRoutes = require("./common/codeRoutes").default;
const menuRoutes = require("./common/menuRoutes").default;
const fileRoutes = require("./common/fileRoutes").default;

// System routes
const userRoutes = require("./sys/userRoutes").default;
const sysCodeRoutes = require("./sys/codeRoutes").default;
const sysMenuRoutes = require("./sys/menuRoutes").default;
const authRoutes = require("./sys/authRoutes").default;

// Common APIs
router.use("/common/code", codeRoutes);
router.use("/common/menu", menuRoutes);
router.use("/common/file", fileRoutes);

// System Management APIs
router.use("/sys/user", userRoutes);
router.use("/sys/code", sysCodeRoutes);
router.use("/sys/menu", sysMenuRoutes);
router.use("/sys/auth", authRoutes);

module.exports = { default: router };
```

## loginRoutes.ts

```typescript
import { Router, Request, Response } from "express";
import loginService from "../../service/common/loginService";
import logger from "../../utils/logger";

const router = Router();

/**
 * @swagger
 * /login:
 *   post:
 *     summary: User login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - password
 *             properties:
 *               userId:
 *                 type: string
 *               password:
 *                 type: string
 */
router.post("/login", async (req: Request, res: Response) => {
  const { userId, password } = req.body;

  if (!userId || !password) {
    return res.status(400).json({
      success: false,
      error: "VALIDATION_ERROR",
      message: "사용자 ID와 비밀번호를 입력해주세요.",
      correlationId: req.correlationId,
    });
  }

  const result = await loginService.login({ userId, password });

  if (!result.success) {
    logger.warn("Login failed", {
      userId,
      error: result.error,
      correlationId: req.correlationId,
    });
    return res.status(401).json({
      ...result,
      correlationId: req.correlationId,
    });
  }

  // Set session
  req.session.user = result.data!.user;

  logger.info("Login successful", {
    userId,
    correlationId: req.correlationId,
  });

  res.json({
    ...result,
    correlationId: req.correlationId,
  });
});

/**
 * @swagger
 * /logout:
 *   post:
 *     summary: User logout
 *     tags: [Auth]
 */
router.post("/logout", (req: Request, res: Response) => {
  const userId = req.session?.user?.userId;

  req.session.destroy((err) => {
    if (err) {
      logger.error("Logout error", {
        userId,
        error: err.message,
        correlationId: req.correlationId,
      });
      return res.status(500).json({
        success: false,
        error: "LOGOUT_ERROR",
        message: "로그아웃 처리 중 오류가 발생했습니다.",
        correlationId: req.correlationId,
      });
    }

    res.clearCookie("connect.sid");
    logger.info("Logout successful", {
      userId,
      correlationId: req.correlationId,
    });

    res.json({
      success: true,
      message: "로그아웃되었습니다.",
      correlationId: req.correlationId,
    });
  });
});

/**
 * @swagger
 * /session:
 *   get:
 *     summary: Get current session info
 *     tags: [Auth]
 */
router.get("/session", (req: Request, res: Response) => {
  if (!req.session?.user) {
    return res.status(401).json({
      success: false,
      error: "NOT_LOGGED_IN",
      message: "로그인되어 있지 않습니다.",
      correlationId: req.correlationId,
    });
  }

  res.json({
    success: true,
    data: {
      user: req.session.user,
    },
    correlationId: req.correlationId,
  });
});

export default router;
```

## userRoutes.ts

```typescript
import { Router, Request, Response } from "express";
import userService from "../../service/sys/userService";
import { validateDto } from "../../middleware/validators/dtoValidator";
import { CreateUserDto, UpdateUserDto } from "../../dto/sys/userDto";
import logger from "../../utils/logger";

const router = Router();

/**
 * @swagger
 * /sys/user/list:
 *   post:
 *     summary: Get user list with pagination
 *     tags: [System - User]
 */
router.post("/list", async (req: Request, res: Response) => {
  const result = await userService.getUserList(req.body);

  res.json({
    ...result,
    correlationId: req.correlationId,
  });
});

/**
 * @swagger
 * /sys/user/detail:
 *   post:
 *     summary: Get user detail
 *     tags: [System - User]
 */
router.post("/detail", async (req: Request, res: Response) => {
  const { idx } = req.body;

  if (!idx) {
    return res.status(400).json({
      success: false,
      error: "VALIDATION_ERROR",
      message: "idx는 필수입니다.",
      correlationId: req.correlationId,
    });
  }

  const result = await userService.getUserDetail(idx);

  if (!result.success) {
    return res.status(404).json({
      ...result,
      correlationId: req.correlationId,
    });
  }

  res.json({
    ...result,
    correlationId: req.correlationId,
  });
});

/**
 * @swagger
 * /sys/user/create:
 *   post:
 *     summary: Create new user
 *     tags: [System - User]
 */
router.post("/create", validateDto(CreateUserDto), async (req: Request, res: Response) => {
  const userId = req.session?.user?.userId || "system";
  const result = await userService.createUser(req.body, userId);

  if (!result.success) {
    const status = result.error === "DUPLICATE_USER_ID" ? 409 : 500;
    return res.status(status).json({
      ...result,
      correlationId: req.correlationId,
    });
  }

  logger.info("User created", {
    newUserId: req.body.userId,
    createdBy: userId,
    correlationId: req.correlationId,
  });

  res.status(201).json({
    ...result,
    correlationId: req.correlationId,
  });
});

/**
 * @swagger
 * /sys/user/update:
 *   post:
 *     summary: Update user
 *     tags: [System - User]
 */
router.post("/update", validateDto(UpdateUserDto), async (req: Request, res: Response) => {
  const userId = req.session?.user?.userId || "system";
  const result = await userService.updateUser(req.body, userId);

  if (!result.success) {
    const status = result.error === "USER_NOT_FOUND" ? 404 : 500;
    return res.status(status).json({
      ...result,
      correlationId: req.correlationId,
    });
  }

  logger.info("User updated", {
    idx: req.body.idx,
    updatedBy: userId,
    correlationId: req.correlationId,
  });

  res.json({
    ...result,
    correlationId: req.correlationId,
  });
});

/**
 * @swagger
 * /sys/user/delete:
 *   post:
 *     summary: Delete user (soft delete)
 *     tags: [System - User]
 */
router.post("/delete", async (req: Request, res: Response) => {
  const { idx } = req.body;
  const userId = req.session?.user?.userId || "system";

  if (!idx) {
    return res.status(400).json({
      success: false,
      error: "VALIDATION_ERROR",
      message: "idx는 필수입니다.",
      correlationId: req.correlationId,
    });
  }

  const result = await userService.deleteUser(idx, userId);

  if (!result.success) {
    const status = result.error === "USER_NOT_FOUND" ? 404 : 500;
    return res.status(status).json({
      ...result,
      correlationId: req.correlationId,
    });
  }

  logger.info("User deleted", {
    idx,
    deletedBy: userId,
    correlationId: req.correlationId,
  });

  res.json({
    ...result,
    correlationId: req.correlationId,
  });
});

/**
 * @swagger
 * /sys/user/resetPassword:
 *   post:
 *     summary: Reset user password
 *     tags: [System - User]
 */
router.post("/resetPassword", async (req: Request, res: Response) => {
  const { idx, newPassword } = req.body;
  const userId = req.session?.user?.userId || "system";

  if (!idx || !newPassword) {
    return res.status(400).json({
      success: false,
      error: "VALIDATION_ERROR",
      message: "idx와 newPassword는 필수입니다.",
      correlationId: req.correlationId,
    });
  }

  const result = await userService.resetPassword(idx, newPassword, userId);

  if (!result.success) {
    return res.status(404).json({
      ...result,
      correlationId: req.correlationId,
    });
  }

  logger.info("Password reset", {
    idx,
    resetBy: userId,
    correlationId: req.correlationId,
  });

  res.json({
    ...result,
    correlationId: req.correlationId,
  });
});

export default router;
```

## codeRoutes.ts

```typescript
import { Router, Request, Response } from "express";
import codeService from "../../service/sys/codeService";
import logger from "../../utils/logger";

const router = Router();

/**
 * @swagger
 * /sys/code/masterList:
 *   post:
 *     summary: Get code master list
 *     tags: [System - Code]
 */
router.post("/masterList", async (req: Request, res: Response) => {
  const result = await codeService.getMasterList(req.body);

  res.json({
    ...result,
    correlationId: req.correlationId,
  });
});

/**
 * @swagger
 * /sys/code/detailList:
 *   post:
 *     summary: Get code detail list by group code
 *     tags: [System - Code]
 */
router.post("/detailList", async (req: Request, res: Response) => {
  const { grpCd } = req.body;

  if (!grpCd) {
    return res.status(400).json({
      success: false,
      error: "VALIDATION_ERROR",
      message: "그룹코드는 필수입니다.",
      correlationId: req.correlationId,
    });
  }

  const result = await codeService.getDetailList(grpCd);

  res.json({
    ...result,
    correlationId: req.correlationId,
  });
});

/**
 * @swagger
 * /sys/code/saveMaster:
 *   post:
 *     summary: Save code master
 *     tags: [System - Code]
 */
router.post("/saveMaster", async (req: Request, res: Response) => {
  const userId = req.session?.user?.userId || "system";
  const result = await codeService.saveMaster(req.body, userId);

  if (!result.success) {
    return res.status(500).json({
      ...result,
      correlationId: req.correlationId,
    });
  }

  logger.info("Code master saved", {
    grpCd: req.body.grpCd,
    savedBy: userId,
    correlationId: req.correlationId,
  });

  res.json({
    ...result,
    correlationId: req.correlationId,
  });
});

/**
 * @swagger
 * /sys/code/saveDetail:
 *   post:
 *     summary: Save code detail
 *     tags: [System - Code]
 */
router.post("/saveDetail", async (req: Request, res: Response) => {
  const userId = req.session?.user?.userId || "system";
  const result = await codeService.saveDetail(req.body, userId);

  if (!result.success) {
    return res.status(500).json({
      ...result,
      correlationId: req.correlationId,
    });
  }

  logger.info("Code detail saved", {
    grpCd: req.body.grpCd,
    dtlCd: req.body.dtlCd,
    savedBy: userId,
    correlationId: req.correlationId,
  });

  res.json({
    ...result,
    correlationId: req.correlationId,
  });
});

export default router;
```

## fileRoutes.ts

```typescript
import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fileService from "../../service/common/fileService";
import config from "../../config";
import logger from "../../utils/logger";

const router = Router();

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.file.uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: config.file.maxSize, // 200MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("허용되지 않는 파일 형식입니다."));
    }
  },
});

/**
 * @swagger
 * /common/file/upload:
 *   post:
 *     summary: Upload files
 *     tags: [File]
 */
router.post("/upload", upload.array("files", 10), async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  const { atchIdx, menuCd, dataIdx } = req.body;
  const userId = req.session?.user?.userId || "system";

  if (!files || files.length === 0) {
    return res.status(400).json({
      success: false,
      error: "NO_FILES",
      message: "업로드할 파일이 없습니다.",
      correlationId: req.correlationId,
    });
  }

  const result = await fileService.saveFiles(
    files.map((f) => ({
      originalname: Buffer.from(f.originalname, "latin1").toString("utf8"),
      filename: f.filename,
      mimetype: f.mimetype,
      size: f.size,
      path: f.path,
    })),
    atchIdx || null,
    menuCd || "",
    dataIdx || "",
    userId,
  );

  if (!result.success) {
    return res.status(500).json({
      ...result,
      correlationId: req.correlationId,
    });
  }

  logger.info("Files uploaded", {
    atchIdx: result.data?.atchIdx,
    count: files.length,
    uploadedBy: userId,
    correlationId: req.correlationId,
  });

  res.json({
    ...result,
    correlationId: req.correlationId,
  });
});

/**
 * @swagger
 * /common/file/list:
 *   post:
 *     summary: Get file list by attachment index
 *     tags: [File]
 */
router.post("/list", async (req: Request, res: Response) => {
  const { atchIdx } = req.body;

  if (!atchIdx) {
    return res.status(400).json({
      success: false,
      error: "VALIDATION_ERROR",
      message: "atchIdx는 필수입니다.",
      correlationId: req.correlationId,
    });
  }

  const result = await fileService.getFileList(atchIdx);

  res.json({
    ...result,
    correlationId: req.correlationId,
  });
});

/**
 * @swagger
 * /common/file/download/{fileIdx}:
 *   get:
 *     summary: Download single file
 *     tags: [File]
 */
router.get("/download/:fileIdx", async (req: Request, res: Response) => {
  const { fileIdx } = req.params;

  const result = await fileService.downloadFile(fileIdx);

  if (!result.success) {
    return res.status(404).json({
      ...result,
      correlationId: req.correlationId,
    });
  }

  const { filePath, fileName } = result.data!;

  res.setHeader(
    "Content-Disposition",
    `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
  );
  res.download(filePath);
});

/**
 * @swagger
 * /common/file/downloadZip:
 *   post:
 *     summary: Download multiple files as zip
 *     tags: [File]
 */
router.post("/downloadZip", async (req: Request, res: Response) => {
  const { atchIdx } = req.body;

  if (!atchIdx) {
    return res.status(400).json({
      success: false,
      error: "VALIDATION_ERROR",
      message: "atchIdx는 필수입니다.",
      correlationId: req.correlationId,
    });
  }

  const result = await fileService.downloadFilesAsZip(atchIdx);

  if (!result.success) {
    return res.status(404).json({
      ...result,
      correlationId: req.correlationId,
    });
  }

  const { zipPath, zipName } = result.data!;

  res.setHeader("Content-Disposition", `attachment; filename="${zipName}"`);
  res.download(zipPath);
});

/**
 * @swagger
 * /common/file/delete:
 *   post:
 *     summary: Delete file
 *     tags: [File]
 */
router.post("/delete", async (req: Request, res: Response) => {
  const { fileIdx } = req.body;
  const userId = req.session?.user?.userId || "system";

  if (!fileIdx) {
    return res.status(400).json({
      success: false,
      error: "VALIDATION_ERROR",
      message: "fileIdx는 필수입니다.",
      correlationId: req.correlationId,
    });
  }

  const result = await fileService.deleteFile(fileIdx, userId);

  if (!result.success) {
    return res.status(404).json({
      ...result,
      correlationId: req.correlationId,
    });
  }

  logger.info("File deleted", {
    fileIdx,
    deletedBy: userId,
    correlationId: req.correlationId,
  });

  res.json({
    ...result,
    correlationId: req.correlationId,
  });
});

export default router;
```
