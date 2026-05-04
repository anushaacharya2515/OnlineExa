import express from "express";
import { auth } from "../middleware/auth.js";
import { createTopic, listTopics, deleteTopic } from "../controllers/topicController.js";

const router = express.Router();

router.use(auth("admin"));

router.post("/", createTopic);
router.get("/", listTopics);
router.delete("/:id", deleteTopic);

export default router;
