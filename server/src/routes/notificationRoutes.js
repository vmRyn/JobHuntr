import { Router } from "express";
import {
  getMyNotificationPreferences,
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  updateMyNotificationPreferences
} from "../controllers/notificationController.js";
import { protect, requireCompletedProfile } from "../middleware/auth.js";

const router = Router();

router.use(protect, requireCompletedProfile);

router.get("/", getMyNotifications);
router.get("/preferences", getMyNotificationPreferences);
router.put("/preferences", updateMyNotificationPreferences);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:notificationId/read", markNotificationRead);

export default router;
