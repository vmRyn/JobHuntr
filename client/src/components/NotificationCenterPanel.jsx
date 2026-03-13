import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import Button from "./ui/Button";
import Card from "./ui/Card";
import SelectField from "./ui/SelectField";

const preferenceRows = [
  { key: "interviewUpdates", label: "Interview updates" },
  { key: "messages", label: "Messages" },
  { key: "matches", label: "Matches" },
  { key: "offers", label: "Offers" },
  { key: "moderation", label: "Moderation" },
  { key: "support", label: "Support" },
  { key: "system", label: "System" }
];

const notificationTypeOptions = [
  { value: "", label: "All" },
  { value: "interview_scheduled", label: "Interview scheduled" },
  { value: "interview_updated", label: "Interview updated" },
  { value: "interview_response", label: "Interview response" },
  { value: "new_message", label: "Messages" },
  { value: "match_created", label: "New matches" },
  { value: "offer_created", label: "Offer created" },
  { value: "offer_updated", label: "Offer updated" },
  { value: "moderation_action", label: "Moderation actions" },
  { value: "support_ticket_update", label: "Support updates" },
  { value: "system", label: "System" }
];

const createDefaultPreferences = () => ({
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

const toLocalDateTime = (value) => {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short"
  });
};

const getErrorMessage = (requestError, fallback) =>
  requestError?.response?.data?.message || fallback;

const NotificationCenterPanel = ({ disabledReason = "" }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState(createDefaultPreferences());
  const [loading, setLoading] = useState(true);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [filterType, setFilterType] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const canInteract = !disabledReason;

  const preferenceCompletion = useMemo(() => {
    const channels = ["inApp", "email", "push"];
    const total = channels.length * preferenceRows.length;
    let enabled = 0;

    channels.forEach((channel) => {
      preferenceRows.forEach((row) => {
        if (preferences?.[channel]?.[row.key]) {
          enabled += 1;
        }
      });
    });

    return `${enabled}/${total} enabled`;
  }, [preferences]);

  const loadNotifications = async (nextFilterType = filterType) => {
    if (!canInteract) {
      setLoading(false);
      return;
    }

    try {
      const [{ data: notificationsData }, { data: preferencesData }] = await Promise.all([
        api.get("/notifications", {
          params: {
            type: nextFilterType || undefined,
            limit: 40
          }
        }),
        api.get("/notifications/preferences")
      ]);

      setNotifications(notificationsData.notifications || []);
      setUnreadCount(notificationsData.unreadCount || 0);
      setPreferences(preferencesData.preferences || createDefaultPreferences());
      setError("");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Failed to load notification center"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadNotifications(filterType);
  }, [filterType, canInteract]);

  const updatePreference = (channel, key, checked) => {
    setPreferences((prev) => ({
      ...prev,
      [channel]: {
        ...(prev?.[channel] || {}),
        [key]: checked
      }
    }));
  };

  const handleSavePreferences = async () => {
    if (!canInteract) return;

    setSavingPreferences(true);
    setNotice("");
    setError("");

    try {
      const { data } = await api.put("/notifications/preferences", { preferences });
      setPreferences(data.preferences || createDefaultPreferences());
      setNotice("Notification preferences saved.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not save notification preferences"));
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleMarkRead = async (notificationId) => {
    if (!notificationId || !canInteract) return;

    try {
      const { data } = await api.patch(`/notifications/${notificationId}/read`);

      setNotifications((prev) =>
        prev.map((notification) =>
          notification._id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );
      setUnreadCount(
        typeof data?.unreadCount === "number" ? data.unreadCount : Math.max(unreadCount - 1, 0)
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Failed to mark notification as read"));
    }
  };

  const handleMarkAllRead = async () => {
    if (!canInteract || !unreadCount || markingAllRead) {
      return;
    }

    setMarkingAllRead(true);
    setError("");

    try {
      await api.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((notification) => ({ ...notification, isRead: true })));
      setUnreadCount(0);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Failed to mark notifications as read"));
    } finally {
      setMarkingAllRead(false);
    }
  };

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Notifications</p>
          <h3 className="font-display text-xl text-slate-50">Events and preferences</h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="chip chip-accent normal-case tracking-normal">{unreadCount} unread</span>
          <Button type="button" size="sm" variant="ghost" onClick={() => loadNotifications(filterType)}>
            Refresh
          </Button>
        </div>
      </div>

      {disabledReason && <p className="empty-state">{disabledReason}</p>}

      {!disabledReason && (
        <>
          <div className="surface-subtle space-y-3 p-4">
            <div className="flex flex-wrap items-end gap-2">
              <SelectField
                className="w-full sm:w-72"
                label="Filter"
                name="notificationType"
                value={filterType}
                onChange={(event) => setFilterType(event.target.value)}
                options={notificationTypeOptions}
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!unreadCount || markingAllRead}
                onClick={handleMarkAllRead}
              >
                {markingAllRead ? "Updating..." : "Mark all read"}
              </Button>
            </div>

            {loading && <p className="text-sm text-slate-300">Loading notifications...</p>}

            {!loading && !notifications.length && (
              <div className="empty-state">No notifications for this filter yet.</div>
            )}

            {!loading && notifications.length > 0 && (
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`rounded-2xl border px-3 py-3 ${
                      notification.isRead
                        ? "border-white/10 bg-slate-900/55"
                        : "border-brandStrong/35 bg-brand/10"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-50">{notification.title}</p>
                        <p className="text-xs text-slate-200">{notification.message}</p>
                        <p className="text-[11px] text-slate-400">{toLocalDateTime(notification.createdAt)}</p>
                      </div>

                      {!notification.isRead && (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => handleMarkRead(notification._id)}
                        >
                          Mark read
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="surface-subtle space-y-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-100">Preference matrix</p>
              <span className="chip normal-case tracking-normal">{preferenceCompletion}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[540px] text-left text-xs text-slate-200">
                <thead>
                  <tr className="text-slate-400">
                    <th className="py-2 pr-3 font-semibold uppercase tracking-[0.14em]">Event</th>
                    <th className="py-2 pr-3 font-semibold uppercase tracking-[0.14em]">In-app</th>
                    <th className="py-2 pr-3 font-semibold uppercase tracking-[0.14em]">Email</th>
                    <th className="py-2 pr-3 font-semibold uppercase tracking-[0.14em]">Push</th>
                  </tr>
                </thead>
                <tbody>
                  {preferenceRows.map((row) => (
                    <tr key={row.key} className="border-t border-white/10">
                      <td className="py-2 pr-3 text-sm text-slate-100">{row.label}</td>
                      {["inApp", "email", "push"].map((channel) => (
                        <td key={`${row.key}-${channel}`} className="py-2 pr-3">
                          <input
                            type="checkbox"
                            checked={Boolean(preferences?.[channel]?.[row.key])}
                            onChange={(event) => updatePreference(channel, row.key, event.target.checked)}
                            className="h-4 w-4 rounded border border-slate-500 bg-slate-900/90 accent-cyan-400"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                disabled={savingPreferences}
                onClick={handleSavePreferences}
              >
                {savingPreferences ? "Saving..." : "Save preferences"}
              </Button>
            </div>
          </div>
        </>
      )}

      {notice && <p className="status-success">{notice}</p>}
      {error && <p className="status-error">{error}</p>}
    </Card>
  );
};

export default NotificationCenterPanel;
