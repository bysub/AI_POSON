# Service Layer Patterns

## Service Result Type

```typescript
// types/index.ts
export interface ServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

## loginService.ts (Session-based)

```typescript
import bcrypt from "bcrypt";
import userRepository from "../repository/sys/userRepository";
import menuRepository from "../repository/common/menuRepository";
import logger from "../utils/logger";
import { ServiceResult } from "../types";

interface LoginRequest {
  userId: string;
  password: string;
}

interface LoginResponse {
  user: {
    userId: string;
    userNm: string;
    email?: string;
    roleId?: string;
  };
  menus: unknown[];
}

class LoginService {
  async login(params: LoginRequest): Promise<ServiceResult<LoginResponse>> {
    const { userId, password } = params;

    try {
      // Find user
      const user = await userRepository.findByUserId(userId);

      if (!user) {
        return {
          success: false,
          error: "USER_NOT_FOUND",
          message: "사용자를 찾을 수 없습니다.",
        };
      }

      // Check if user is active
      if (user.USE_YN !== "Y") {
        return {
          success: false,
          error: "USER_DISABLED",
          message: "비활성화된 사용자입니다.",
        };
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.USER_PW || "");

      if (!isValidPassword) {
        logger.warn("Login failed - invalid password", { userId });
        return {
          success: false,
          error: "INVALID_PASSWORD",
          message: "비밀번호가 일치하지 않습니다.",
        };
      }

      // Get user menus
      const menus = user.ROLE_ID ? await menuRepository.getMenusByRole(user.ROLE_ID) : [];

      logger.info("Login successful", { userId });

      return {
        success: true,
        data: {
          user: {
            userId: user.USER_ID,
            userNm: user.USER_NM,
            email: user.EMAIL,
            roleId: user.ROLE_ID,
          },
          menus,
        },
      };
    } catch (error) {
      logger.error("Login error", { userId, error: (error as Error).message });
      return {
        success: false,
        error: "LOGIN_ERROR",
        message: "로그인 처리 중 오류가 발생했습니다.",
      };
    }
  }

  async hashPassword(password: string): Promise<string> {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS || "12", 10);
    return bcrypt.hash(password, rounds);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    updId: string,
  ): Promise<ServiceResult> {
    try {
      const user = await userRepository.findByUserId(userId);

      if (!user) {
        return {
          success: false,
          error: "USER_NOT_FOUND",
          message: "사용자를 찾을 수 없습니다.",
        };
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.USER_PW || "");

      if (!isValidPassword) {
        return {
          success: false,
          error: "INVALID_PASSWORD",
          message: "현재 비밀번호가 일치하지 않습니다.",
        };
      }

      const hashedPassword = await this.hashPassword(newPassword);
      await userRepository.updatePassword(userId, hashedPassword, updId);

      logger.info("Password changed", { userId });

      return {
        success: true,
        message: "비밀번호가 변경되었습니다.",
      };
    } catch (error) {
      logger.error("Change password error", { userId, error: (error as Error).message });
      return {
        success: false,
        error: "CHANGE_PASSWORD_ERROR",
        message: "비밀번호 변경 중 오류가 발생했습니다.",
      };
    }
  }
}

export default new LoginService();
```

## userService.ts

```typescript
import userRepository, { User, UserSearchParams } from "../repository/sys/userRepository";
import loginService from "./common/loginService";
import { withTransaction } from "../db";
import logger from "../utils/logger";
import { ServiceResult, PaginatedResult } from "../types";

interface CreateUserDto {
  userId: string;
  userNm: string;
  password: string;
  email?: string;
  phone?: string;
  deptCd?: string;
  roleId?: string;
  useYn?: string;
}

interface UpdateUserDto {
  idx: number;
  userNm?: string;
  email?: string;
  phone?: string;
  deptCd?: string;
  roleId?: string;
  useYn?: string;
}

class UserService {
  async getUserList(params: UserSearchParams): Promise<ServiceResult<PaginatedResult<User>>> {
    try {
      const result = await userRepository.searchUsers(params);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      logger.error("Get user list error", { error: (error as Error).message });
      return {
        success: false,
        error: "GET_USER_LIST_ERROR",
        message: "사용자 목록 조회 중 오류가 발생했습니다.",
      };
    }
  }

  async getUserDetail(idx: number): Promise<ServiceResult<User>> {
    try {
      const user = await userRepository.findById(idx);

      if (!user) {
        return {
          success: false,
          error: "USER_NOT_FOUND",
          message: "사용자를 찾을 수 없습니다.",
        };
      }

      // Remove password from response
      const { USER_PW, ...userWithoutPassword } = user;

      return {
        success: true,
        data: userWithoutPassword as User,
      };
    } catch (error) {
      logger.error("Get user detail error", { idx, error: (error as Error).message });
      return {
        success: false,
        error: "GET_USER_DETAIL_ERROR",
        message: "사용자 조회 중 오류가 발생했습니다.",
      };
    }
  }

