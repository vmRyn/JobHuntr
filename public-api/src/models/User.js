import mongoose from "mongoose";

const { Schema } = mongoose;

const companyProfileSchema = new Schema(
  {
    companyName: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    industry: { type: String, trim: true, default: "" },
    logo: { type: String, trim: true, default: "" }
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    userType: {
      type: String,
      enum: ["seeker", "company"],
      required: true
    },
    companyProfile: {
      type: companyProfileSchema,
      default: () => ({})
    }
  },
  {
    timestamps: true,
    strict: false
  }
);

const User = mongoose.model("User", userSchema);

export default User;
