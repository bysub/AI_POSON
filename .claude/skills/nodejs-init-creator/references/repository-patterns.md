# Repository Layer Patterns

## baseRepository.ts

```typescript
import sql, { Request, Transaction, IResult } from "mssql";
import { getPool } from "../db";
import logger from "../utils/logger";

export interface PaginatedResult<T> {
  list: T[];
  totalCount: number;
  pageSize: number;
  currentPage: number;
  totalPages: number;
}

export interface QueryParams {
  pageSize?: number;
  pageNum?: number;
  sortField?: string;
  sortOrder?: "ASC" | "DESC";
  [key: string]: unknown;
}

export abstract class BaseRepository<T> {
  protected tableName: string;
  protected primaryKey: string;

  constructor(tableName: string, primaryKey: string = "IDX") {
    this.tableName = tableName;
    this.primaryKey = primaryKey;
  }

  /**
   * Get database request object
   */
  protected async getRequest(transaction?: Transaction): Promise<Request> {
    if (transaction) {
      return new Request(transaction);
    }
    const pool = await getPool();
    return pool.request();
  }

  /**
   * Find record by primary key
   */
  async findById(id: string | number, transaction?: Transaction): Promise<T | null> {
    const request = await this.getRequest(transaction);
    request.input("id", sql.VarChar, String(id));

    const query = `
      SELECT * FROM ${this.tableName}
      WHERE ${this.primaryKey} = @id
        AND DEL_YN = 'N'
    `;

    const result = await request.query<T>(query);
    return result.recordset[0] || null;
  }

  /**
   * Find all records
   */
  async findAll(transaction?: Transaction): Promise<T[]> {
    const request = await this.getRequest(transaction);

    const query = `
      SELECT * FROM ${this.tableName}
      WHERE DEL_YN = 'N'
      ORDER BY ${this.primaryKey} DESC
    `;

    const result = await request.query<T>(query);
    return result.recordset;
  }

  /**
   * Execute paginated query
   */
  async executePaginatedQuery<R = T>(
    baseQuery: string,
    countQuery: string,
    params: QueryParams,
    transaction?: Transaction,
  ): Promise<PaginatedResult<R>> {
    const pageSize = params.pageSize || 20;
    const pageNum = params.pageNum || 1;
    const offset = (pageNum - 1) * pageSize;

    const request = await this.getRequest(transaction);

    // Bind common parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && !["pageSize", "pageNum", "sortField", "sortOrder"].includes(key)) {
        request.input(key, sql.NVarChar, String(value));
      }
    });

    // Get total count
    const countResult = await request.query<{ totalCount: number }>(countQuery);
    const totalCount = countResult.recordset[0]?.totalCount || 0;

    // Get paginated data
    const paginatedQuery = `
      ${baseQuery}
      OFFSET ${offset} ROWS
      FETCH NEXT ${pageSize} ROWS ONLY
    `;

    const dataResult = await request.query<R>(paginatedQuery);

    return {
      list: dataResult.recordset,
      totalCount,
      pageSize,
      currentPage: pageNum,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  }

  /**
   * Insert record
   */
  async insert(data: Partial<T>, userId: string, transaction?: Transaction): Promise<IResult<T>> {
    const request = await this.getRequest(transaction);

    const columns = Object.keys(data);
    const values = columns.map((col) => `@${col}`);

    // Add audit columns
    columns.push("REG_ID", "REG_DT", "DEL_YN");
    values.push("@regId", "GETDATE()", "'N'");

    // Bind parameters
    Object.entries(data).forEach(([key, value]) => {
      request.input(key, value);
    });
    request.input("regId", sql.VarChar, userId);

    const query = `
      INSERT INTO ${this.tableName} (${columns.join(", ")})
      OUTPUT INSERTED.*
      VALUES (${values.join(", ")})
    `;

    logger.debug("Insert query", { table: this.tableName, columns });
    return request.query<T>(query);
  }

  /**
   * Update record
   */
  async update(
    id: string | number,
    data: Partial<T>,
    userId: string,
    transaction?: Transaction,
  ): Promise<IResult<T>> {
    const request = await this.getRequest(transaction);

    const setClause = Object.keys(data)
      .map((col) => `${col} = @${col}`)
      .join(", ");

    // Add audit columns
    const auditClause = ", UPD_ID = @updId, UPD_DT = GETDATE()";

    // Bind parameters
    Object.entries(data).forEach(([key, value]) => {
      request.input(key, value);
    });
    request.input("id", sql.VarChar, String(id));
    request.input("updId", sql.VarChar, userId);

    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}${auditClause}
      OUTPUT INSERTED.*
      WHERE ${this.primaryKey} = @id
        AND DEL_YN = 'N'
    `;

    logger.debug("Update query", { table: this.tableName, id });
    return request.query<T>(query);
  }

  /**
   * Soft delete record
   */
  async softDelete(
    id: string | number,
    userId: string,
    transaction?: Transaction,
  ): Promise<IResult<T>> {
    const request = await this.getRequest(transaction);

    request.input("id", sql.VarChar, String(id));
    request.input("delId", sql.VarChar, userId);

    const query = `
      UPDATE ${this.tableName}
      SET DEL_YN = 'Y',
          DEL_ID = @delId,
          DEL_DT = GETDATE()
      OUTPUT INSERTED.*
      WHERE ${this.primaryKey} = @id
    `;

    logger.debug("Soft delete", { table: this.tableName, id });
    return request.query<T>(query);
  }

  /**
   * Hard delete record
   */
  async hardDelete(id: string | number, transaction?: Transaction): Promise<IResult<T>> {
    const request = await this.getRequest(transaction);

    request.input("id", sql.VarChar, String(id));

    const query = `
      DELETE FROM ${this.tableName}
      OUTPUT DELETED.*
      WHERE ${this.primaryKey} = @id
    `;

    logger.debug("Hard delete", { table: this.tableName, id });
    return request.query<T>(query);
  }

  /**
   * Check if record exists
   */
  async exists(id: string | number, transaction?: Transaction): Promise<boolean> {
    const request = await this.getRequest(transaction);
    request.input("id", sql.VarChar, String(id));

    const query = `
      SELECT 1 AS exists
      FROM ${this.tableName}
      WHERE ${this.primaryKey} = @id
        AND DEL_YN = 'N'
    `;

    const result = await request.query(query);
    return result.recordset.length > 0;
  }

  /**
   * Count records with condition
   */
  async count(
    where?: string,
    params?: Record<string, unknown>,
    transaction?: Transaction,
  ): Promise<number> {
    const request = await this.getRequest(transaction);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        request.input(key, value);
      });
    }

    const whereClause = where ? `AND ${where}` : "";
    const query = `
      SELECT COUNT(*) AS count
      FROM ${this.tableName}
      WHERE DEL_YN = 'N' ${whereClause}
    `;

    const result = await request.query<{ count: number }>(query);
    return result.recordset[0]?.count || 0;
  }
}
```

## Example: userRepository.ts

```typescript
import sql from "mssql";
import { BaseRepository, PaginatedResult, QueryParams } from "../base/baseRepository";
import { getPool } from "../../db";

