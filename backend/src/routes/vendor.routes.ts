import { Router } from "express";
import { getVendors, getVendorById, createVendor, updateVendor, updateVendorStatus, getVendorScorecard } from "../controllers/vendor.controller";
import { authenticateJWT } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/rbac.middleware";

const router = Router();

router.use(authenticateJWT);

router.get("/:id/scorecard", requireRole(["ADMIN", "PROCUREMENT_OFFICER", "MANAGER", "VENDOR"]), getVendorScorecard);
router.get("/", requireRole(["ADMIN", "PROCUREMENT_OFFICER", "MANAGER"]), getVendors);
router.get("/:id", requireRole(["ADMIN", "PROCUREMENT_OFFICER", "MANAGER", "VENDOR"]), getVendorById);
router.post("/", requireRole(["ADMIN", "PROCUREMENT_OFFICER"]), createVendor);
router.put("/:id", requireRole(["ADMIN", "PROCUREMENT_OFFICER", "VENDOR"]), updateVendor);
router.patch("/:id/status", requireRole(["ADMIN", "MANAGER"]), updateVendorStatus);

export default router;