  async createUser(data: CreateUserDto, regId: string): Promise<ServiceResult<User>> {
    try {
      // Check duplicate userId
      const isDuplicate = await userRepository.checkDuplicateUserId(data.userId);

      if (isDuplicate) {
        return {
          success: false,
          error: "DUPLICATE_USER_ID",
          message: "이미 존재하는 사용자 ID입니다.",
        };
      }

      // Hash password
      const hashedPassword = await loginService.hashPassword(data.password);

      const result = await userRepository.insert(
        {
          USER_ID: data.userId,
          USER_NM: data.userNm,
          USER_PW: hashedPassword,
          EMAIL: data.email,
          PHONE: data.phone,
          DEPT_CD: data.deptCd,
          ROLE_ID: data.roleId,
          USE_YN: data.useYn || "Y",
        } as Partial<User>,
        regId,
      );

      logger.info("User created", { userId: data.userId, regId });

      return {
        success: true,
        data: result.recordset[0],
        message: "사용자가 등록되었습니다.",
      };
    } catch (error) {
      logger.error("Create user error", { data, error: (error as Error).message });
      return {
        success: false,
        error: "CREATE_USER_ERROR",
        message: "사용자 등록 중 오류가 발생했습니다.",
      };
    }
  }

  async updateUser(data: UpdateUserDto, updId: string): Promise<ServiceResult<User>> {
    try {
      const existingUser = await userRepository.findById(data.idx);

      if (!existingUser) {
        return {
          success: false,
          error: "USER_NOT_FOUND",
          message: "사용자를 찾을 수 없습니다.",
        };
      }

      const result = await userRepository.update(
        data.idx,
        {
          USER_NM: data.userNm,
          EMAIL: data.email,
          PHONE: data.phone,
          DEPT_CD: data.deptCd,
          ROLE_ID: data.roleId,
          USE_YN: data.useYn,
        } as Partial<User>,
        updId,
      );

      logger.info("User updated", { idx: data.idx, updId });

      return {
        success: true,
        data: result.recordset[0],
        message: "사용자가 수정되었습니다.",
      };
    } catch (error) {
      logger.error("Update user error", { data, error: (error as Error).message });
      return {
        success: false,
        error: "UPDATE_USER_ERROR",
        message: "사용자 수정 중 오류가 발생했습니다.",
      };
    }
  }

  async deleteUser(idx: number, delId: string): Promise<ServiceResult> {
    try {
      const existingUser = await userRepository.findById(idx);

      if (!existingUser) {
        return {
          success: false,
          error: "USER_NOT_FOUND",
          message: "사용자를 찾을 수 없습니다.",
        };
      }

      await userRepository.softDelete(idx, delId);

      logger.info("User deleted", { idx, delId });

      return {
        success: true,
        message: "사용자가 삭제되었습니다.",
      };
    } catch (error) {
      logger.error("Delete user error", { idx, error: (error as Error).message });
      return {
        success: false,
        error: "DELETE_USER_ERROR",
        message: "사용자 삭제 중 오류가 발생했습니다.",
      };
    }
  }

  async resetPassword(idx: number, newPassword: string, updId: string): Promise<ServiceResult> {
    try {
      const user = await userRepository.findById(idx);

      if (!user) {
        return {
          success: false,
          error: "USER_NOT_FOUND",
          message: "사용자를 찾을 수 없습니다.",
        };
      }

      const hashedPassword = await loginService.hashPassword(newPassword);
      await userRepository.updatePassword(user.USER_ID, hashedPassword, updId);

      logger.info("Password reset", { userId: user.USER_ID, updId });

      return {
        success: true,
        message: "비밀번호가 초기화되었습니다.",
      };
    } catch (error) {
      logger.error("Reset password error", { idx, error: (error as Error).message });
      return {
        success: false,
        error: "RESET_PASSWORD_ERROR",
        message: "비밀번호 초기화 중 오류가 발생했습니다.",
      };
    }
  }
}

export default new UserService();
```

## codeService.ts (Master-Detail)

```typescript
import codeRepository, { CodeMaster, CodeDetail } from "../repository/sys/codeRepository";
import { withTransaction } from "../db";
import logger from "../utils/logger";
import { ServiceResult, PaginatedResult } from "../types";

interface SaveCodeMasterDto {
  grpCd: string;
  grpNm: string;
  grpDesc?: string;
  useYn?: string;
  sortNo?: number;
}

interface SaveCodeDetailDto {
  grpCd: string;
  dtlCd: string;
  dtlNm: string;
  dtlDesc?: string;
  useYn?: string;
  sortNo?: number;
  attr1?: string;
  attr2?: string;
  attr3?: string;
}

