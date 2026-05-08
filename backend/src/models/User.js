import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, unique: true, index: true, required: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "student"], default: "student" },
    mobileNumber: { type: String, default: "" },
    dob: { type: String, default: "" },
    profilePhotoUrl: { type: String, default: "" },
    resumeUrl: { type: String, default: "" },
    address: { type: String, default: "" },
    college: { type: String, default: "" },
    createdAt: { type: String },
    resetToken: { type: String, default: null },
    resetTokenExpiry: { type: Number, default: null }
  },
  { versionKey: false }
);

export const User = mongoose.model("User", UserSchema);
