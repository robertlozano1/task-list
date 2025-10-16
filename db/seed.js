import db from "#db/client";

await db.connect();
await seed();
await db.end();
console.log("🌱 Database seeded.");

async function seed() {
  // Create a test user with hashed password
  const bcrypt = await import("bcrypt");
  const hashedPassword = await bcrypt.hash("password123", 10);

  const userResult = await db.query(
    `
    INSERT INTO users (username, password) 
    VALUES ($1, $2) 
    RETURNING id
  `,
    ["johndoe", hashedPassword]
  );

  const userId = userResult.rows[0].id;
  console.log(`Created user with ID: ${userId}`);

  // Create 3 tasks for this user
  const tasks = [
    { title: "Complete project setup", done: false },
    { title: "Write API documentation", done: true },
    { title: "Deploy to production", done: false },
  ];

  for (const task of tasks) {
    await db.query(
      `
      INSERT INTO tasks (title, done, user_id) 
      VALUES ($1, $2, $3)
    `,
      [task.title, task.done, userId]
    );
  }

  console.log(`Created ${tasks.length} tasks for user ${userId}`);
}
