# System Management API Templates

## User Management API

### userDto.ts

```typescript
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  MinLength,
  MaxLength,
  IsInt,
} from "class-validator";

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: "사용자 ID는 필수입니다." })
  @MinLength(3, { message: "사용자 ID는 3자 이상이어야 합니다." })
  @MaxLength(50, { message: "사용자 ID는 50자 이하여야 합니다." })
  userId!: string;

  @IsString()
  @IsNotEmpty({ message: "사용자명은 필수입니다." })
  @MaxLength(100, { message: "사용자명은 100자 이하여야 합니다." })
  userNm!: string;

  @IsString()
  @IsNotEmpty({ message: "비밀번호는 필수입니다." })
  @MinLength(8, { message: "비밀번호는 8자 이상이어야 합니다." })
  password!: string;

  @IsOptional()
  @IsEmail({}, { message: "올바른 이메일 형식이 아닙니다." })
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: "전화번호는 20자 이하여야 합니다." })
  phone?: string;

  @IsOptional()
  @IsString()
  deptCd?: string;

  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @IsString()
  useYn?: string;
}

export class UpdateUserDto {
  @IsInt({ message: "idx는 정수여야 합니다." })
  @IsNotEmpty({ message: "idx는 필수입니다." })
  idx!: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  userNm?: string;

  @IsOptional()
  @IsEmail({}, { message: "올바른 이메일 형식이 아닙니다." })
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  deptCd?: string;

  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @IsString()
  useYn?: string;
}
```

## Code Management API

### codeDto.ts

```typescript
import { IsString, IsNotEmpty, IsOptional, IsInt, MaxLength } from "class-validator";

export class CreateCodeMasterDto {
  @IsString()
  @IsNotEmpty({ message: "그룹코드는 필수입니다." })
  @MaxLength(20, { message: "그룹코드는 20자 이하여야 합니다." })
  grpCd!: string;

  @IsString()
  @IsNotEmpty({ message: "그룹명은 필수입니다." })
  @MaxLength(100, { message: "그룹명은 100자 이하여야 합니다." })
  grpNm!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  grpDesc?: string;

  @IsOptional()
  @IsString()
  useYn?: string;

  @IsOptional()
  @IsInt()
  sortNo?: number;
}

export class CreateCodeDetailDto {
  @IsString()
  @IsNotEmpty({ message: "그룹코드는 필수입니다." })
  grpCd!: string;

  @IsString()
  @IsNotEmpty({ message: "상세코드는 필수입니다." })
  @MaxLength(20, { message: "상세코드는 20자 이하여야 합니다." })
  dtlCd!: string;

  @IsString()
  @IsNotEmpty({ message: "상세코드명은 필수입니다." })
  @MaxLength(100, { message: "상세코드명은 100자 이하여야 합니다." })
  dtlNm!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  dtlDesc?: string;

  @IsOptional()
  @IsString()
  useYn?: string;

  @IsOptional()
  @IsInt()
  sortNo?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  attr1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  attr2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  attr3?: string;
}
```

## Menu Management API

### menuDto.ts

```typescript
import { IsString, IsNotEmpty, IsOptional, IsInt, MaxLength, Min } from "class-validator";

export class CreateMenuDto {
  @IsString()
  @IsNotEmpty({ message: "메뉴코드는 필수입니다." })
  @MaxLength(20, { message: "메뉴코드는 20자 이하여야 합니다." })
  menuCd!: string;

  @IsString()
  @IsNotEmpty({ message: "메뉴명은 필수입니다." })
  @MaxLength(100, { message: "메뉴명은 100자 이하여야 합니다." })
  menuNm!: string;

  @IsOptional()
  @IsString()
  prntMenuCd?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  menuUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  menuIcon?: string;

  @IsInt()
  @Min(0)
  menuLvl!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortNo?: number;

  @IsOptional()
  @IsString()
  useYn?: string;
}

export class UpdateMenuDto {
  @IsString()
  @IsNotEmpty({ message: "메뉴코드는 필수입니다." })
  menuCd!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  menuNm?: string;

  @IsOptional()
  @IsString()
  prntMenuCd?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  menuUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  menuIcon?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  menuLvl?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortNo?: number;

  @IsOptional()
  @IsString()
  useYn?: string;
}

export class UpdateMenuOrderDto {
  @IsString()
  @IsNotEmpty()
  menuCd!: string;

  @IsInt()
  @Min(0)
  sortNo!: number;
}
```

### menuRoutes.ts

