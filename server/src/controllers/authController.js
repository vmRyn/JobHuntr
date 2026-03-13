import User from "../models/User.js";
import createToken from "../utils/createToken.js";
import {
  buildEmailVerificationEmail,
  buildPasswordResetEmail,
  buildTwoFactorCodeEmail
} from "../utils/emailTemplates.js";
import { sendTransactionalEmail } from "../utils/mailer.js";
import { attachProfileCompletion } from "../utils/profileCompletion.js";
import {
  expiresInMinutes,
  generateNumericCode,
  generateToken,
  hashToken,
  isExpired
} from "../utils/securityTokens.js";

const parseSkills = (skills) => {
  if (Array.isArray(skills)) return skills;
  if (typeof skills === "string") {
    const trimmed = skills.trim();

    if (!trimmed) {
      return [];
    }

    if (trimmed.startsWith("[")) {
      try {
        const parsedSkills = JSON.parse(trimmed);
        if (Array.isArray(parsedSkills)) {
          return parsedSkills.map((skill) => skill.trim()).filter(Boolean);
        }
      } catch (error) {
        // Fall back to comma-separated parsing.
      }
    }

    return skills
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);
  }
  return [];
};

const isNonProduction = process.env.NODE_ENV !== "production";
const appName = String(process.env.APP_NAME || "JobHuntr").trim() || "JobHuntr";
const clientAppUrl = String(process.env.CLIENT_URL || "http://localhost:5173").trim();

const buildClientUrl = (path, query = {}) => {
  const safeBase = clientAppUrl || "http://localhost:5173";
  const normalizedBase = safeBase.endsWith("/") ? safeBase : `${safeBase}/`;
  const normalizedPath = String(path || "").replace(/^\/+/, "");

  const url = new URL(normalizedPath, normalizedBase);

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    const normalizedValue = String(value).trim();
    if (!normalizedValue) {
      return;
    }

    url.searchParams.set(key, normalizedValue);
  });

  return url.toString();
};

const sendAuthEmail = async ({ to, message, context }) => {
  try {
    return await sendTransactionalEmail({
      to,
      subject: message.subject,
      text: message.text,
      html: message.html
    });
  } catch (error) {
    console.error(`[email:${context}] Failed to send transactional email`, error);
    return {
      delivered: false,
      reason: "send_failed"
    };
  }
};

const clearRecoveryState = (user) => {
  user.passwordResetTokenHash = "";
  user.passwordResetExpiresAt = null;
};

const clearVerificationState = (user) => {
  user.emailVerificationTokenHash = "";
  user.emailVerificationExpiresAt = null;
};

const clearTwoFactorChallenge = (user) => {
  user.twoFactorCodeHash = "";
  user.twoFactorCodeExpiresAt = null;
  user.twoFactorPendingTokenHash = "";
  user.twoFactorPendingExpiresAt = null;
};

const buildAuthSuccessPayload = async (userId) => {
  const safeUser = await User.findById(userId).select("-password");

  return {
    token: createToken(safeUser),
    user: attachProfileCompletion(safeUser)
  };
};

const issueEmailVerificationToken = (user) => {
  const verificationToken = generateToken(24);
  user.emailVerificationTokenHash = hashToken(verificationToken);
  user.emailVerificationExpiresAt = expiresInMinutes(24 * 60);

  return verificationToken;
};

const issuePasswordResetToken = (user) => {
  const resetToken = generateToken(24);
  user.passwordResetTokenHash = hashToken(resetToken);
  user.passwordResetExpiresAt = expiresInMinutes(30);

  return resetToken;
};

const issueTwoFactorChallenge = (user) => {
  const challengeCode = generateNumericCode(6);
  const pendingToken = generateToken(24);

  user.twoFactorCodeHash = hashToken(challengeCode);
  user.twoFactorCodeExpiresAt = expiresInMinutes(10);
  user.twoFactorPendingTokenHash = hashToken(pendingToken);
  user.twoFactorPendingExpiresAt = expiresInMinutes(10);

  return {
    challengeCode,
    pendingToken
  };
};

