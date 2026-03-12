import Appeal from "../models/Appeal.js";
import User from "../models/User.js";

export const submitSuspensionAppeal = async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const appealReason = String(req.body?.appealReason || "").trim();

    if (!email || !appealReason) {
      return res.status(400).json({ message: "email and appealReason are required" });
    }

    const user = await User.findOne({ email }).select(
      "_id email userType isSuspended suspensionReason"
    );

    if (!user || !user.isSuspended) {
      return res.status(400).json({ message: "No suspended account found for that email" });
    }

    const existingOpenAppeal = await Appeal.findOne({
      email,
      status: "pending"
    }).select("_id");

    if (existingOpenAppeal) {
      return res.status(409).json({ message: "An appeal is already pending for this account" });
    }

    const appeal = await Appeal.create({
      appellant: user._id,
      email: user.email,
      userType: user.userType,
      suspensionReasonSnapshot: user.suspensionReason || "",
      appealReason,
      sourceType: "public",
      status: "pending"
    });

    return res.status(201).json({
      data: {
        id: String(appeal._id),
        status: appeal.status,
        createdAt: appeal.createdAt
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to submit appeal" });
  }
};

export const submitAuthenticatedAppeal = async (req, res) => {
  try {
    const appealReason = String(req.body?.appealReason || "").trim();

    if (!appealReason) {
      return res.status(400).json({ message: "appealReason is required" });
    }

    const user = await User.findById(req.user._id).select(
      "_id email userType isSuspended suspensionReason"
    );

    if (!user || !user.isSuspended) {
      return res.status(400).json({ message: "Only suspended users can submit appeals" });
    }

    const existingOpenAppeal = await Appeal.findOne({
      appellant: user._id,
      status: "pending"
    }).select("_id");

    if (existingOpenAppeal) {
      return res.status(409).json({ message: "An appeal is already pending for your account" });
    }

    const appeal = await Appeal.create({
      appellant: user._id,
      email: user.email,
      userType: user.userType,
      suspensionReasonSnapshot: user.suspensionReason || "",
      appealReason,
      sourceType: "authenticated",
      status: "pending"
    });

    return res.status(201).json({
      data: {
        id: String(appeal._id),
        status: appeal.status,
        createdAt: appeal.createdAt
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to submit appeal" });
  }
};