```typescript
import { Router, Request, Response } from "express";
import menuService from "../../service/sys/menuService";
import { validateDto } from "../../middleware/validators/dtoValidator";
import { CreateMenuDto, UpdateMenuDto } from "../../dto/sys/menuDto";
import logger from "../../utils/logger";

const router = Router();

/**
 * @swagger
 * /sys/menu/list:
 *   get:
 *     summary: Get menu list
 *     tags: [System - Menu]
 */
router.get("/list", async (req: Request, res: Response) => {
  const result = await menuService.getMenuList();

  res.json({
    ...result,
    correlationId: req.correlationId,
  });
});

/**
 * @swagger
 * /sys/menu/tree:
 *   get:
 *     summary: Get menu tree structure
 *     tags: [System - Menu]
 */
router.get("/tree", async (req: Request, res: Response) => {
  const result = await menuService.getMenuTree();

  res.json({
    ...result,
    correlationId: req.correlationId,
  });
});

/**
 * @swagger
 * /sys/menu/create:
 *   post:
 *     summary: Create new menu
 *     tags: [System - Menu]
 */
router.post("/create", validateDto(CreateMenuDto), async (req: Request, res: Response) => {
  const userId = req.session?.user?.userId || "system";
  const result = await menuService.createMenu(req.body, userId);

  if (!result.success) {
    const status = result.error === "DUPLICATE_MENU_CD" ? 409 : 500;
    return res.status(status).json({
      ...result,
      correlationId: req.correlationId,
    });
  }

  logger.info("Menu created", {
    menuCd: req.body.menuCd,
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
 * /sys/menu/update:
 *   post:
 *     summary: Update menu
 *     tags: [System - Menu]
 */
router.post("/update", validateDto(UpdateMenuDto), async (req: Request, res: Response) => {
  const userId = req.session?.user?.userId || "system";
  const result = await menuService.updateMenu(req.body, userId);

  if (!result.success) {
    return res.status(404).json({
      ...result,
      correlationId: req.correlationId,
    });
  }

  logger.info("Menu updated", {
    menuCd: req.body.menuCd,
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
 * /sys/menu/updateOrder:
 *   post:
 *     summary: Update menu order
 *     tags: [System - Menu]
 */
router.post("/updateOrder", async (req: Request, res: Response) => {
  const { menus } = req.body;
  const userId = req.session?.user?.userId || "system";

  if (!Array.isArray(menus)) {
    return res.status(400).json({
      success: false,
      error: "VALIDATION_ERROR",
      message: "menus 배열이 필요합니다.",
      correlationId: req.correlationId,
    });
  }

  const result = await menuService.updateMenuOrder(menus, userId);

  if (!result.success) {
    return res.status(500).json({
      ...result,
      correlationId: req.correlationId,
    });
  }

  logger.info("Menu order updated", {
    count: menus.length,
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
 * /sys/menu/delete:
 *   post:
 *     summary: Delete menu
 *     tags: [System - Menu]
 */
router.post("/delete", async (req: Request, res: Response) => {
  const { menuCd } = req.body;
  const userId = req.session?.user?.userId || "system";

  if (!menuCd) {
    return res.status(400).json({
      success: false,
      error: "VALIDATION_ERROR",
      message: "menuCd는 필수입니다.",
      correlationId: req.correlationId,
    });
  }

  const result = await menuService.deleteMenu(menuCd, userId);

  if (!result.success) {
    return res.status(404).json({
      ...result,
      correlationId: req.correlationId,
    });
  }

  logger.info("Menu deleted", {
    menuCd,
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

## Auth (Role) Management API

### authDto.ts

```typescript
import { IsString, IsNotEmpty, IsOptional, IsArray, MaxLength } from "class-validator";

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty({ message: "권한ID는 필수입니다." })
  @MaxLength(20, { message: "권한ID는 20자 이하여야 합니다." })
  roleId!: string;

  @IsString()
  @IsNotEmpty({ message: "권한명은 필수입니다." })
  @MaxLength(100, { message: "권한명은 100자 이하여야 합니다." })
  roleNm!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  roleDesc?: string;

  @IsOptional()
  @IsString()
  useYn?: string;
}

export class UpdateRoleDto {
  @IsString()
  @IsNotEmpty({ message: "권한ID는 필수입니다." })
  roleId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  roleNm?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  roleDesc?: string;

  @IsOptional()
  @IsString()
  useYn?: string;
}

export class AssignMenusToRoleDto {
  @IsString()
  @IsNotEmpty({ message: "권한ID는 필수입니다." })
  roleId!: string;

