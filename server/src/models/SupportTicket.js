import mongoose from "mongoose";

const { Schema } = mongoose;

const supportMessageSchema = new Schema(
  {
    senderType: {
      type: String,
      enum: ["user", "admin", "assistant"],
      required: true
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const supportTicketSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    subject: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      enum: ["account", "technical", "safety", "billing", "other"],
      default: "other"
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium"
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open"
    },
    createdVia: {
      type: String,
      enum: ["manual", "chatbot"],
      default: "manual"
    },
    aiResolutionAttempted: {
      type: Boolean,
      default: false
    },
    messages: {
      type: [supportMessageSchema],
      default: []
    },
    assignee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    unreadForUser: {
      type: Number,
      default: 0
    },
    unreadForAdmin: {
      type: Number,
      default: 1
    },
    lastMessageAt: {
      type: Date,
      default: Date.now
    },
    resolutionSummary: {
      type: String,
      trim: true,
      default: ""
    }
  },
  { timestamps: true }
);

supportTicketSchema.index({ status: 1, priority: 1, updatedAt: -1 });

const SupportTicket = mongoose.model("SupportTicket", supportTicketSchema);

export default SupportTicket;
