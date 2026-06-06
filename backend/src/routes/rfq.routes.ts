import { Router } from "express";
import { getRfqs, getRfqById, createRfq, assignVendors, sendRfq, uploadAttachment } from "../controllers/rfq.controller";
import { authenticateJWT } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/rbac.middleware";
import { upload } from "../middlewares/upload.middleware";

const router = Router();

router.use(authenticateJWT);

router.get("/", requireRole(["ADMIN", "PROCUREMENT_OFFICER", "MANAGER", "VENDOR"]), getRfqs);
router.get("/:id", requireRole(["ADMIN", "PROCUREMENT_OFFICER", "MANAGER", "VENDOR"]), getRfqById);
router.post("/", requireRole(["ADMIN", "PROCUREMENT_OFFICER"]), createRfq);
router.post("/:id/assign", requireRole(["ADMIN", "PROCUREMENT_OFFICER"]), assignVendors);
router.post("/:id/send", requireRole(["ADMIN", "PROCUREMENT_OFFICER"]), sendRfq);
router.post("/:id/attachments", requireRole(["ADMIN", "PROCUREMENT_OFFICER"]), upload.single("file"), uploadAttachment);

export default router;
