const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./coworking.db");

db.serialize(() => {
  console.log("Starting static data seed for Co-Working Space...");

  const tables = [
    "fact_revenue",
    "dim_date",
    "dim_extra_service",
    "dim_membership_plan",
    "dim_space",
    "dim_member",
    "service_purchases",
    "extra_services",
    "bookings",
    "spaces",
    "subscriptions",
    "membership_plans",
    "members",
  ];
  tables.forEach((tbl) => db.run(`DELETE FROM ${tbl};`));

  // ==== MEMBERS ====
  const members = [
    ["Alice Johnson", "alice@mail.com", "2025-01-10"],
    ["Bob Smith", "bob@mail.com", "2025-02-01"],
    ["Charlie Brown", "charlie@mail.com", "2025-02-20"],
    ["Diana Lee", "diana@mail.com", "2025-03-05"],
    ["Evan Wright", "evan@mail.com", "2025-03-20"],
    ["Fiona Davis", "fiona@mail.com", "2025-04-01"],
    ["George Hill", "george@mail.com", "2025-04-10"],
    ["Hannah Kim", "hannah@mail.com", "2025-05-02"],
    ["Ian Walker", "ian@mail.com", "2025-05-25"],
    ["Jenny Park", "jenny@mail.com", "2025-06-05"],
  ];
  const insertMember = db.prepare(
    `INSERT INTO members (name, email, join_date) VALUES (?, ?, ?)`
  );
  members.forEach((m) => insertMember.run(m));
  insertMember.finalize();

  // ==== MEMBERSHIP PLANS ====
  const plans = [
    ["Daily Pass", 50000],
    ["Weekly Flex", 250000],
    ["Monthly Pro", 900000],
    ["Corporate Suite", 2000000],
  ];
  const insertPlan = db.prepare(
    `INSERT INTO membership_plans (plan_name, price) VALUES (?, ?)`
  );
  plans.forEach((p) => insertPlan.run(p));
  insertPlan.finalize();

  // ==== SPACES ====
  const spaces = [
    ["Open Desk Zone A", "Open Desk", 30000],
    ["Open Desk Zone B", "Open Desk", 25000],
    ["Private Room 1", "Private", 80000],
    ["Private Room 2", "Private", 90000],
    ["Meeting Room Alpha", "Meeting", 100000],
    ["Meeting Room Beta", "Meeting", 95000],
    ["Focus Room 1", "Focus", 50000],
    ["Focus Room 2", "Focus", 55000],
  ];
  const insertSpace = db.prepare(
    `INSERT INTO spaces (space_name, type, hourly_rate) VALUES (?, ?, ?)`
  );
  spaces.forEach((s) => insertSpace.run(s));
  insertSpace.finalize();

  // ==== EXTRA SERVICES ====
  const services = [
    ["Coffee Refill", 10000],
    ["Printing Service", 5000],
    ["Locker Access", 20000],
    ["Snack Pack", 15000],
    ["Projector Rental", 50000],
  ];
  const insertService = db.prepare(
    `INSERT INTO extra_services (service_name, price) VALUES (?, ?)`
  );
  services.forEach((s) => insertService.run(s));
  insertService.finalize();

  // ==== SUBSCRIPTIONS
  const insertSub = db.prepare(`
    INSERT INTO subscriptions (member_id, plan_id, purchase_date, start_date, end_date)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (let i = 0; i < 20; i++) {
    const member_id = Math.floor(Math.random() * members.length) + 1;
    const plan_id = Math.floor(Math.random() * plans.length) + 1;
    const startDay = Math.floor(Math.random() * 25) + 1;
    const start_date = `2025-09-${String(startDay).padStart(2, "0")}`;
    const end_date = `2025-09-${String(startDay + 5).padStart(2, "0")}`;
    insertSub.run(member_id, plan_id, start_date, start_date, end_date);
  }
  insertSub.finalize();

  // ==== BOOKINGS
  const insertBooking = db.prepare(`
    INSERT INTO bookings (member_id, space_id, booking_date, start_time, end_time, total_price)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (let i = 0; i < 30; i++) {
    const member_id = Math.floor(Math.random() * members.length) + 1;
    const space_id = Math.floor(Math.random() * spaces.length) + 1;
    const day = Math.floor(Math.random() * 28) + 1;
    const startHour = 8 + Math.floor(Math.random() * 8);
    const duration = 2 + Math.floor(Math.random() * 3);
    const start_time = `2025-09-${String(day).padStart(
      2,
      "0"
    )} ${startHour}:00`;
    const end_time = `2025-09-${String(day).padStart(2, "0")} ${
      startHour + duration
    }:00`;
    const total_price = duration * spaces[space_id - 1][2];
    insertBooking.run(
      member_id,
      space_id,
      `2025-09-${String(day).padStart(2, "0")}`,
      start_time,
      end_time,
      total_price
    );
  }
  insertBooking.finalize();

  // ==== SERVICE PURCHASES ====
  const insertPurchase = db.prepare(`
    INSERT INTO service_purchases (booking_id, service_id, quantity, purchase_date)
    VALUES (?, ?, ?, ?)
  `);
  for (let i = 0; i < 15; i++) {
    const booking_id = Math.floor(Math.random() * 30) + 1;
    const service_id = Math.floor(Math.random() * services.length) + 1;
    const quantity = Math.floor(Math.random() * 3) + 1;
    const purchase_date = `2025-09-${String(
      Math.floor(Math.random() * 28) + 1
    ).padStart(2, "0")}`;
    insertPurchase.run(booking_id, service_id, quantity, purchase_date);
  }
  insertPurchase.finalize();

  // ==== DIM TABLES ====
  db.run(`
    INSERT INTO dim_member (member_id, name, email)
    SELECT member_id, name, email FROM members;
  `);
  db.run(`
    INSERT INTO dim_space (space_id, space_name, type)
    SELECT space_id, space_name, type FROM spaces;
  `);
  db.run(`
    INSERT INTO dim_membership_plan (plan_id, plan_name)
    SELECT plan_id, plan_name FROM membership_plans;
  `);
  db.run(`
    INSERT INTO dim_extra_service (service_id, service_name)
    SELECT service_id, service_name FROM extra_services;
  `);

  // ==== DIM DATE ====
  db.all(
    `SELECT DISTINCT DATE(start_time) AS full_date FROM bookings;`,
    (err, rows) => {
      if (err) throw err;
      const insertDate = db.prepare(`
      INSERT INTO dim_date (full_date, year, month, day_of_week)
      VALUES (?, ?, ?, ?)
    `);
      rows.forEach((r) => {
        const d = new Date(r.full_date);
        insertDate.run(
          r.full_date,
          d.getFullYear(),
          d.getMonth() + 1,
          d.toLocaleString("en", { weekday: "long" })
        );
      });
      insertDate.finalize(() => {
        console.log("Static seed inserted successfully (~50 records)!");
        db.close(() => console.log("Database closed safely."));
      });
    }
  );
});
