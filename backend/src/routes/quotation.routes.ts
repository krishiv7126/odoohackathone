import { Router } from "express";
import { submitQuotation, getQuotations, getQuotationById, getCompareQuotations } from "../controllers/quotation.controller";
import { authenticateJWT } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/rbac.middleware";

const router = Router();

router.use(authenticateJWT);

router.post("/", requireRole(["VENDOR"]), submitQuotation);
router.get("/", requireRole(["ADMIN", "PROCUREMENT_OFFICER", "MANAGER", "VENDOR"]), getQuotations);
router.get("/:id", requireRole(["ADMIN", "PROCUREMENT_OFFICER", "MANAGER", "VENDOR"]), getQuotationById);
router.get("/compare/:rfqId", requireRole(["ADMIN", "PROCUREMENT_OFFICER", "MANAGER"]), getCompareQuotations);

export default router;
