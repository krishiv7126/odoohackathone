import { Router } from "express";
import { getDashboardStats, getReportsData, exportExecutiveReport } from "../controllers/analytics.controller";
import { authenticateJWT } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/rbac.middleware";

const router = Router();

router.use(authenticateJWT);

router.get("/dashboard", getDashboardStats);
router.get("/reports", requireRole(["ADMIN", "PROCUREMENT_OFFICER", "MANAGER"]), getReportsData);
router.get("/export-report", requireRole(["ADMIN", "PROCUREMENT_OFFICER", "MANAGER"]), exportExecutiveReport);

export default router;