class CodeService {
  async getMasterList(params: unknown): Promise<ServiceResult<PaginatedResult<CodeMaster>>> {
    try {
      const result = await codeRepository.getMasterList(params);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      logger.error("Get code master list error", { error: (error as Error).message });
      return {
        success: false,
        error: "GET_CODE_MASTER_ERROR",
        message: "코드 목록 조회 중 오류가 발생했습니다.",
      };
    }
  }

  async getDetailList(grpCd: string): Promise<ServiceResult<CodeDetail[]>> {
    try {
      const result = await codeRepository.getDetailList(grpCd);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      logger.error("Get code detail list error", { grpCd, error: (error as Error).message });
      return {
        success: false,
        error: "GET_CODE_DETAIL_ERROR",
        message: "상세코드 조회 중 오류가 발생했습니다.",
      };
    }
  }

  async saveMaster(data: SaveCodeMasterDto, userId: string): Promise<ServiceResult> {
    try {
      await codeRepository.insertMaster(
        {
          GRP_CD: data.grpCd,
          GRP_NM: data.grpNm,
          GRP_DESC: data.grpDesc,
          USE_YN: data.useYn || "Y",
          SORT_NO: data.sortNo || 0,
        },
        userId,
      );

      logger.info("Code master saved", { grpCd: data.grpCd, userId });

      return {
        success: true,
        message: "코드가 저장되었습니다.",
      };
    } catch (error) {
      logger.error("Save code master error", { data, error: (error as Error).message });
      return {
        success: false,
        error: "SAVE_CODE_MASTER_ERROR",
        message: "코드 저장 중 오류가 발생했습니다.",
      };
    }
  }

  async saveDetail(data: SaveCodeDetailDto, userId: string): Promise<ServiceResult> {
    try {
      await codeRepository.insertDetail(
        {
          GRP_CD: data.grpCd,
          DTL_CD: data.dtlCd,
          DTL_NM: data.dtlNm,
          DTL_DESC: data.dtlDesc,
          USE_YN: data.useYn || "Y",
          SORT_NO: data.sortNo || 0,
          ATTR1: data.attr1,
          ATTR2: data.attr2,
          ATTR3: data.attr3,
        },
        userId,
      );

      logger.info("Code detail saved", { grpCd: data.grpCd, dtlCd: data.dtlCd, userId });

      return {
        success: true,
        message: "상세코드가 저장되었습니다.",
      };
    } catch (error) {
      logger.error("Save code detail error", { data, error: (error as Error).message });
      return {
        success: false,
        error: "SAVE_CODE_DETAIL_ERROR",
        message: "상세코드 저장 중 오류가 발생했습니다.",
      };
    }
  }

  async saveDetailBatch(
    grpCd: string,
    details: SaveCodeDetailDto[],
    userId: string,
  ): Promise<ServiceResult> {
    try {
      await withTransaction(async (transaction) => {
        for (const detail of details) {
          await codeRepository.insertDetail(
            {
              ...detail,
              GRP_CD: grpCd,
            } as Partial<CodeDetail>,
            userId,
          );
        }
      });

      logger.info("Code details batch saved", { grpCd, count: details.length, userId });

      return {
        success: true,
        message: "상세코드가 일괄 저장되었습니다.",
      };
    } catch (error) {
      logger.error("Save code details batch error", { grpCd, error: (error as Error).message });
      return {
        success: false,
        error: "SAVE_CODE_DETAILS_BATCH_ERROR",
        message: "상세코드 일괄 저장 중 오류가 발생했습니다.",
      };
    }
  }
}

export default new CodeService();
```

## fileService.ts

```typescript
import fs from "fs";
import path from "path";
import archiver from "archiver";
import { v4 as uuidv4 } from "uuid";
import fileRepository, { FileInfo } from "../repository/common/fileRepository";
import { withTransaction } from "../db";
import logger from "../utils/logger";
import config from "../config";
import { ServiceResult } from "../types";

interface UploadedFile {
  originalname: string;
  filename: string;
  mimetype: string;
  size: number;
  path: string;
}

class FileService {
  private uploadPath: string;

  constructor() {
    this.uploadPath = config.file.uploadPath;
    this.ensureUploadDir();
  }

