import { Router } from "express";
import { createInvoice, getInvoices, getInvoiceById, sendInvoicePdf } from "../controllers/invoice.controller";
import { authenticateJWT } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/rbac.middleware";

const router = Router();

router.use(authenticateJWT);

router.post("/", requireRole(["VENDOR"]), createInvoice);
router.get("/", requireRole(["ADMIN", "PROCUREMENT_OFFICER", "MANAGER", "VENDOR"]), getInvoices);
router.get("/:id", requireRole(["ADMIN", "PROCUREMENT_OFFICER", "MANAGER", "VENDOR"]), getInvoiceById);
router.post("/:id/send-pdf", requireRole(["ADMIN", "PROCUREMENT_OFFICER", "VENDOR"]), sendInvoicePdf);

export default router;
