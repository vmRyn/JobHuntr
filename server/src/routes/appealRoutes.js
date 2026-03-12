import { Router } from "express";
import {
  submitAuthenticatedAppeal,
  submitSuspensionAppeal
} from "../controllers/appealController.js";
import { createUserActionRateLimiter } from "../middleware/abuseRateLimit.js";
import { protect } from "../middleware/auth.js";

const router = Router();

const publicAppealLimiter = createUserActionRateLimiter({
  keyPrefix: "appeal-public",
  limit: 4,
  windowMs: 15 * 60 * 1000,
  message: "Too many appeal attempts. Please try again later."
});

router.post("/", publicAppealLimiter, submitSuspensionAppeal);
router.post(
  "/me",
  protect,
  publicAppealLimiter,
  submitAuthenticatedAppeal
);

export default router;
