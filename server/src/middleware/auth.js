import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { attachProfileCompletion, getProfileCompletionState } from "../utils/profileCompletion.js";
import { getCompanyAccountId, getCompanyRole } from "../utils/companyAccess.js";

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.isSuspended) {
      return res.status(403).json({
        message: user.suspensionReason
          ? `Account suspended: ${user.suspensionReason}`
          : "Account suspended"
      });
    }

    req.user = attachProfileCompletion(user);

    if (req.user.userType === "company") {
      req.companyContext = {
        companyId: getCompanyAccountId(req.user),
        role: getCompanyRole(req.user)
      };
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const requireRole = (role) => (req, res, next) => {
  if (req.user.userType !== role) {
    return res.status(403).json({ message: "Forbidden" });
  }

  return next();
};

export const requireCompletedProfile = (req, res, next) => {
  const completion = getProfileCompletionState(req.user);

  if (completion.profileCompleted) {
    return next();
  }

  return res.status(403).json({
    code: "PROFILE_INCOMPLETE",
    message: "Complete your profile before using this feature",
    ...completion
  });
};

export const requireCompanyRoles = (...roles) => (req, res, next) => {
  if (req.user?.userType !== "company") {
    return res.status(403).json({ message: "Company access required" });
  }

  const role = req.companyContext?.role || "owner";
  if (!roles.includes(role)) {
    return res.status(403).json({ message: "Insufficient company permissions" });
  }

  return next();
};
