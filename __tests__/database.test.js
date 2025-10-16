import db from "#db/client";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

beforeAll(async () => {
  await db.connect();
});
afterAll(async () => {
  await db.end();
});

describe("Database schema", () => {
  test("users table is created with correct columns and constraints", async () => {
    const { rows } = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users';
    `);

    expect(rows).toEqual(
      expect.arrayContaining([
        { column_name: "id", data_type: "integer", is_nullable: "NO" },
        { column_name: "username", data_type: "text", is_nullable: "NO" },
        { column_name: "password", data_type: "text", is_nullable: "NO" },
      ])
    );

    const { rowCount } = await db.query(`
      SELECT constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'users' AND constraint_type = 'UNIQUE';
    `);
    expect(rowCount).toBeGreaterThan(0);
  });

  test("tasks table is created with correct columns and constraints", async () => {
    const { rows } = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'tasks';
    `);

    expect(rows).toEqual(
      expect.arrayContaining([
        { column_name: "id", data_type: "integer", is_nullable: "NO" },
        { column_name: "title", data_type: "text", is_nullable: "NO" },
        { column_name: "done", data_type: "boolean", is_nullable: "NO" },
        { column_name: "user_id", data_type: "integer", is_nullable: "NO" },
      ])
    );

    const { rowCount } = await db.query(`
      SELECT constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'tasks' AND constraint_type = 'FOREIGN KEY';
    `);
    expect(rowCount).toBeGreaterThan(0);
  });
});

test("Database is seeded with at least 1 user with 3+ tasks", async () => {
  const {
    rows: [user],
    rowCount,
  } = await db.query(`
    SELECT *
    FROM users;
  `);
  expect(rowCount).toBeGreaterThan(0);

  const { rowCount: taskCount } = await db.query(
    "SELECT * FROM tasks WHERE user_id = $1",
    [user.id]
  );
  expect(taskCount).toBeGreaterThanOrEqual(3);
});