export interface User {
  IDX: number;
  USER_ID: string;
  USER_NM: string;
  USER_PW?: string;
  EMAIL?: string;
  PHONE?: string;
  DEPT_CD?: string;
  DEPT_NM?: string;
  ROLE_ID?: string;
  USE_YN: string;
  DEL_YN: string;
  REG_ID?: string;
  REG_DT?: Date;
  UPD_ID?: string;
  UPD_DT?: Date;
}

export interface UserSearchParams extends QueryParams {
  searchType?: string;
  searchKeyword?: string;
  useYn?: string;
  deptCd?: string;
}

class UserRepository extends BaseRepository<User> {
  constructor() {
    super("TB_SYS_USER", "IDX");
  }

  async findByUserId(userId: string): Promise<User | null> {
    const pool = await getPool();
    const request = pool.request();
    request.input("userId", sql.VarChar, userId);

    const query = `
      SELECT *
      FROM TB_SYS_USER
      WHERE USER_ID = @userId
        AND DEL_YN = 'N'
    `;

    const result = await request.query<User>(query);
    return result.recordset[0] || null;
  }

  async searchUsers(params: UserSearchParams): Promise<PaginatedResult<User>> {
    const { searchType, searchKeyword, useYn, deptCd } = params;

    let whereClause = "WHERE DEL_YN = 'N'";

    if (searchKeyword) {
      if (searchType === "USER_ID") {
        whereClause += ` AND USER_ID LIKE '%' + @searchKeyword + '%'`;
      } else if (searchType === "USER_NM") {
        whereClause += ` AND USER_NM LIKE '%' + @searchKeyword + '%'`;
      } else {
        whereClause += ` AND (USER_ID LIKE '%' + @searchKeyword + '%' OR USER_NM LIKE '%' + @searchKeyword + '%')`;
      }
    }

    if (useYn) {
      whereClause += ` AND USE_YN = @useYn`;
    }

    if (deptCd) {
      whereClause += ` AND DEPT_CD = @deptCd`;
    }

    const baseQuery = `
      SELECT
        IDX,
        USER_ID,
        USER_NM,
        EMAIL,
        PHONE,
        DEPT_CD,
        DEPT_NM,
        ROLE_ID,
        USE_YN,
        REG_ID,
        REG_DT,
        UPD_ID,
        UPD_DT
      FROM TB_SYS_USER
      ${whereClause}
      ORDER BY IDX DESC
    `;

    const countQuery = `
      SELECT COUNT(*) AS totalCount
      FROM TB_SYS_USER
      ${whereClause}
    `;

    return this.executePaginatedQuery<User>(baseQuery, countQuery, {
      ...params,
      searchKeyword,
    });
  }

