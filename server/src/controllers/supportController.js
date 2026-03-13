import SupportTicket from "../models/SupportTicket.js";
import User from "../models/User.js";
import { notifyUser } from "../utils/notifications.js";

const allowedCategories = new Set(["account", "technical", "safety", "billing", "other"]);
const allowedPriorities = new Set(["low", "medium", "high"]);
const allowedStatuses = new Set(["open", "in_progress", "resolved", "closed"]);

const toPositiveInt = (value, fallback, maxValue = 100) => {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, maxValue);
};

const escapeRegExp = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const summarizeTicket = (ticket) => ({
  id: String(ticket._id),
  subject: ticket.subject,
  category: ticket.category,
  priority: ticket.priority,
  status: ticket.status,
  createdVia: ticket.createdVia,
  aiResolutionAttempted: Boolean(ticket.aiResolutionAttempted),
  unreadForUser: ticket.unreadForUser,
  unreadForAdmin: ticket.unreadForAdmin,
  assignee: ticket.assignee || null,
  createdAt: ticket.createdAt,
  updatedAt: ticket.updatedAt,
  lastMessageAt: ticket.lastMessageAt,
  resolutionSummary: ticket.resolutionSummary || ""
});

const buildAssistantResponse = (message = "") => {
  const input = message.trim().toLowerCase();

  if (!input) {
    return {
      answer: "Share what you need help with and I will try to resolve it quickly.",
      resolved: false,
      confidence: "low",
      suggestedCategory: "other"
    };
  }

  if (/forgot|reset|password/.test(input)) {
    return {
      answer:
        "Use the Forgot Password flow on login. Request a reset token, then submit it in Reset Password with your new password.",
      resolved: true,
      confidence: "high",
      suggestedCategory: "account"
    };
  }

  if (/verify|verification|email/.test(input)) {
    return {
      answer:
        "From account security, request a verification token and submit it in Verify Email. If the token expired, generate a new one.",
      resolved: true,
      confidence: "high",
      suggestedCategory: "account"
    };
  }

  if (/2fa|two[-\s]?factor|otp/.test(input)) {
    return {
      answer:
        "Enable 2FA in account security by requesting a setup code, then confirming it. You can disable it later with your current password.",
      resolved: true,
      confidence: "high",
      suggestedCategory: "account"
    };
  }

  if (/interview|reschedule|offer|match/.test(input)) {
    return {
      answer:
        "Open your match details to respond to interview proposals or offers. You can accept, decline, or request a reschedule from the workflow panel.",
      resolved: true,
      confidence: "medium",
      suggestedCategory: "technical"
    };
  }

  if (/bug|error|broken|crash|not work|fail/.test(input)) {
    return {
      answer:
        "Try refreshing and signing in again. If the issue continues, open a support ticket and include the exact action, timestamp, and any error message.",
      resolved: false,
      confidence: "medium",
      suggestedCategory: "technical"
    };
  }

  if (/abuse|harass|scam|fraud|unsafe/.test(input)) {
    return {
      answer:
        "Use report tools in chat or profile immediately. For urgent safety issues, open a high-priority safety ticket so admins can review and act quickly.",
      resolved: false,
      confidence: "medium",
      suggestedCategory: "safety"
    };
  }

  return {
    answer:
      "I could not fully resolve that automatically. You can open a support ticket now and an admin will respond directly in-app.",
    resolved: false,
    confidence: "low",
    suggestedCategory: "other"
  };
};

const notifyAdmins = async ({ title, message, metadata = {} }) => {
  const admins = await User.find({ userType: "admin" }).select("_id").lean();

  await Promise.all(
    admins.map((admin) =>
      notifyUser({
        userId: admin._id,
        type: "support_ticket_update",
        title,
        message,
        metadata
      })
    )
  );
};

const mapTicketUser = (ticket) => {
  if (!ticket.user) {
    return null;
  }

  return {
    id: String(ticket.user._id),
    email: ticket.user.email,
    userType: ticket.user.userType,
    displayName:
      ticket.user.userType === "company"
        ? ticket.user.companyProfile?.companyName || "Company"
        : ticket.user.seekerProfile?.name || "User"
  };
};

