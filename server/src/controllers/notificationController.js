import Notification from "../models/Notification.js";

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
