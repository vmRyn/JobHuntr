import { Router } from "express";
import {
	changePassword,
	confirmEmailVerification,
	disableTwoFactor,
	enableTwoFactor,
	getMe,
	login,
	register,
	requestEmailVerification,
	requestPasswordReset,
	requestTwoFactorSetup,
	resetPassword,
	verifyLoginTwoFactor
} from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/login/2fa", verifyLoginTwoFactor);
router.post("/forgot-password", requestPasswordReset);
router.post("/reset-password", resetPassword);
router.post("/verify-email", confirmEmailVerification);

router.get("/me", protect, getMe);
router.post("/change-password", protect, changePassword);
router.post("/verify-email/request", protect, requestEmailVerification);
router.post("/2fa/request", protect, requestTwoFactorSetup);
router.post("/2fa/enable", protect, enableTwoFactor);
router.post("/2fa/disable", protect, disableTwoFactor);

export default router;