const mapTicketAssignee = (ticket) => {
  if (!ticket.assignee) {
    return null;
  }

  return {
    id: String(ticket.assignee._id),
    email: ticket.assignee.email,
    name: ticket.assignee.adminProfile?.name || ""
  };
};

export const chatSupportAssistant = async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();

    if (!message) {
      return res.status(400).json({ message: "message is required" });
    }

    const response = buildAssistantResponse(message);

    return res.json({
      response,
      shouldOpenTicket: !response.resolved,
      suggestedCategory: response.suggestedCategory
    });
  } catch (error) {
    return res.status(500).json({ message: "Support assistant is unavailable" });
  }
};

export const createSupportTicket = async (req, res) => {
  try {
    const subject = String(req.body?.subject || "").trim();
    const message = String(req.body?.message || "").trim();
    const categoryInput = String(req.body?.category || "other").trim().toLowerCase();
    const priorityInput = String(req.body?.priority || "medium").trim().toLowerCase();
    const createdVia = req.body?.createdVia === "chatbot" ? "chatbot" : "manual";

    if (!subject || !message) {
      return res.status(400).json({ message: "subject and message are required" });
    }

    const category = allowedCategories.has(categoryInput) ? categoryInput : "other";
    const priority = allowedPriorities.has(priorityInput) ? priorityInput : "medium";

    const ticket = await SupportTicket.create({
      user: req.user._id,
      subject,
      category,
      priority,
      status: "open",
      createdVia,
      aiResolutionAttempted: Boolean(req.body?.aiResolutionAttempted),
      messages: [
        {
          senderType: "user",
          sender: req.user._id,
          message
        }
      ],
      unreadForUser: 0,
      unreadForAdmin: 1,
      lastMessageAt: new Date()
    });

    await notifyAdmins({
      title: "New Support Ticket",
      message: `${subject} (${priority})`,
      metadata: {
        ticketId: ticket._id,
        userId: req.user._id,
        category,
        priority
      }
    });

    return res.status(201).json({
      ticket: summarizeTicket(ticket)
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create support ticket" });
  }
};

export const getMySupportTickets = async (req, res) => {
  try {
    const statusInput = String(req.query?.status || "").trim().toLowerCase();
    const limit = toPositiveInt(req.query?.limit, 40, 100);

    const filters = { user: req.user._id };
    if (allowedStatuses.has(statusInput)) {
      filters.status = statusInput;
    }

    const tickets = await SupportTicket.find(filters)
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();

    return res.json({
      tickets: tickets.map((ticket) => summarizeTicket(ticket))
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load support tickets" });
  }
};

export const getMySupportTicketById = async (req, res) => {
  try {
    const ticket = await SupportTicket.findOne({
      _id: req.params.ticketId,
      user: req.user._id
    })
      .populate("messages.sender", "email adminProfile.name seekerProfile.name companyProfile.companyName userType")
      .lean();

    if (!ticket) {
      return res.status(404).json({ message: "Support ticket not found" });
    }

    return res.json({
      ticket: {
        ...summarizeTicket(ticket),
        messages: ticket.messages || []
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load support ticket" });
  }
};

export const addMySupportTicketMessage = async (req, res) => {
  try {
    const ticket = await SupportTicket.findOne({
      _id: req.params.ticketId,
      user: req.user._id
    });

    if (!ticket) {
      return res.status(404).json({ message: "Support ticket not found" });
    }

    const message = String(req.body?.message || "").trim();
    if (!message) {
      return res.status(400).json({ message: "message is required" });
    }

    ticket.messages.push({
      senderType: "user",
      sender: req.user._id,
      message
    });

    ticket.status = ticket.status === "closed" ? "open" : ticket.status;
    ticket.unreadForAdmin += 1;
    ticket.unreadForUser = 0;
    ticket.lastMessageAt = new Date();
    await ticket.save();

    await notifyAdmins({
      title: "Support Ticket Updated",
      message: `${ticket.subject}`,
      metadata: {
        ticketId: ticket._id,
        userId: req.user._id
      }
    });

    return res.json({
      ticket: summarizeTicket(ticket)
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to send support message" });
  }
};

export const listSupportTicketsForAdmin = async (req, res) => {
  try {
    const page = toPositiveInt(req.query?.page, 1, 100000);
    const limit = toPositiveInt(req.query?.limit, 30, 100);
    const statusInput = String(req.query?.status || "").trim().toLowerCase();
    const priorityInput = String(req.query?.priority || "").trim().toLowerCase();
    const queryText = String(req.query?.q || "").trim();

    const filters = {};
    if (allowedStatuses.has(statusInput)) {
      filters.status = statusInput;
    }
    if (allowedPriorities.has(priorityInput)) {
      filters.priority = priorityInput;
    }
    if (queryText) {
      filters.subject = new RegExp(escapeRegExp(queryText), "i");
    }

    const [total, tickets] = await Promise.all([
      SupportTicket.countDocuments(filters),
      SupportTicket.find(filters)
        .populate("user", "email seekerProfile.name companyProfile.companyName userType")
        .populate("assignee", "email adminProfile.name")
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
    ]);

    return res.json({
      data: tickets.map((ticket) => ({
        ...summarizeTicket(ticket),
        user: mapTicketUser(ticket),
        assignee: mapTicketAssignee(ticket)
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load support tickets" });
  }
};

export const getSupportTicketForAdmin = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.ticketId)
      .populate("user", "email seekerProfile.name companyProfile.companyName userType")
      .populate("messages.sender", "email adminProfile.name seekerProfile.name companyProfile.companyName userType")
      .lean();

    if (!ticket) {
      return res.status(404).json({ message: "Support ticket not found" });
    }

    return res.json({
      ticket: {
        ...summarizeTicket(ticket),
        user: mapTicketUser(ticket),
        messages: ticket.messages || []
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load support ticket" });
  }
};

export const addSupportTicketReplyAsAdmin = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.ticketId);
    if (!ticket) {
      return res.status(404).json({ message: "Support ticket not found" });
    }

    const message = String(req.body?.message || "").trim();
    if (!message) {
      return res.status(400).json({ message: "message is required" });
    }

    const nextStatusInput = String(req.body?.status || "").trim().toLowerCase();
    if (nextStatusInput && !allowedStatuses.has(nextStatusInput)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    ticket.messages.push({
      senderType: "admin",
      sender: req.user._id,
      message
    });

    ticket.status = nextStatusInput || "in_progress";
    ticket.unreadForUser += 1;
    ticket.unreadForAdmin = 0;
    ticket.lastMessageAt = new Date();
    ticket.assignee = req.user._id;
    await ticket.save();

    await notifyUser({
      userId: ticket.user,
      type: "support_ticket_update",
      title: "Support Reply",
      message: `Admin replied to ticket: ${ticket.subject}`,
      metadata: {
        ticketId: ticket._id,
        status: ticket.status
      }
    });

    return res.json({
      ticket: summarizeTicket(ticket)
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to reply to support ticket" });
  }
};

export const updateSupportTicketStatusAsAdmin = async (req, res) => {
  try {
    const status = String(req.body?.status || "").trim().toLowerCase();
    const resolutionSummary = String(req.body?.resolutionSummary || "").trim();

    if (!allowedStatuses.has(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const ticket = await SupportTicket.findById(req.params.ticketId);
    if (!ticket) {
      return res.status(404).json({ message: "Support ticket not found" });
    }

    ticket.status = status;
    ticket.resolutionSummary = resolutionSummary;
    ticket.assignee = req.user._id;
    await ticket.save();

    await notifyUser({
      userId: ticket.user,
      type: "support_ticket_update",
      title: "Ticket Status Updated",
      message: `Your support ticket is now ${status.replace("_", " ")}.`,
      metadata: {
        ticketId: ticket._id,
        status
      }
    });

    return res.json({
      ticket: summarizeTicket(ticket)
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update support ticket" });
  }
};
