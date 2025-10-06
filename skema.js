const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./coworking.db");

db.serialize(() => {
  console.log(
    "Creating OLTP + Dimensional Model tables for Co-Working Space..."
  );

  // ===== OLTP SCHEMA =====
  db.run(`
    CREATE TABLE IF NOT EXISTS members (
      member_id INTEGER PRIMARY KEY,
      name TEXT,
      email TEXT,
      join_date DATE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS membership_plans (
      plan_id INTEGER PRIMARY KEY,
      plan_name TEXT,
      price DECIMAL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      subscription_id INTEGER PRIMARY KEY,
      member_id INTEGER,
      plan_id INTEGER,
      purchase_date DATE,
      start_date DATE,
      end_date DATE,
      FOREIGN KEY (member_id) REFERENCES members(member_id),
      FOREIGN KEY (plan_id) REFERENCES membership_plans(plan_id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS spaces (
      space_id INTEGER PRIMARY KEY,
      space_name TEXT,
      type TEXT,
      hourly_rate DECIMAL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS bookings (
      booking_id INTEGER PRIMARY KEY,
      member_id INTEGER,
      space_id INTEGER,
      booking_date DATE,
      start_time DATETIME,
      end_time DATETIME,
      total_price DECIMAL,
      FOREIGN KEY (member_id) REFERENCES members(member_id),
      FOREIGN KEY (space_id) REFERENCES spaces(space_id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS extra_services (
      service_id INTEGER PRIMARY KEY,
      service_name TEXT,
      price DECIMAL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS service_purchases (
      purchase_id INTEGER PRIMARY KEY,
      booking_id INTEGER,
      service_id INTEGER,
      quantity INTEGER,
      purchase_date DATE,
      FOREIGN KEY (booking_id) REFERENCES bookings(booking_id),
      FOREIGN KEY (service_id) REFERENCES extra_services(service_id)
    );
  `);

  // ===== DIMENSIONAL MODEL =====
  db.run(`
    CREATE TABLE IF NOT EXISTS dim_member (
      member_key INTEGER PRIMARY KEY,
      member_id INTEGER,
      name TEXT,
      email TEXT,
      join_date DATE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS dim_space (
      space_key INTEGER PRIMARY KEY,
      space_id INTEGER,
      space_name TEXT,
      type TEXT,
      hourly_rate DECIMAL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS dim_membership_plan (
      plan_key INTEGER PRIMARY KEY,
      plan_id INTEGER,
      plan_name TEXT
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS dim_extra_service (
      service_key INTEGER PRIMARY KEY,
      service_id INTEGER,
      service_name TEXT
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS dim_date (
      date_key INTEGER PRIMARY KEY,
      full_date DATE,
      year INTEGER,
      month INTEGER,
      day_of_week TEXT
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS fact_revenue (
      revenue_key INTEGER PRIMARY KEY,
      member_key INTEGER,
      space_key INTEGER,
      plan_key INTEGER,
      service_key INTEGER,
      date_key INTEGER,
      transaction_type TEXT,
      amount DECIMAL,
      FOREIGN KEY (member_key) REFERENCES dim_member(member_key),
      FOREIGN KEY (space_key) REFERENCES dim_space(space_key),
      FOREIGN KEY (plan_key) REFERENCES dim_membership_plan(plan_key),
      FOREIGN KEY (service_key) REFERENCES dim_extra_service(service_key),
      FOREIGN KEY (date_key) REFERENCES dim_date(date_key)
    );
  `);

  console.log("OLTP + Dimensional Model tables for Co-Working Space created!");
});

db.close();
