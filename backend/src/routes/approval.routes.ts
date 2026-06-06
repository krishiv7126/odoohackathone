import { Router } from "express";
import { getPendingApprovals, processApproval } from "../controllers/approval.controller";
import { authenticateJWT } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/rbac.middleware";

const router = Router();

router.use(authenticateJWT);

router.get("/", requireRole(["ADMIN", "MANAGER"]), getPendingApprovals);
router.post("/", requireRole(["ADMIN", "MANAGER"]), processApproval);

export default router;