export const register = async (req, res) => {
  try {
    const {
      userType,
      email,
      password,
      name,
      bio,
      skills,
      industryField,
      experience,
      location,
      profilePicture,
      companyName,
      description,
      industry,
      logo
    } = req.body;

    if (!userType || !email || !password) {
      return res.status(400).json({ message: "userType, email, and password are required" });
    }

    if (!["seeker", "company"].includes(userType)) {
      return res.status(400).json({ message: "Invalid userType" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const payload = {
      userType,
      email: email.toLowerCase(),
      password,
      isEmailVerified: false
    };

    if (userType === "seeker") {
      payload.seekerProfile = {
        name: name || "",
        bio: bio || "",
        skills: parseSkills(skills),
        industryField: industryField || experience || "",
        experience: experience || "",
        location: location || "",
        profilePicture: profilePicture || ""
      };
    }

    if (userType === "company") {
      payload.companyProfile = {
        companyName: companyName || "",
        description: description || "",
        industry: industry || "",
        logo: logo || ""
      };

      payload.companyAccess = {
        companyAccount: null,
        role: "owner"
      };
    }

    const user = await User.create(payload);
    const verificationToken = issueEmailVerificationToken(user);
    await user.save();

    const verifyUrl = buildClientUrl("verify-email", { token: verificationToken });
    await sendAuthEmail({
      to: user.email,
      message: buildEmailVerificationEmail({
        appName,
        verifyUrl,
        expiresHours: 24
      }),
      context: "register_verification"
    });

    const authPayload = await buildAuthSuccessPayload(user._id);

    return res.status(201).json({
      ...authPayload,
      emailVerificationRequired: true,
      ...(isNonProduction
        ? {
            emailVerificationPreviewToken: verificationToken
          }
        : {})
    });
  } catch (error) {
    return res.status(500).json({ message: "Registration failed" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password +twoFactorCodeHash +twoFactorCodeExpiresAt +twoFactorPendingTokenHash +twoFactorPendingExpiresAt"
    );

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isValidPassword = await user.comparePassword(password);

    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.isSuspended) {
      return res.status(403).json({
        message: user.suspensionReason
          ? `Account suspended: ${user.suspensionReason}`
          : "Account suspended"
      });
    }

    if (user.twoFactorEnabled) {
      const { challengeCode, pendingToken } = issueTwoFactorChallenge(user);
      await user.save();

      await sendAuthEmail({
        to: user.email,
        message: buildTwoFactorCodeEmail({
          appName,
          code: challengeCode,
          expiresMinutes: 10
        }),
        context: "login_two_factor"
      });

      return res.status(202).json({
        requiresTwoFactor: true,
        twoFactorPendingToken: pendingToken,
        message: "Two-factor authentication required",
        ...(isNonProduction
          ? {
              twoFactorPreviewCode: challengeCode
            }
          : {})
      });
    }

    const authPayload = await buildAuthSuccessPayload(user._id);

    return res.json(authPayload);
  } catch (error) {
    return res.status(500).json({ message: "Login failed" });
  }
};

export const verifyLoginTwoFactor = async (req, res) => {
  try {
    const pendingToken = String(req.body?.pendingToken || "").trim();
    const code = String(req.body?.code || "").trim();

    if (!pendingToken || !code) {
      return res.status(400).json({ message: "pendingToken and code are required" });
    }

    const user = await User.findOne({
      twoFactorPendingTokenHash: hashToken(pendingToken)
    }).select(
      "+twoFactorCodeHash +twoFactorCodeExpiresAt +twoFactorPendingTokenHash +twoFactorPendingExpiresAt"
    );

    if (!user || isExpired(user.twoFactorPendingExpiresAt) || isExpired(user.twoFactorCodeExpiresAt)) {
      return res.status(401).json({ message: "Two-factor challenge expired" });
    }

    if (hashToken(code) !== user.twoFactorCodeHash) {
      return res.status(401).json({ message: "Invalid two-factor code" });
    }

    clearTwoFactorChallenge(user);
    await user.save();

    const authPayload = await buildAuthSuccessPayload(user._id);

    return res.json(authPayload);
  } catch (error) {
    return res.status(500).json({ message: "Two-factor verification failed" });
  }
};

export const requestPasswordReset = async (req, res) => {
  try {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email }).select(
      "+passwordResetTokenHash +passwordResetExpiresAt"
    );

    let resetToken = "";
    if (user) {
      resetToken = issuePasswordResetToken(user);
      await user.save();

      const resetUrl = buildClientUrl("reset-password", { token: resetToken });
      await sendAuthEmail({
        to: user.email,
        message: buildPasswordResetEmail({
          appName,
          resetUrl,
          expiresMinutes: 30
        }),
        context: "password_reset"
      });
    }

    return res.json({
      message: "If an account exists for that email, a reset link has been created.",
      ...(isNonProduction && user
        ? {
            passwordResetPreviewToken: resetToken
          }
        : {})
    });
  } catch (error) {
    return res.status(500).json({ message: "Could not start password reset" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    const newPassword = String(req.body?.newPassword || "").trim();

    if (!token || !newPassword) {
      return res.status(400).json({ message: "token and newPassword are required" });
    }

    const user = await User.findOne({
      passwordResetTokenHash: hashToken(token)
    }).select("+passwordResetTokenHash +passwordResetExpiresAt +password");

    if (!user || isExpired(user.passwordResetExpiresAt)) {
      return res.status(400).json({ message: "Password reset token is invalid or expired" });
    }

    user.password = newPassword;
    user.lastPasswordChangedAt = new Date();
    clearRecoveryState(user);
    clearTwoFactorChallenge(user);
    await user.save();

    return res.json({ message: "Password updated successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Could not reset password" });
  }
};

export const changePassword = async (req, res) => {
  try {
    const currentPassword = String(req.body?.currentPassword || "");
    const newPassword = String(req.body?.newPassword || "");

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "currentPassword and newPassword are required" });
    }

    const user = await User.findById(req.user._id).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    user.password = newPassword;
    user.lastPasswordChangedAt = new Date();
    clearRecoveryState(user);
    await user.save();

    return res.json({ message: "Password changed successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Could not change password" });
  }
};

