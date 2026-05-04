import express from "express";
import { auth } from "../middleware/auth.js";
import { createSubTopic, listSubTopics, deleteSubTopic } from "../controllers/subTopicController.js";

const router = express.Router();

router.use(auth("admin"));

router.post("/", createSubTopic);
router.get("/", listSubTopics);
router.delete("/:id", deleteSubTopic);

export default router;
