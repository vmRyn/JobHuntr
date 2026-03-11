import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import api from "../api/client";
import Button from "./ui/Button";
import LoadingSpinner from "./LoadingSpinner";
import { getAssetUrl } from "../utils/assets";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

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
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const socketRef = useRef(null);
  const endRef = useRef(null);

  const selectedMatchId = selectedMatch?._id;

  const counterpart = useMemo(() => {
    if (!selectedMatch || !currentUser) return null;
    const seekerId = extractId(selectedMatch.seeker);
    return currentUser._id === seekerId ? selectedMatch.company : selectedMatch.seeker;
  }, [selectedMatch, currentUser]);

  const counterpartName = getName(counterpart);
  const counterpartImage = getProfileImage(counterpart);

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
    };

    socket.on("newMessage", onNewMessage);

    return () => {
      socket.off("newMessage", onNewMessage);
    };
  }, [selectedMatchId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedMatchId]);

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
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Failed to load messages");
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [selectedMatchId]);

  const handleSendMessage = async (event) => {
    event.preventDefault();

    if (!selectedMatchId || !draft.trim() || sending) {
      return;
    }

    setSending(true);
    setError("");

    try {
      const { data } = await api.post(`/messages/${selectedMatchId}`, { text: draft });
      setDraft("");
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

  if (!selectedMatch) {
    return (
      <div className="empty-state">
        Select a match to open chat.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-white/16 bg-slate-900/55 px-4 py-3 text-slate-50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {counterpartImage ? (
              <img
                src={counterpartImage}
                alt={counterpartName}
                className="h-12 w-12 rounded-2xl border border-white/20 object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-slate-900/65 text-sm font-semibold text-slate-100">
                {getInitial(counterpartName)}
              </div>
            )}

            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Chatting with</p>
              <p className="font-display text-xl text-slate-50">{counterpartName}</p>
            </div>
          </div>

          {headerAction}
        </div>
      </div>

      {loading && <LoadingSpinner label="Loading messages" />}

      {!loading && (
        <div className="max-h-[340px] space-y-3 overflow-y-auto rounded-2xl border border-white/16 bg-slate-950/55 p-3">
          {!messages.length && <p className="text-sm text-slate-300">No messages yet.</p>}

          {messages.map((message) => {
            const mine = extractId(message.sender) === currentUser?._id;
            const senderLabel = getSenderLabel(message, currentUser?._id, counterpartName);
            const timestamp = formatTimestamp(message.createdAt);

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
                  </div>

                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      mine
                        ? "bg-gradient-to-r from-sky-700 to-cyan-600 text-slate-50 shadow-[0_12px_26px_-18px_rgba(14,116,144,0.95)]"
                        : "border border-white/18 bg-white/12 text-slate-100"
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Send a message"
          aria-label="Message text"
          className="field-control"
        />
        <Button type="submit" disabled={sending}>
          {sending ? "..." : "Send"}
        </Button>
      </form>

      {error && <p className="text-sm font-medium text-rose-200">{error}</p>}
    </div>
  );
};

export default ChatWindow;
