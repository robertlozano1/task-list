import express from "express";

const app = express();

// Middleware for parsing JSON
app.use(express.json());

// Import routers
import usersRouter from "./routes/users.js";
import tasksRouter from "./routes/tasks.js";

// Mount routers
app.use("/users", usersRouter);
app.use("/tasks", tasksRouter);

export default app;

app.use((err, req, res, next) => {
  switch (err.code) {
    // Invalid type
    case "22P02":
      return res.status(400).send(err.message);
    // Unique constraint violation
    case "23505":
    // Foreign key violation
    case "23503":
      return res.status(400).send(err.detail);
    default:
      next(err);
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send("Sorry! Something went wrong.");
});
