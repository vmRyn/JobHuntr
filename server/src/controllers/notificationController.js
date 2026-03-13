import Notification from "../models/Notification.js";
import User from "../models/User.js";
import {
  createDefaultNotificationPreferences,
  notificationPreferenceKeys
} from "../utils/notifications.js";

const parseLimit = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 25;
  return Math.min(Math.max(parsed, 1), 100);
};

export const getMyNotifications = async (req, res) => {
  try {
    const query = { user: req.user._id };
    const type = typeof req.query?.type === "string" ? req.query.type.trim() : "";

    if (type) {
      query.type = type;
    }

    const limit = parseLimit(req.query?.limit);

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).limit(limit),
      Notification.countDocuments({ ...query, isRead: false })
    ]);

    return res.json({ notifications, unreadCount });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load notifications" });
  }
};

export const getMyNotificationPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("notificationPreferences");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      preferences: user.notificationPreferences || createDefaultNotificationPreferences()
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load notification preferences" });
  }
};

export const updateMyNotificationPreferences = async (req, res) => {
  try {
    const input = req.body?.preferences;
    if (!input || typeof input !== "object") {
      return res.status(400).json({ message: "preferences object is required" });
    }

    const user = await User.findById(req.user._id).select("notificationPreferences");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const current = user.notificationPreferences || createDefaultNotificationPreferences();
    const next = {
      ...current,
      inApp: { ...current.inApp },
      email: { ...current.email },
      push: { ...current.push }
    };

    ["inApp", "email", "push"].forEach((channel) => {
      if (!input[channel] || typeof input[channel] !== "object") {
        return;
      }

      notificationPreferenceKeys.forEach((key) => {
        if (input[channel][key] === undefined) {
          return;
        }

        next[channel][key] = Boolean(input[channel][key]);
      });
    });

    user.notificationPreferences = next;
    await user.save();

    return res.json({ preferences: user.notificationPreferences });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update notification preferences" });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.notificationId, user: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    const unreadCount = await Notification.countDocuments({
      user: req.user._id,
      isRead: false
    });

    return res.json({ notification, unreadCount });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update notification" });
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );

    return res.json({ unreadCount: 0 });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update notifications" });
  }
};
