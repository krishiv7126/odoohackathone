import { Router } from "express";
import { getNotifications, markAsRead, markAllAsRead } from "../controllers/notification.controller";
import { authenticateJWT } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticateJWT);

router.get("/", getNotifications);
router.patch("/:id/read", markAsRead);
router.post("/read-all", markAllAsRead);

export default router;