  async updatePassword(userId: string, hashedPassword: string, updId: string): Promise<void> {
    const pool = await getPool();
    const request = pool.request();

    request.input("userId", sql.VarChar, userId);
    request.input("password", sql.VarChar, hashedPassword);
    request.input("updId", sql.VarChar, updId);

    await request.query(`
      UPDATE TB_SYS_USER
      SET USER_PW = @password,
          UPD_ID = @updId,
          UPD_DT = GETDATE()
      WHERE USER_ID = @userId
    `);
  }

  async checkDuplicateUserId(userId: string, excludeIdx?: number): Promise<boolean> {
    const pool = await getPool();
    const request = pool.request();

    request.input("userId", sql.VarChar, userId);

    let query = `
      SELECT 1 FROM TB_SYS_USER
      WHERE USER_ID = @userId
        AND DEL_YN = 'N'
    `;

    if (excludeIdx) {
      request.input("excludeIdx", sql.Int, excludeIdx);
      query += ` AND IDX != @excludeIdx`;
    }

    const result = await request.query(query);
    return result.recordset.length > 0;
  }
}

export default new UserRepository();
```

## Example: codeRepository.ts (Master-Detail)

```typescript
import sql from "mssql";
import { BaseRepository, PaginatedResult, QueryParams } from "../base/baseRepository";
import { getPool } from "../../db";

export interface CodeMaster {
  GRP_CD: string;
  GRP_NM: string;
  GRP_DESC?: string;
  USE_YN: string;
  SORT_NO: number;
  DEL_YN: string;
  REG_ID?: string;
  REG_DT?: Date;
}

export interface CodeDetail {
  GRP_CD: string;
  DTL_CD: string;
  DTL_NM: string;
  DTL_DESC?: string;
  USE_YN: string;
  SORT_NO: number;
  ATTR1?: string;
  ATTR2?: string;
  ATTR3?: string;
  DEL_YN: string;
  REG_ID?: string;
  REG_DT?: Date;
}

class CodeRepository extends BaseRepository<CodeMaster> {
  constructor() {
    super("TB_SYS_CODE_MST", "GRP_CD");
  }

  async getMasterList(params: QueryParams): Promise<PaginatedResult<CodeMaster>> {
    const { searchKeyword } = params;

    let whereClause = "WHERE DEL_YN = 'N'";
    if (searchKeyword) {
      whereClause += ` AND (GRP_CD LIKE '%' + @searchKeyword + '%' OR GRP_NM LIKE '%' + @searchKeyword + '%')`;
    }

    const baseQuery = `
      SELECT *
      FROM TB_SYS_CODE_MST
      ${whereClause}
      ORDER BY SORT_NO, GRP_CD
    `;

    const countQuery = `
      SELECT COUNT(*) AS totalCount
      FROM TB_SYS_CODE_MST
      ${whereClause}
    `;

    return this.executePaginatedQuery<CodeMaster>(baseQuery, countQuery, params);
  }

  async getDetailList(grpCd: string): Promise<CodeDetail[]> {
    const pool = await getPool();
    const request = pool.request();

    request.input("grpCd", sql.VarChar, grpCd);

    const result = await request.query<CodeDetail>(`
      SELECT *
      FROM TB_SYS_CODE_DTL
      WHERE GRP_CD = @grpCd
        AND DEL_YN = 'N'
      ORDER BY SORT_NO, DTL_CD
    `);

    return result.recordset;
  }

  async insertMaster(data: Partial<CodeMaster>, userId: string): Promise<void> {
    const pool = await getPool();
    const request = pool.request();

    request.input("grpCd", sql.VarChar, data.GRP_CD);
    request.input("grpNm", sql.NVarChar, data.GRP_NM);
    request.input("grpDesc", sql.NVarChar, data.GRP_DESC || "");
    request.input("useYn", sql.Char, data.USE_YN || "Y");
    request.input("sortNo", sql.Int, data.SORT_NO || 0);
    request.input("regId", sql.VarChar, userId);

    await request.query(`
      INSERT INTO TB_SYS_CODE_MST (GRP_CD, GRP_NM, GRP_DESC, USE_YN, SORT_NO, DEL_YN, REG_ID, REG_DT)
      VALUES (@grpCd, @grpNm, @grpDesc, @useYn, @sortNo, 'N', @regId, GETDATE())
    `);
  }