  @IsArray()
  @IsString({ each: true })
  menuCds!: string[];
}
```

### authRoutes.ts

```typescript
import { Router, Request, Response } from "express";
import authService from "../../service/sys/authService";
import { validateDto } from "../../middleware/validators/dtoValidator";
import { CreateRoleDto, UpdateRoleDto, AssignMenusToRoleDto } from "../../dto/sys/authDto";
import logger from "../../utils/logger";

const router = Router();

/**
 * @swagger
 * /sys/auth/list:
 *   post:
 *     summary: Get role list
 *     tags: [System - Auth]
 */
router.post("/list", async (req: Request, res: Response) => {
  const result = await authService.getRoleList(req.body);

  res.json({
    ...result,
    correlationId: req.correlationId,
  });
});

/**
 * @swagger
 * /sys/auth/detail:
 *   post:
 *     summary: Get role detail with menu assignments
 *     tags: [System - Auth]
 */
router.post("/detail", async (req: Request, res: Response) => {
  const { roleId } = req.body;

  if (!roleId) {
    return res.status(400).json({
      success: false,
      error: "VALIDATION_ERROR",
      message: "roleId는 필수입니다.",
      correlationId: req.correlationId,
    });
  }

  const result = await authService.getRoleDetail(roleId);

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
 * /sys/auth/create:
 *   post:
 *     summary: Create new role
 *     tags: [System - Auth]
 */
router.post("/create", validateDto(CreateRoleDto), async (req: Request, res: Response) => {
  const userId = req.session?.user?.userId || "system";
  const result = await authService.createRole(req.body, userId);

  if (!result.success) {
    const status = result.error === "DUPLICATE_ROLE_ID" ? 409 : 500;
    return res.status(status).json({
      ...result,
      correlationId: req.correlationId,
    });
  }

  logger.info("Role created", {
    roleId: req.body.roleId,
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
 * /sys/auth/update:
 *   post:
 *     summary: Update role
 *     tags: [System - Auth]
 */
router.post("/update", validateDto(UpdateRoleDto), async (req: Request, res: Response) => {
  const userId = req.session?.user?.userId || "system";
  const result = await authService.updateRole(req.body, userId);

  if (!result.success) {
    return res.status(404).json({
      ...result,
      correlationId: req.correlationId,
    });
  }

  logger.info("Role updated", {
    roleId: req.body.roleId,
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
 * /sys/auth/assignMenus:
 *   post:
 *     summary: Assign menus to role
 *     tags: [System - Auth]
 */
router.post(
  "/assignMenus",
  validateDto(AssignMenusToRoleDto),
  async (req: Request, res: Response) => {
    const { roleId, menuCds } = req.body;
    const userId = req.session?.user?.userId || "system";

    const result = await authService.assignMenusToRole(roleId, menuCds, userId);

    if (!result.success) {
      return res.status(500).json({
        ...result,
        correlationId: req.correlationId,
      });
    }

    logger.info("Menus assigned to role", {
      roleId,
      menuCount: menuCds.length,
      assignedBy: userId,
      correlationId: req.correlationId,
    });

    res.json({
      ...result,
      correlationId: req.correlationId,
    });
  },
);

/**
 * @swagger
 * /sys/auth/menuTree:
 *   post:
 *     summary: Get menu tree for role assignment
 *     tags: [System - Auth]
 */
router.post("/menuTree", async (req: Request, res: Response) => {
  const { roleId } = req.body;

  const result = await authService.getMenuTreeForRole(roleId);

  res.json({
    ...result,
    correlationId: req.correlationId,
  });
});

/**
 * @swagger
 * /sys/auth/delete:
 *   post:
 *     summary: Delete role
 *     tags: [System - Auth]
 */
router.post("/delete", async (req: Request, res: Response) => {
  const { roleId } = req.body;
  const userId = req.session?.user?.userId || "system";

  if (!roleId) {
    return res.status(400).json({
      success: false,
      error: "VALIDATION_ERROR",
      message: "roleId는 필수입니다.",
      correlationId: req.correlationId,
    });
  }

  const result = await authService.deleteRole(roleId, userId);

  if (!result.success) {
    return res.status(404).json({
      ...result,
      correlationId: req.correlationId,
    });
  }

  logger.info("Role deleted", {
    roleId,
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

## Database Tables

### User Table

```sql
CREATE TABLE TB_SYS_USER (
    IDX INT IDENTITY(1,1) PRIMARY KEY,
    USER_ID VARCHAR(50) NOT NULL UNIQUE,
    USER_NM NVARCHAR(100) NOT NULL,
    USER_PW VARCHAR(200),
    EMAIL VARCHAR(200),
    PHONE VARCHAR(20),
    DEPT_CD VARCHAR(20),
    DEPT_NM NVARCHAR(100),
    ROLE_ID VARCHAR(20),
    USE_YN CHAR(1) DEFAULT 'Y',
    DEL_YN CHAR(1) DEFAULT 'N',
    REG_ID VARCHAR(50),
    REG_DT DATETIME DEFAULT GETDATE(),
    UPD_ID VARCHAR(50),
    UPD_DT DATETIME,
    DEL_ID VARCHAR(50),
    DEL_DT DATETIME
);
```

### Code Tables

```sql
CREATE TABLE TB_SYS_CODE_MST (
    GRP_CD VARCHAR(20) PRIMARY KEY,
    GRP_NM NVARCHAR(100) NOT NULL,
    GRP_DESC NVARCHAR(500),
    USE_YN CHAR(1) DEFAULT 'Y',
    SORT_NO INT DEFAULT 0,
    DEL_YN CHAR(1) DEFAULT 'N',
    REG_ID VARCHAR(50),
    REG_DT DATETIME DEFAULT GETDATE(),
    UPD_ID VARCHAR(50),
    UPD_DT DATETIME
);

CREATE TABLE TB_SYS_CODE_DTL (
    GRP_CD VARCHAR(20) NOT NULL,
    DTL_CD VARCHAR(20) NOT NULL,
    DTL_NM NVARCHAR(100) NOT NULL,
    DTL_DESC NVARCHAR(500),
    USE_YN CHAR(1) DEFAULT 'Y',
    SORT_NO INT DEFAULT 0,
    ATTR1 NVARCHAR(200),
    ATTR2 NVARCHAR(200),
    ATTR3 NVARCHAR(200),
    DEL_YN CHAR(1) DEFAULT 'N',
    REG_ID VARCHAR(50),
    REG_DT DATETIME DEFAULT GETDATE(),
    UPD_ID VARCHAR(50),
    UPD_DT DATETIME,
    PRIMARY KEY (GRP_CD, DTL_CD)
);
```

### Menu Table

```sql
CREATE TABLE TB_SYS_MENU (
    MENU_CD VARCHAR(20) PRIMARY KEY,
    MENU_NM NVARCHAR(100) NOT NULL,
    PRNT_MENU_CD VARCHAR(20),
    MENU_URL VARCHAR(500),
    MENU_ICON VARCHAR(50),
    MENU_LVL INT DEFAULT 0,
    SORT_NO INT DEFAULT 0,
    USE_YN CHAR(1) DEFAULT 'Y',
    DEL_YN CHAR(1) DEFAULT 'N',
    REG_ID VARCHAR(50),
    REG_DT DATETIME DEFAULT GETDATE(),
    UPD_ID VARCHAR(50),
    UPD_DT DATETIME
);
```

### Role Tables

```sql
CREATE TABLE TB_SYS_ROLE (
    ROLE_ID VARCHAR(20) PRIMARY KEY,
    ROLE_NM NVARCHAR(100) NOT NULL,
    ROLE_DESC NVARCHAR(500),
    USE_YN CHAR(1) DEFAULT 'Y',
    DEL_YN CHAR(1) DEFAULT 'N',
    REG_ID VARCHAR(50),
    REG_DT DATETIME DEFAULT GETDATE(),
    UPD_ID VARCHAR(50),
    UPD_DT DATETIME
);

CREATE TABLE TB_SYS_ROLE_MENU (
    ROLE_ID VARCHAR(20) NOT NULL,
    MENU_CD VARCHAR(20) NOT NULL,
    REG_ID VARCHAR(50),
    REG_DT DATETIME DEFAULT GETDATE(),
    PRIMARY KEY (ROLE_ID, MENU_CD)
);
```

### File Table

```sql
CREATE TABLE TB_SYS_FILE (
    FILE_IDX VARCHAR(50) PRIMARY KEY,
    ATCH_IDX VARCHAR(50) NOT NULL,
    MENU_CD VARCHAR(20),
    DATA_IDX VARCHAR(50),
    FILE_NM NVARCHAR(500) NOT NULL,
    SAVE_FILE_NM VARCHAR(200) NOT NULL,
    FILE_PATH VARCHAR(500),
    FILE_SIZE BIGINT DEFAULT 0,
    FILE_TYPE VARCHAR(100),
    SORT_NO INT DEFAULT 0,
    DEL_YN CHAR(1) DEFAULT 'N',
    REG_ID VARCHAR(50),
    REG_DT DATETIME DEFAULT GETDATE(),
    DEL_ID VARCHAR(50),
    DEL_DT DATETIME
);

CREATE INDEX IX_TB_SYS_FILE_ATCH ON TB_SYS_FILE(ATCH_IDX);
```
