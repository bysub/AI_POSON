import type { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Express 4 async 라우트 핸들러 래퍼.
 * async 핸들러에서 발생한 에러를 자동으로 next()에 전달하여
 * Express 글로벌 에러 핸들러(errorHandler)가 처리하도록 보장한다.
 *
 * @example
 * router.get("/items", asyncHandler(async (req, res) => {
 *   const items = await prisma.item.findMany();
 *   res.json({ success: true, data: items });
 * }));
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
