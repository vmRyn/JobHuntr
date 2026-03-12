import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import api from "../api/client";
import Button from "./ui/Button";
import LoadingSpinner from "./LoadingSpinner";
import { getAssetUrl } from "../utils/assets";
import VerifiedBadge from "./ui/VerifiedBadge";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
const reactionOptions = ["👍", "❤️", "🎉", "🔥", "👀"];

const extractId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id || "";
};

const getName = (user) => {
  if (!user) return "Unknown";
  if (user.userType === "company") return user.companyProfile?.companyName || "Company";
  return user.seekerProfile?.name || "Job Seeker";
};

const getProfileImage = (user) => {
  if (!user) return "";
  if (user.userType === "company") return getAssetUrl(user.companyProfile?.logo);
  return getAssetUrl(user.seekerProfile?.profilePicture);
};

const getInitial = (name = "") => name.trim().charAt(0).toUpperCase() || "?";

const hasBeenReadBy = (message, userId) =>
  Array.isArray(message?.readBy) && message.readBy.some((item) => extractId(item) === userId);

const buildReactionSummary = (reactions = [], currentUserId) => {
  const grouped = new Map();

  reactions.forEach((reaction) => {
    const emoji = reaction?.emoji;
    if (!emoji) return;

    const existing = grouped.get(emoji) || {
      emoji,
      count: 0,
      mine: false
    };

    existing.count += 1;
    if (extractId(reaction?.user) === currentUserId) {
      existing.mine = true;
    }

    grouped.set(emoji, existing);
  });

  return Array.from(grouped.values());
};

const formatFileSize = (size = 0) => {
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const isImageAttachment = (attachment) => attachment?.mimeType?.startsWith("image/");

const formatTimestamp = (value) => {
  if (!value) return "";

  const dateValue = new Date(value);
  if (Number.isNaN(dateValue.getTime())) {
    return "";
  }

  return dateValue.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
};

const formatInterviewWindow = (startAt, endAt, timezone = "UTC") => {
  const parsedStart = startAt ? new Date(startAt) : null;
  const parsedEnd = endAt ? new Date(endAt) : null;

  if (!parsedStart || Number.isNaN(parsedStart.getTime())) {
    return "";
  }

  if (!parsedEnd || Number.isNaN(parsedEnd.getTime())) {
    try {
      return parsedStart.toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: timezone || "UTC"
      });
    } catch (error) {
      return parsedStart.toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short"
      });
    }
  }

  try {
    const startText = parsedStart.toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone || "UTC"
    });
    const endText = parsedEnd.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone || "UTC"
    });

    return `${startText} - ${endText}`;
  } catch (error) {
    const startText = parsedStart.toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short"
    });
    const endText = parsedEnd.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit"
    });

    return `${startText} - ${endText}`;
  }
};

const getSenderLabel = (message, currentUserId, fallbackName) => {
  const senderId = extractId(message?.sender);
  if (senderId && senderId === currentUserId) {
    return "You";
  }

  if (message?.sender && typeof message.sender === "object") {
    return getName(message.sender);
  }

  return fallbackName || "Match";
};

