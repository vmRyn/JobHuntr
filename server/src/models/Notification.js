import mongoose from "mongoose";

const { Schema } = mongoose;

const notificationSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ["interview_scheduled"],
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    companyName: {
      type: String,
      trim: true,
      default: ""
    },
    job: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      default: null
    },
    jobTitle: {
      type: String,
      trim: true,
      default: ""
    },
    match: {
      type: Schema.Types.ObjectId,
      ref: "Match",
      default: null
    },
    interviewId: {
      type: Schema.Types.ObjectId,
      default: null
    },
    interviewAt: {
      type: Date,
      default: null
    },
    location: {
      type: String,
      trim: true,
      default: ""
    },
    isRead: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
