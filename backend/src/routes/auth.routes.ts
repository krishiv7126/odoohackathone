import { Router } from "express";
import { login, register, getMe, logout, registerPublic } from "../controllers/auth.controller";
import { authenticateJWT } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/rbac.middleware";
import { upload } from "../middlewares/upload.middleware";

const router = Router();

router.post("/login", login);
router.post("/register", authenticateJWT, requireRole(["ADMIN"]), register);
router.post("/register-public", upload.single("profilePhoto"), registerPublic);
router.get("/me", authenticateJWT, getMe);
router.post("/logout", authenticateJWT, logout);

export default router;