const ChatWindow = ({ selectedMatch, currentUser, headerAction = null }) => {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [reactingMessageId, setReactingMessageId] = useState("");
  const [isCounterpartTyping, setIsCounterpartTyping] = useState(false);
  const [error, setError] = useState("");
  const socketRef = useRef(null);
  const endRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const lastReadSyncRef = useRef(0);

  const selectedMatchId = selectedMatch?._id;

  const counterpart = useMemo(() => {
    if (!selectedMatch || !currentUser) return null;
    const seekerId = extractId(selectedMatch.seeker);
    return currentUser._id === seekerId ? selectedMatch.company : selectedMatch.seeker;
  }, [selectedMatch, currentUser]);

  const counterpartName = getName(counterpart);
  const counterpartImage = getProfileImage(counterpart);
  const counterpartId = extractId(counterpart);
  const counterpartVerified =
    currentUser?.userType === "seeker" && Boolean(counterpart?.companyProfile?.isVerified);

  const markMessagesRead = async (force = false) => {
    if (!selectedMatchId || !currentUser?._id) return;

    const now = Date.now();
    if (!force && now - lastReadSyncRef.current < 800) {
      return;
    }

    lastReadSyncRef.current = now;

    try {
      const { data } = await api.post(`/messages/${selectedMatchId}/read`);
      const messageIds = data?.messageIds || [];

      if (!messageIds.length) {
        return;
      }

      setMessages((prev) =>
        prev.map((message) => {
          if (!messageIds.includes(message._id)) {
            return message;
          }

          const nextReadBy = Array.isArray(message.readBy) ? [...message.readBy] : [];
          const alreadyRead = nextReadBy.some((item) => extractId(item) === currentUser._id);
          if (!alreadyRead) {
            nextReadBy.push(currentUser._id);
          }

          return {
            ...message,
            readBy: nextReadBy
          };
        })
      );
    } catch (requestError) {
      // Read receipts are best-effort and should not block chat interaction.
    }
  };

  const stopTyping = () => {
    window.clearTimeout(typingTimeoutRef.current);

    if (!isTypingRef.current || !socketRef.current || !selectedMatchId) {
      isTypingRef.current = false;
      return;
    }

    socketRef.current.emit("typingStop", { matchId: selectedMatchId });
    isTypingRef.current = false;
  };

  useEffect(() => {
    const token = localStorage.getItem("jobhuntr_token");
    if (!token) return undefined;

    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL, {
        auth: { token }
      });
    }

    const socket = socketRef.current;

    const onNewMessage = (message) => {
      const incomingMatchId = extractId(message.match);
      if (!selectedMatchId || incomingMatchId !== selectedMatchId) {
        return;
      }

      setMessages((prev) => {
        if (prev.some((item) => item._id === message._id)) {
          return prev;
        }
        return [...prev, message];
      });

      if (extractId(message.receiver) === currentUser?._id) {
        markMessagesRead();
      }
    };

    const onTyping = (payload) => {
      if (!payload || payload.matchId !== selectedMatchId) {
        return;
      }

      if (payload.userId !== counterpartId) {
        return;
      }

      setIsCounterpartTyping(Boolean(payload.isTyping));
    };

    const onMessagesRead = (payload) => {
      if (!payload || payload.matchId !== selectedMatchId) {
        return;
      }

      const readUserId = payload.userId;
      const readMessageIds = payload.messageIds || [];
      if (!readUserId || !readMessageIds.length) {
        return;
      }

      setMessages((prev) =>
        prev.map((message) => {
          if (!readMessageIds.includes(message._id)) {
            return message;
          }

          const nextReadBy = Array.isArray(message.readBy) ? [...message.readBy] : [];
          const alreadyRead = nextReadBy.some((item) => extractId(item) === readUserId);

          if (!alreadyRead) {
            nextReadBy.push(readUserId);
          }

          return {
            ...message,
            readBy: nextReadBy
          };
        })
      );
    };

    const onMessageReactionUpdated = (payload) => {
      if (!payload || payload.matchId !== selectedMatchId || !payload.message?._id) {
        return;
      }

      setMessages((prev) =>
        prev.map((message) => (message._id === payload.message._id ? payload.message : message))
      );
    };

    socket.on("newMessage", onNewMessage);
    socket.on("typing", onTyping);
    socket.on("messagesRead", onMessagesRead);
    socket.on("messageReactionUpdated", onMessageReactionUpdated);

    return () => {
      socket.off("newMessage", onNewMessage);
      socket.off("typing", onTyping);
      socket.off("messagesRead", onMessagesRead);
      socket.off("messageReactionUpdated", onMessageReactionUpdated);
    };
  }, [counterpartId, currentUser?._id, selectedMatchId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [isCounterpartTyping, messages, selectedMatchId]);

  useEffect(() => {
    setAttachmentFile(null);
    setIsCounterpartTyping(false);
    stopTyping();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [selectedMatchId]);

  useEffect(() => {
    const loadMessages = async () => {
      if (!selectedMatchId) {
        setMessages([]);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const { data } = await api.get(`/messages/${selectedMatchId}`);
        setMessages(data);

        if (socketRef.current) {
          socketRef.current.emit("joinMatch", selectedMatchId);
        }

        markMessagesRead(true);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Failed to load messages");
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [selectedMatchId]);

  const handleDraftChange = (event) => {
    const value = event.target.value;
    setDraft(value);

    if (!socketRef.current || !selectedMatchId) {
      return;
    }

    if (value.trim()) {
      if (!isTypingRef.current) {
        socketRef.current.emit("typingStart", { matchId: selectedMatchId });
        isTypingRef.current = true;
      }

      window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = window.setTimeout(() => {
        stopTyping();
      }, 1200);
      return;
    }

    stopTyping();
  };

  const handleAttachmentPick = (event) => {
    const file = event.target.files?.[0] || null;
    setAttachmentFile(file);
  };

  const handleRemoveAttachment = () => {
    setAttachmentFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();
    const messageText = draft.trim();

    if (!selectedMatchId || sending || (!messageText && !attachmentFile)) {
      return;
    }

    stopTyping();
    setSending(true);
    setError("");

    try {
      const hasAttachment = Boolean(attachmentFile);
      const payload = hasAttachment ? new FormData() : { text: messageText };

      if (hasAttachment) {
        if (messageText) {
          payload.append("text", messageText);
        }
        payload.append("attachment", attachmentFile);
      }

      const { data } = await api.post(`/messages/${selectedMatchId}`, payload);
      setDraft("");
      setAttachmentFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setMessages((prev) => {
        if (prev.some((item) => item._id === data._id)) {
          return prev;
        }
        return [...prev, data];
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleToggleReaction = async (messageId, emoji) => {
    if (!messageId || !emoji || reactingMessageId) {
      return;
    }

    setReactingMessageId(messageId);

    try {
      const { data } = await api.post(`/messages/${messageId}/reactions`, { emoji });
      if (data?.message?._id) {
        setMessages((prev) =>
          prev.map((message) => (message._id === data.message._id ? data.message : message))
        );
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to update reaction");
    } finally {
      setReactingMessageId("");
    }
  };

  if (!selectedMatch) {
    return (
      <div className="empty-state">
        Select a match to open chat.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="surface-subtle px-4 py-3 text-slate-50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {counterpartImage ? (
              <img
                src={counterpartImage}
                alt={counterpartName}
                className="h-12 w-12 rounded-2xl object-cover ring-1 ring-brandStrong/30"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900/80 text-sm font-semibold text-slate-100 ring-1 ring-brandStrong/25">
                {getInitial(counterpartName)}
              </div>
            )}

            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Chatting with</p>
              <div className="flex items-center gap-2">
                <p className="font-display text-xl text-slate-50">{counterpartName}</p>
                {counterpartVerified && <VerifiedBadge compact />}
              </div>
            </div>
          </div>

          {headerAction}
        </div>
      </div>

      {loading && <LoadingSpinner label="Loading messages" />}

      {!loading && (
        <div
          role="log"
          aria-live="polite"
          aria-relevant="additions text"
          aria-label={`Conversation with ${counterpartName}`}
          className="max-h-[420px] space-y-3 overflow-y-auto rounded-2xl bg-slate-950/72 p-3 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.14)]"
        >
          {!messages.length && <p className="text-sm text-slate-300">No messages yet.</p>}

          {messages.map((message) => {
            const mine = extractId(message.sender) === currentUser?._id;
            const senderLabel = getSenderLabel(message, currentUser?._id, counterpartName);
            const timestamp = formatTimestamp(message.createdAt);
            const reactionSummary = buildReactionSummary(message.reactions, currentUser?._id);
            const attachment = message.attachment;
            const interviewAttachment = message.interviewAttachment;
            const attachmentUrl = getAssetUrl(attachment?.url);
            const messageStatus = mine
              ? hasBeenReadBy(message, counterpartId)
                ? "Seen"
                : "Sent"
              : "";

            return (
              <div key={message._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[84%] space-y-1 ${mine ? "text-right" : "text-left"}`}>
                  <div
                    className={`flex items-center gap-1.5 text-[11px] leading-none ${
                      mine ? "justify-end text-slate-300" : "text-slate-300"
                    }`}
                  >
                    <span className="font-semibold tracking-wide">{senderLabel}</span>
                    {timestamp && <span aria-hidden>•</span>}
                    {timestamp && <time dateTime={message.createdAt}>{timestamp}</time>}
                    {messageStatus && <span aria-hidden>•</span>}
                    {messageStatus && <span>{messageStatus}</span>}
                  </div>

                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      mine
                        ? "bg-gradient-to-r from-brandHot via-brand to-brandStrong text-white shadow-[0_16px_34px_-20px_rgba(124,58,237,0.85)]"
                        : "bg-slate-800/70 text-slate-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
                    }`}
                  >
                    {message.text && <p>{message.text}</p>}

                    {interviewAttachment?.interviewId && (
                      <div
                        className={`${message.text ? "mt-2" : ""} rounded-xl border px-3 py-2 ${
                          mine
                            ? "border-transparent bg-white/12 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                            : "border-transparent bg-brand/16 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.3)]"
                        }`}
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-100">
                          Interview Attached
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-50">
                          {interviewAttachment.title || "Interview"}
                        </p>
                        <p className="text-xs text-slate-100">
                          {interviewAttachment.companyName || "Company"} • {interviewAttachment.jobTitle || "Role"}
                        </p>
                        <p className="mt-1 text-xs text-slate-100">
                          {formatInterviewWindow(
                            interviewAttachment.startAt,
                            interviewAttachment.endAt,
                            interviewAttachment.timezone
                          )}
                        </p>
                        {interviewAttachment.location && (
                          <p className="mt-1 text-xs text-slate-100">
                            Location: {interviewAttachment.location}
                          </p>
                        )}
                        {interviewAttachment.notes && (
                          <p className="mt-1 text-xs leading-relaxed text-slate-200">
                            {interviewAttachment.notes}
                          </p>
                        )}
                      </div>
                    )}

                    {attachmentUrl && (
                      <div className={message.text ? "mt-2" : ""}>
                        {isImageAttachment(attachment) ? (
                          <a href={attachmentUrl} target="_blank" rel="noreferrer">
                            <img
                              src={attachmentUrl}
                              alt={attachment.originalName || "Attachment"}
                              className="max-h-44 rounded-xl object-cover shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                            />
                          </a>
                        ) : (
                          <a
                            href={attachmentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center rounded-xl border border-transparent bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-50 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] hover:bg-slate-700/80"
                          >
                            {attachment.originalName || "Attachment"}
                            {attachment.size ? ` (${formatFileSize(attachment.size)})` : ""}
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  <div className={`flex flex-wrap gap-1 ${mine ? "justify-end" : "justify-start"}`}>
                    {reactionSummary.map((reaction) => (
                      <button
                        key={`${message._id}-${reaction.emoji}`}
                        type="button"
                        aria-label={`${reaction.emoji} reaction, ${reaction.count} ${reaction.count === 1 ? "time" : "times"}${reaction.mine ? ", selected" : ""}`}
                        className={`rounded-full border px-2 py-0.5 text-xs ${
                          reaction.mine
                            ? "border-transparent bg-brand/30 text-cyan-100 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.3)]"
                            : "border-transparent bg-slate-800/70 text-slate-100"
                        }`}
                        onClick={() => handleToggleReaction(message._id, reaction.emoji)}
                        disabled={reactingMessageId === message._id}
                      >
                        {reaction.emoji} {reaction.count}
                      </button>
                    ))}

                    {reactionOptions.map((emoji) => (
                      <button
                        key={`${message._id}-quick-${emoji}`}
                        type="button"
                        aria-label={`React with ${emoji}`}
                        className="rounded-full border border-transparent bg-slate-900/70 px-1.5 py-0.5 text-[11px] text-slate-200 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] hover:bg-slate-800/80"
                        onClick={() => handleToggleReaction(message._id, emoji)}
                        disabled={reactingMessageId === message._id}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          {isCounterpartTyping && (
            <p role="status" aria-live="polite" className="text-xs font-medium text-brandStrong">
              {counterpartName} is typing...
            </p>
          )}

          <div ref={endRef} />
        </div>
      )}

      {attachmentFile && (
        <div role="status" className="surface-subtle flex items-center justify-between gap-2 px-3 py-2 text-xs text-slate-100">
          <span className="truncate">
            Attached: {attachmentFile.name} ({formatFileSize(attachmentFile.size)})
          </span>
          <button
            type="button"
            className="rounded-lg border border-transparent bg-slate-800/75 px-2 py-1 text-[11px] font-semibold text-slate-100 hover:bg-slate-700/80"
            onClick={handleRemoveAttachment}
          >
            Remove
          </button>
        </div>
      )}

      <form onSubmit={handleSendMessage} aria-label="Message composer" className="flex flex-col gap-2 sm:flex-row">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleAttachmentPick}
          accept="image/*,.pdf,.doc,.docx,.txt,.csv,.zip"
        />

        <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
          Attach
        </Button>

        <input
          type="text"
          value={draft}
          onChange={handleDraftChange}
          placeholder="Send a message"
          aria-label="Message text"
          className="field-control flex-1"
        />

        <Button type="submit" disabled={sending || (!draft.trim() && !attachmentFile)}>
          {sending ? "..." : "Send"}
        </Button>
      </form>

      {error && <p role="alert" className="status-error">{error}</p>}
    </div>
  );
};

export default ChatWindow;
