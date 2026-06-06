import { Router } from "express";
import { getActivityLogs } from "../controllers/log.controller";
import { authenticateJWT } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/rbac.middleware";

const router = Router();

router.get("/", authenticateJWT, requireRole(["ADMIN"]), getActivityLogs);

export default router;
