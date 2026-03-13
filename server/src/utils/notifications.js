import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { getIO } from "../config/socket.js";

export const notificationPreferenceKeys = [
  "interviewUpdates",
  "messages",
  "matches",
  "moderation",
  "offers",
  "support",
  "system"
];

export const createDefaultNotificationPreferences = () => ({
  inApp: {
    interviewUpdates: true,
    messages: true,
    matches: true,
    moderation: true,
    offers: true,
    support: true,
    system: true
  },
  email: {
    interviewUpdates: false,
    messages: false,
    matches: false,
    moderation: true,
    offers: true,
    support: true,
    system: true
  },
  push: {
    interviewUpdates: false,
    messages: false,
    matches: false,
    moderation: false,
    offers: false,
    support: false,
    system: false
  }
});

const notificationTypeToPreferenceKey = {
  interview_scheduled: "interviewUpdates",
  interview_updated: "interviewUpdates",
  interview_response: "interviewUpdates",
  new_message: "messages",
  match_created: "matches",
  moderation_action: "moderation",
  offer_created: "offers",
  offer_updated: "offers",
  support_ticket_update: "support",
  system: "system"
};

const isChannelEnabled = (preferences, channel, key) => {
  if (!preferences || !key) {
    return false;
  }

  const channelConfig = preferences[channel];
  if (!channelConfig || typeof channelConfig !== "object") {
    return false;
  }

  return Boolean(channelConfig[key]);
};

const emitNotification = (userId, payload) => {
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit("notificationCreated", payload);
  } catch (socketError) {
    // Socket may not be initialized in some test contexts.
  }
};

export const notifyUser = async ({
  userId,
  type,
  title,
  message,
  metadata = {},
  forceInApp = false
}) => {
  if (!userId || !type || !title || !message) {
    return {
      notification: null,
      unreadCount: 0,
      channels: {
        inApp: false,
        email: false,
        push: false
      }
    };
  }

  const user = await User.findById(userId).select("notificationPreferences");
  if (!user) {
    return {
      notification: null,
      unreadCount: 0,
      channels: {
        inApp: false,
        email: false,
        push: false
      }
    };
  }

  const preferenceKey = notificationTypeToPreferenceKey[type] || "system";
  const preferences = user.notificationPreferences || createDefaultNotificationPreferences();

  const channels = {
    inApp: forceInApp || isChannelEnabled(preferences, "inApp", preferenceKey),
    email: isChannelEnabled(preferences, "email", preferenceKey),
    push: isChannelEnabled(preferences, "push", preferenceKey)
  };

  let notification = null;
  let unreadCount = 0;

  if (channels.inApp) {
    notification = await Notification.create({
      user: user._id,
      type,
      title,
      message,
      company: metadata.companyId || null,
      companyName: metadata.companyName || "",
      job: metadata.jobId || null,
      jobTitle: metadata.jobTitle || "",
      match: metadata.matchId || null,
      interviewId: metadata.interviewId || null,
      interviewAt: metadata.interviewAt || null,
      location: metadata.location || "",
      metadata
    });

    unreadCount = await Notification.countDocuments({
      user: user._id,
      isRead: false
    });

    emitNotification(user._id.toString(), {
      notification,
      unreadCount
    });
  }

  return {
    notification,
    unreadCount,
    channels
  };
};
