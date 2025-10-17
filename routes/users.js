import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "#db/client";
import requireBody from "#middleware/requireBody";

const router = express.Router();

// POST /users/register
router.post(
  "/register",
  requireBody(["username", "password"]),
  async (req, res, next) => {
    try {
      const { username, password } = req.body;

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user in database
      const result = await db.query(
        "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username",
        [username, hashedPassword]
      );

      const user = result.rows[0];

      // Create JWT token
      const token = jwt.sign(
        { id: user.id, username: user.username },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "24h" }
      );

      res.status(201).send(token);
    } catch (error) {
      next(error);
    }
  }
);

// POST /users/login
router.post(
  "/login",
  requireBody(["username", "password"]),
  async (req, res, next) => {
    try {
      const { username, password } = req.body;

      // Find user in database
      const result = await db.query(
        "SELECT id, username, password FROM users WHERE username = $1",
        [username]
      );

      const user = result.rows[0];

      // Check if user exists and password is correct
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Create JWT token
      const token = jwt.sign(
        { id: user.id, username: user.username },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "24h" }
      );

      res.send(token);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
