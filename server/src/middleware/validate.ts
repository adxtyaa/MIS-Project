import { Request, Response, NextFunction } from "express";

export function validateBody(requiredFields: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missing = requiredFields.filter((field) => {
      const value = req.body[field];
      return value === undefined || value === null || value === "";
    });

    if (missing.length > 0) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: `Missing required fields: ${missing.join(", ")}`,
        },
      });
      return;
    }

    next();
  };
}
