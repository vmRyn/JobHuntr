import mongoose from "mongoose";

const { Schema } = mongoose;

const interviewSchema = new Schema(
  {
    title: {
      type: String,
      trim: true,
      default: "Interview"
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
    }
  },
  { timestamps: true }
);

matchSchema.index({ job: 1, seeker: 1, company: 1 }, { unique: true });

const Match = mongoose.model("Match", matchSchema);

export default Match;
