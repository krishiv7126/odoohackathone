import { Router } from "express";
import { getPOs, getPOById, sendPO } from "../controllers/po.controller";
import { authenticateJWT } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/rbac.middleware";

const router = Router();

router.use(authenticateJWT);

router.get("/", requireRole(["ADMIN", "PROCUREMENT_OFFICER", "MANAGER", "VENDOR"]), getPOs);
router.get("/:id", requireRole(["ADMIN", "PROCUREMENT_OFFICER", "MANAGER", "VENDOR"]), getPOById);
router.post("/:id/send", requireRole(["ADMIN", "PROCUREMENT_OFFICER"]), sendPO);

export default router;
