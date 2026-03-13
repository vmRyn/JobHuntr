import mongoose from "mongoose";

const { Schema } = mongoose;

const offerAuditEntrySchema = new Schema(
  {
    actor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    action: {
      type: String,
      required: true,
      trim: true
    },
    note: {
      type: String,
      trim: true,
      default: ""
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const offerSchema = new Schema(
  {
    title: {
      type: String,
      trim: true,
      default: "Offer"
    },
    compensation: {
      type: String,
      trim: true,
      required: true
    },
    currency: {
      type: String,
      trim: true,
      default: "USD"
    },
    employmentType: {
      type: String,
      trim: true,
      default: "full_time"
    },
    startDate: {
      type: Date,
      default: null
    },
    notes: {
      type: String,
      trim: true,
      default: ""
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "withdrawn"],
      default: "pending"
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    decisionBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    decisionNote: {
      type: String,
      trim: true,
      default: ""
    },
    auditTrail: {
      type: [offerAuditEntrySchema],
      default: []
    }
  },
  { timestamps: true }
);

const interviewSchema = new Schema(
  {
    title: {
      type: String,
      trim: true,
      default: "Interview"
    },
    jobTitle: {
      type: String,
      trim: true,
      default: ""
    },
    companyName: {
      type: String,
      trim: true,
      default: ""
    },
    startAt: {
      type: Date,
      required: true
    },
    endAt: {
      type: Date,
      required: true
    },
    timezone: {
      type: String,
      trim: true,
      default: "UTC"
    },
    location: {
      type: String,
      trim: true,
      default: ""
    },
    notes: {
      type: String,
      trim: true,
      default: ""
    },
    proposedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    responseStatus: {
      type: String,
      enum: ["pending", "accepted", "declined", "reschedule_requested"],
      default: "pending"
    },
    responseBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    responseNote: {
      type: String,
      trim: true,
      default: ""
    },
    rescheduleProposal: {
      startAt: { type: Date, default: null },
      endAt: { type: Date, default: null },
      timezone: { type: String, trim: true, default: "" },
      location: { type: String, trim: true, default: "" }
    },
    lastActionAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled"],
      default: "scheduled"
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

const matchSchema = new Schema(
  {
    job: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true
    },
    seeker: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    stage: {
      type: String,
      enum: ["new", "screening", "interview", "offer"],
      default: "new"
    },
    interviews: {
      type: [interviewSchema],
      default: []
    },
    offers: {
      type: [offerSchema],
      default: []
    }
  },
  { timestamps: true }
);

matchSchema.index({ job: 1, seeker: 1, company: 1 }, { unique: true });

const Match = mongoose.model("Match", matchSchema);

export default Match;
