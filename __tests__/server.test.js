import app from "#app";
import db from "#db/client";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

beforeAll(async () => {
  await db.connect();
  await db.query("BEGIN");
});
afterAll(async () => {
  await db.query("ROLLBACK");
  await db.end();
});

describe("/users router", () => {
  describe("POST /users/register", () => {
    it("creates a new user and sends back a token", async () => {
      const response = await request(app).post("/users/register").send({
        username: "tasktesttask",
        password: "password",
      });
      expect(response.status).toBe(201);
      expect(response.text).toMatch(/\w+\.\w+\.\w+/);
    });

    it("hashes the password of the created user", async () => {
      const {
        rows: [user],
      } = await db.query(
        "SELECT password FROM users WHERE username = 'tasktesttask'",
      );
      expect(user.password).not.toBe("password");
    });
  });

  describe("POST /users/login", () => {
    it("sends a token if correct credentials are provided", async () => {
      const response = await request(app).post("/users/login").send({
        username: "tasktesttask",
        password: "password",
      });
      expect(response.status).toBe(200);
      expect(response.text).toMatch(/\w+\.\w+\.\w+/);
    });

    it("sends 401 if incorrect credentials are provided", async () => {
      const response = await request(app).post("/users/login").send({
        username: "tasktesttask",
        password: "wrongpassword",
      });
      expect(response.status).toBe(401);
    });
  });
});

describe("/tasks router", () => {
  const task = { title: "Task", done: false };
  const updatedTask = { title: "Updated task", done: true };

  let token;
  let taskId;

  beforeAll(async () => {
    const response = await request(app)
      .post("/users/login")
      .send({ username: "tasktesttask", password: "password" });
    token = response.text;
  });

  describe("POST /tasks", () => {
    it("sends 400 if the body is missing required fields", async () => {
      await db.query("SAVEPOINT s");
      const response = await request(app)
        .post("/tasks")
        .send({})
        .set("Authorization", `Bearer ${token}`);
      expect(response.status).toBe(400);
      await db.query("ROLLBACK TO s");
    });

    it("sends 401 if a valid token is not attached", async () => {
      await db.query("SAVEPOINT s");
      const response = await request(app)
        .post("/tasks")
        .send({ title: "New Task", description: "Task description" });
      expect(response.status).toBe(401);
      await db.query("ROLLBACK TO s");
    });

    it("creates a new task and sends it back with status 201", async () => {
      const response = await request(app)
        .post("/tasks")
        .send(task)
        .set("Authorization", `Bearer ${token}`);
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      taskId = response.body.id;
      expect(response.body).toEqual(expect.objectContaining(task));
    });
  });

  describe("GET /tasks", () => {
    it("sends 401 if a valid token is not attached", async () => {
      const response = await request(app).get("/tasks");
      expect(response.status).toBe(401);
    });

    it("sends array of all tasks owned by the user", async () => {
      const response = await request(app)
        .get("/tasks")
        .set("Authorization", `Bearer ${token}`);
      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.arrayContaining([expect.objectContaining(task)]),
      );
    });
  });

  describe("UPDATE /tasks/:id", () => {
    it("sends 401 if a valid token is not attached", async () => {
      const response = await request(app)
        .put("/tasks/" + taskId)
        .send(updatedTask);
      expect(response.status).toBe(401);
    });

    it("sends 403 if the user does not own the task", async () => {
      const response = await request(app)
        .put("/tasks/1")
        .send(updatedTask)
        .set("Authorization", `Bearer ${token}`);
      expect(response.status).toBe(403);
    });

    it("updates the task", async () => {
      const response = await request(app)
        .put("/tasks/" + taskId)
        .send(updatedTask)
        .set("Authorization", `Bearer ${token}`);
      expect(response.status).toBe(200);
      expect(response.body).toEqual(expect.objectContaining(updatedTask));
    });
  });

  describe("DELETE /tasks/:id", () => {
    it("sends 401 if a valid token is not attached", async () => {
      const response = await request(app).delete("/tasks/" + taskId);
      expect(response.status).toBe(401);
    });

    it("sends 403 if the user does not own the task", async () => {
      const response = await request(app)
        .delete("/tasks/1")
        .set("Authorization", `Bearer ${token}`);
      expect(response.status).toBe(403);
    });

    it("deletes the task and sends status 204", async () => {
      const response = await request(app)
        .delete("/tasks/" + taskId)
        .set("Authorization", `Bearer ${token}`);
      expect(response.status).toBe(204);
    });
  });
});
