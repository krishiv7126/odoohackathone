import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth.middleware";

export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized: User session not found" });
    }

    if (!allowedRoles.includes(req.user.roleName)) {
      return res.status(403).json({
        message: `Forbidden: Access restricted to [${allowedRoles.join(", ")}] roles. Your role is: ${req.user.roleName}`
      });
    }

    next();
  };
}