export const requestEmailVerification = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "+emailVerificationTokenHash +emailVerificationExpiresAt isEmailVerified"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isEmailVerified) {
      return res.json({ message: "Email is already verified" });
    }

    const verificationToken = issueEmailVerificationToken(user);
    await user.save();

    const verifyUrl = buildClientUrl("verify-email", { token: verificationToken });
    await sendAuthEmail({
      to: user.email,
      message: buildEmailVerificationEmail({
        appName,
        verifyUrl,
        expiresHours: 24
      }),
      context: "verification_request"
    });

    return res.json({
      message: "Verification email sent",
      ...(isNonProduction
        ? {
            emailVerificationPreviewToken: verificationToken
          }
        : {})
    });
  } catch (error) {
    return res.status(500).json({ message: "Could not request email verification" });
  }
};

export const confirmEmailVerification = async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    if (!token) {
      return res.status(400).json({ message: "Verification token is required" });
    }

    const user = await User.findOne({
      emailVerificationTokenHash: hashToken(token)
    }).select("+emailVerificationTokenHash +emailVerificationExpiresAt isEmailVerified");

    if (!user || isExpired(user.emailVerificationExpiresAt)) {
      return res.status(400).json({ message: "Verification token is invalid or expired" });
    }

    user.isEmailVerified = true;
    clearVerificationState(user);
    await user.save();

    return res.json({ message: "Email verified successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Could not verify email" });
  }
};

export const requestTwoFactorSetup = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "+twoFactorCodeHash +twoFactorCodeExpiresAt"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const challengeCode = generateNumericCode(6);
    user.twoFactorCodeHash = hashToken(challengeCode);
    user.twoFactorCodeExpiresAt = expiresInMinutes(10);
    await user.save();

    await sendAuthEmail({
      to: user.email,
      message: buildTwoFactorCodeEmail({
        appName,
        code: challengeCode,
        expiresMinutes: 10
      }),
      context: "two_factor_setup"
    });

    return res.json({
      message: "Two-factor setup code sent",
      ...(isNonProduction
        ? {
            twoFactorPreviewCode: challengeCode
          }
        : {})
    });
  } catch (error) {
    return res.status(500).json({ message: "Could not request two-factor setup" });
  }
};

export const enableTwoFactor = async (req, res) => {
  try {
    const code = String(req.body?.code || "").trim();
    if (!code) {
      return res.status(400).json({ message: "Setup code is required" });
    }

    const user = await User.findById(req.user._id).select(
      "+twoFactorCodeHash +twoFactorCodeExpiresAt"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (isExpired(user.twoFactorCodeExpiresAt) || hashToken(code) !== user.twoFactorCodeHash) {
      return res.status(400).json({ message: "Setup code is invalid or expired" });
    }

    user.twoFactorEnabled = true;
    clearTwoFactorChallenge(user);
    await user.save();

    return res.json({ message: "Two-factor authentication enabled" });
  } catch (error) {
    return res.status(500).json({ message: "Could not enable two-factor authentication" });
  }
};

export const disableTwoFactor = async (req, res) => {
  try {
    const currentPassword = String(req.body?.currentPassword || "");

    if (!currentPassword) {
      return res.status(400).json({ message: "currentPassword is required" });
    }

    const user = await User.findById(req.user._id).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    user.twoFactorEnabled = false;
    clearTwoFactorChallenge(user);
    await user.save();

    return res.json({ message: "Two-factor authentication disabled" });
  } catch (error) {
    return res.status(500).json({ message: "Could not disable two-factor authentication" });
  }
};

export const getMe = async (req, res) => {
  return res.json(attachProfileCompletion(req.user));
};
