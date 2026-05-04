import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { User } from "../models/User.js";
import { signToken } from "../middleware/auth.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const confirmPassword = String(req.body.confirmPassword || "");
  const mobileNumber = String(req.body.mobileNumber || "").replace(/\D/g, "");

  if (!name || !email || !mobileNumber || !password || !confirmPassword) {
    return res.status(400).json({ message: "name, email, mobileNumber, password, and confirmPassword are required" });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Password and confirm password must match" });
  }
  if (mobileNumber.length < 10 || mobileNumber.length > 15) {
    return res.status(400).json({ message: "Please enter a valid mobile number" });
  }

  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ message: "Email already registered" });

  const passwordHash = await bcrypt.hash(password, 10);
  await User.create({ id: uuidv4(), name, email, passwordHash, role: "student", mobileNumber, createdAt: new Date().toISOString() });
  res.status(201).json({ message: "Registered successfully" });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "email and password are required" });

  const user = await User.findOne({ email: email.toLowerCase() }).lean();
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const token = signToken(user);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

// POST /auth/forgot-password — generates a 6-char reset code
router.post("/forgot-password", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  if (!email) return res.status(400).json({ message: "Email is required" });

  const user = await User.findOne({ email });
  if (!user) {
    // Don't reveal whether email exists
    return res.json({ message: "If that email is registered, a reset code has been sent.", resetCode: null });
  }

  const resetCode = crypto.randomBytes(3).toString("hex").toUpperCase(); // 6-char code
  const expiry = Date.now() + 15 * 60 * 1000; // 15 minutes
  await User.updateOne({ email }, { resetToken: resetCode, resetTokenExpiry: expiry });

  // In production replace with email sending. For demo, return code in response.
  res.json({ message: "Reset code generated.", resetCode });
});

// POST /auth/reset-password — validates code and sets new password
router.post("/reset-password", async (req, res) => {
  const email    = String(req.body.email    || "").trim().toLowerCase();
  const token    = String(req.body.token    || "").trim().toUpperCase();
  const password = String(req.body.password || "");
  const confirmPassword = String(req.body.confirmPassword || "");

  if (!email || !token || !password || !confirmPassword)
    return res.status(400).json({ message: "All fields are required" });
  if (password !== confirmPassword)
    return res.status(400).json({ message: "Passwords do not match" });
  if (password.length < 6)
    return res.status(400).json({ message: "Password must be at least 6 characters" });

  const user = await User.findOne({ email });
  if (!user || !user.resetToken || !user.resetTokenExpiry)
    return res.status(400).json({ message: "Invalid or expired reset code" });
  if (user.resetToken !== token)
    return res.status(400).json({ message: "Invalid reset code" });
  if (Date.now() > user.resetTokenExpiry)
    return res.status(400).json({ message: "Reset code has expired. Please request a new one." });

  const passwordHash = await bcrypt.hash(password, 10);
  await User.updateOne({ email }, { passwordHash, resetToken: null, resetTokenExpiry: null });
  res.json({ message: "Password reset successfully. You can now sign in." });
});

export default router;
