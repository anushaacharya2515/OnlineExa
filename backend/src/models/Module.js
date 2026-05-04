import mongoose from "mongoose";

const ModuleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true }
  },
  { timestamps: true }
);

export const Module = mongoose.model("Module", ModuleSchema);
