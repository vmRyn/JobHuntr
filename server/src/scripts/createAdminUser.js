import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";

dotenv.config();

const requiredEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const requiredPassword = process.env.ADMIN_PASSWORD?.trim();
const adminName = process.env.ADMIN_NAME?.trim() || "JobHuntr Admin";

const main = async () => {
  if (!requiredEmail || !requiredPassword) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in environment variables");
  }

  await connectDB();

  const existingUser = await User.findOne({ email: requiredEmail }).select("+password");

  if (existingUser && existingUser.userType !== "admin") {
    throw new Error("A non-admin user already exists with ADMIN_EMAIL");
  }

  if (existingUser) {
    existingUser.password = requiredPassword;
    existingUser.adminProfile = {
      ...(existingUser.adminProfile || {}),
      name: adminName
    };
    existingUser.isSuspended = false;
    existingUser.suspensionReason = "";
    await existingUser.save();

    console.log(`Updated admin account: ${requiredEmail}`);
    return;
  }

  await User.create({
    userType: "admin",
    email: requiredEmail,
    password: requiredPassword,
    adminProfile: { name: adminName },
    isSuspended: false,
    suspensionReason: ""
  });

  console.log(`Created admin account: ${requiredEmail}`);
};

main()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Failed to create admin user:", error.message);
    await mongoose.disconnect();
    process.exit(1);
  });
