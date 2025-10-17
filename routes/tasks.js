import express from "express";
import jwt from "jsonwebtoken";
import db from "#db/client";
import requireBody from "#middleware/requireBody";

const router = express.Router();

// Authentication middleware for protected routes
const requireAuth = async (req, res, next) => {
  try {
    const authorization = req.get("authorization");
    if (!authorization || !authorization.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "Unauthorized - No token provided" });
    }

    const token = authorization.split(" ")[1];
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );

    // Add user info to request
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized - Invalid token" });
  }
};

// 🔒 POST /tasks - Create a new task
router.post(
  "/",
  requireAuth,
  requireBody(["title", "done"]),
  async (req, res, next) => {
    try {
      const { title, done } = req.body;
      const userId = req.user.id;

      const result = await db.query(
        "INSERT INTO tasks (title, done, user_id) VALUES ($1, $2, $3) RETURNING id, title, done, user_id",
        [title, done, userId]
      );

      const task = result.rows[0];
      res.status(201).json(task);
    } catch (error) {
      next(error);
    }
  }
);

// 🔒 GET /tasks - Get all tasks for logged-in user
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      "SELECT id, title, done, user_id FROM tasks WHERE user_id = $1 ORDER BY id",
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// 🔒 PUT /tasks/:id - Update a specific task
router.put(
  "/:id",
  requireAuth,
  requireBody(["title", "done"]),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { title, done } = req.body;
      const userId = req.user.id;

      // First check if task exists and belongs to user
      const checkResult = await db.query(
        "SELECT user_id FROM tasks WHERE id = $1",
        [id]
      );

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ message: "Task not found" });
      }

      if (checkResult.rows[0].user_id !== userId) {
        return res
          .status(403)
          .json({ message: "Forbidden - You don't own this task" });
      }

      // Update the task
      const result = await db.query(
        "UPDATE tasks SET title = $1, done = $2 WHERE id = $3 AND user_id = $4 RETURNING id, title, done, user_id",
        [title, done, id, userId]
      );

      const task = result.rows[0];
      res.json(task);
    } catch (error) {
      next(error);
    }
  }
);

// 🔒 DELETE /tasks/:id - Delete a specific task
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // First check if task exists and belongs to user
    const checkResult = await db.query(
      "SELECT user_id FROM tasks WHERE id = $1",
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (checkResult.rows[0].user_id !== userId) {
      return res
        .status(403)
        .json({ message: "Forbidden - You don't own this task" });
    }

    // Delete the task
    const result = await db.query(
      "DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id, title, done, user_id",
      [id, userId]
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
