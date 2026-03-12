import mongoose from "mongoose";

const { Schema } = mongoose;

const adminAuditLogSchema = new Schema(
  {
    admin: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    actionType: {
      type: String,
      required: true,
      trim: true
    },
    targetUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    targetJob: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      default: null
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

const AdminAuditLog = mongoose.model("AdminAuditLog", adminAuditLogSchema);

export default AdminAuditLog;