  async insertDetail(data: Partial<CodeDetail>, userId: string): Promise<void> {
    const pool = await getPool();
    const request = pool.request();

    request.input("grpCd", sql.VarChar, data.GRP_CD);
    request.input("dtlCd", sql.VarChar, data.DTL_CD);
    request.input("dtlNm", sql.NVarChar, data.DTL_NM);
    request.input("dtlDesc", sql.NVarChar, data.DTL_DESC || "");
    request.input("useYn", sql.Char, data.USE_YN || "Y");
    request.input("sortNo", sql.Int, data.SORT_NO || 0);
    request.input("attr1", sql.NVarChar, data.ATTR1 || "");
    request.input("attr2", sql.NVarChar, data.ATTR2 || "");
    request.input("attr3", sql.NVarChar, data.ATTR3 || "");
    request.input("regId", sql.VarChar, userId);

    await request.query(`
      INSERT INTO TB_SYS_CODE_DTL
        (GRP_CD, DTL_CD, DTL_NM, DTL_DESC, USE_YN, SORT_NO, ATTR1, ATTR2, ATTR3, DEL_YN, REG_ID, REG_DT)
      VALUES
        (@grpCd, @dtlCd, @dtlNm, @dtlDesc, @useYn, @sortNo, @attr1, @attr2, @attr3, 'N', @regId, GETDATE())
    `);
  }
}

export default new CodeRepository();
```

## Example: menuRepository.ts (Tree Structure)

```typescript
import sql from "mssql";
import { BaseRepository } from "../base/baseRepository";
import { getPool } from "../../db";

export interface Menu {
  MENU_CD: string;
  MENU_NM: string;
  PRNT_MENU_CD?: string;
  MENU_URL?: string;
  MENU_ICON?: string;
  MENU_LVL: number;
  SORT_NO: number;
  USE_YN: string;
  DEL_YN: string;
}

export interface MenuTreeNode extends Menu {
  children?: MenuTreeNode[];
}

class MenuRepository extends BaseRepository<Menu> {
  constructor() {
    super("TB_SYS_MENU", "MENU_CD");
  }

  async getMenuList(): Promise<Menu[]> {
    const pool = await getPool();
    const request = pool.request();

    const result = await request.query<Menu>(`
      SELECT *
      FROM TB_SYS_MENU
      WHERE DEL_YN = 'N'
      ORDER BY MENU_LVL, SORT_NO, MENU_CD
    `);

    return result.recordset;
  }

  async getMenuTree(): Promise<MenuTreeNode[]> {
    const flatList = await this.getMenuList();
    return this.buildTree(flatList);
  }

  private buildTree(flatList: Menu[]): MenuTreeNode[] {
    const map: Record<string, MenuTreeNode> = {};
    const tree: MenuTreeNode[] = [];

    // Create map
    flatList.forEach((item) => {
      map[item.MENU_CD] = { ...item, children: [] };
    });

    // Build tree
    flatList.forEach((item) => {
      const node = map[item.MENU_CD];
      if (item.PRNT_MENU_CD && map[item.PRNT_MENU_CD]) {
        map[item.PRNT_MENU_CD].children!.push(node);
      } else {
        tree.push(node);
      }
    });

    return tree;
  }

  async getMenusByRole(roleId: string): Promise<Menu[]> {
    const pool = await getPool();
    const request = pool.request();

    request.input("roleId", sql.VarChar, roleId);

    const result = await request.query<Menu>(`
      SELECT m.*
      FROM TB_SYS_MENU m
      INNER JOIN TB_SYS_ROLE_MENU rm ON m.MENU_CD = rm.MENU_CD
      WHERE rm.ROLE_ID = @roleId
        AND m.DEL_YN = 'N'
        AND m.USE_YN = 'Y'
      ORDER BY m.MENU_LVL, m.SORT_NO
    `);

    return result.recordset;
  }

  async updateMenuOrder(
    menus: { menuCd: string; sortNo: number }[],
    userId: string,
  ): Promise<void> {
    const pool = await getPool();

    for (const menu of menus) {
      const request = pool.request();
      request.input("menuCd", sql.VarChar, menu.menuCd);
      request.input("sortNo", sql.Int, menu.sortNo);
      request.input("updId", sql.VarChar, userId);

      await request.query(`
        UPDATE TB_SYS_MENU
        SET SORT_NO = @sortNo,
            UPD_ID = @updId,
            UPD_DT = GETDATE()
        WHERE MENU_CD = @menuCd
      `);
    }
  }
}

export default new MenuRepository();
```