  private ensureUploadDir(): void {
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  async saveFiles(
    files: UploadedFile[],
    atchIdx: string | null,
    menuCd: string,
    dataIdx: string,
    userId: string,
  ): Promise<ServiceResult<{ atchIdx: string; files: FileInfo[] }>> {
    try {
      const newAtchIdx = atchIdx || uuidv4();
      const savedFiles: FileInfo[] = [];

      await withTransaction(async (transaction) => {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fileIdx = uuidv4();

          await fileRepository.insertFile(
            {
              FILE_IDX: fileIdx,
              ATCH_IDX: newAtchIdx,
              MENU_CD: menuCd,
              DATA_IDX: dataIdx,
              FILE_NM: file.originalname,
              SAVE_FILE_NM: file.filename,
              FILE_PATH: file.path,
              FILE_SIZE: file.size,
              FILE_TYPE: file.mimetype,
              SORT_NO: i + 1,
            },
            userId,
            transaction,
          );

          savedFiles.push({
            FILE_IDX: fileIdx,
            FILE_NM: file.originalname,
            FILE_SIZE: file.size,
            FILE_TYPE: file.mimetype,
          } as FileInfo);
        }
      });

      logger.info("Files saved", {
        atchIdx: newAtchIdx,
        count: files.length,
        userId,
      });

      return {
        success: true,
        data: {
          atchIdx: newAtchIdx,
          files: savedFiles,
        },
      };
    } catch (error) {
      logger.error("Save files error", { error: (error as Error).message });
      return {
        success: false,
        error: "SAVE_FILES_ERROR",
        message: "파일 저장 중 오류가 발생했습니다.",
      };
    }
  }

  async getFileList(atchIdx: string): Promise<ServiceResult<FileInfo[]>> {
    try {
      const files = await fileRepository.getFilesByAtchIdx(atchIdx);
      return {
        success: true,
        data: files,
      };
    } catch (error) {
      logger.error("Get file list error", { atchIdx, error: (error as Error).message });
      return {
        success: false,
        error: "GET_FILE_LIST_ERROR",
        message: "파일 목록 조회 중 오류가 발생했습니다.",
      };
    }
  }

  async downloadFile(
    fileIdx: string,
  ): Promise<ServiceResult<{ filePath: string; fileName: string }>> {
    try {
      const file = await fileRepository.getFileByIdx(fileIdx);

      if (!file) {
        return {
          success: false,
          error: "FILE_NOT_FOUND",
          message: "파일을 찾을 수 없습니다.",
        };
      }

      const filePath = path.join(this.uploadPath, file.SAVE_FILE_NM);

      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: "FILE_NOT_EXISTS",
          message: "파일이 존재하지 않습니다.",
        };
      }

      return {
        success: true,
        data: {
          filePath,
          fileName: file.FILE_NM,
        },
      };
    } catch (error) {
      logger.error("Download file error", { fileIdx, error: (error as Error).message });
      return {
        success: false,
        error: "DOWNLOAD_FILE_ERROR",
        message: "파일 다운로드 중 오류가 발생했습니다.",
      };
    }
  }

  async downloadFilesAsZip(
    atchIdx: string,
  ): Promise<ServiceResult<{ zipPath: string; zipName: string }>> {
    try {
      const files = await fileRepository.getFilesByAtchIdx(atchIdx);

      if (files.length === 0) {
        return {
          success: false,
          error: "NO_FILES",
          message: "다운로드할 파일이 없습니다.",
        };
      }

      const zipFileName = `files_${atchIdx}_${Date.now()}.zip`;
      const zipPath = path.join(this.uploadPath, "temp", zipFileName);

      // Ensure temp directory exists
      const tempDir = path.dirname(zipPath);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Create zip archive
      const output = fs.createWriteStream(zipPath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      archive.pipe(output);

      for (const file of files) {
        const filePath = path.join(this.uploadPath, file.SAVE_FILE_NM);
        if (fs.existsSync(filePath)) {
          archive.file(filePath, { name: file.FILE_NM });
        }
      }

      await archive.finalize();

      return {
        success: true,
        data: {
          zipPath,
          zipName: zipFileName,
        },
      };
    } catch (error) {
      logger.error("Download files as zip error", { atchIdx, error: (error as Error).message });
      return {
        success: false,
        error: "DOWNLOAD_ZIP_ERROR",
        message: "파일 압축 중 오류가 발생했습니다.",
      };
    }
  }

  async deleteFile(fileIdx: string, userId: string): Promise<ServiceResult> {
    try {
      const file = await fileRepository.getFileByIdx(fileIdx);

      if (!file) {
        return {
          success: false,
          error: "FILE_NOT_FOUND",
          message: "파일을 찾을 수 없습니다.",
        };
      }

      // Soft delete from database
      await fileRepository.softDelete(fileIdx, userId);

      // Optionally delete physical file
      const filePath = path.join(this.uploadPath, file.SAVE_FILE_NM);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      logger.info("File deleted", { fileIdx, userId });

      return {
        success: true,
        message: "파일이 삭제되었습니다.",
      };
    } catch (error) {
      logger.error("Delete file error", { fileIdx, error: (error as Error).message });
      return {
        success: false,
        error: "DELETE_FILE_ERROR",
        message: "파일 삭제 중 오류가 발생했습니다.",
      };
    }
  }
}

export default new FileService();
```
