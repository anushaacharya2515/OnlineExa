import express from "express";
import { auth } from "../middleware/auth.js";
import { createModule, listModules, deleteModule } from "../controllers/moduleController.js";

const router = express.Router();

router.use(auth("admin"));

router.post("/", createModule);
router.get("/", listModules);
router.delete("/:id", deleteModule);

export default router;
