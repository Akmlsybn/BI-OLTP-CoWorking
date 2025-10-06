const sqlite3 = require("sqlite3").verbose();
const { promisify } = require("util");
const path = require("path");

const DB_FILE = path.resolve(__dirname, "coworking.db");

function openDb(filepath) {
  const db = new sqlite3.Database(filepath);
  db.allAsync = promisify(db.all).bind(db);
  db.runAsync = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  return db;
}

// ========== TRANSFORM FUNCTIONS ==========

// Transform data member
function transformMembers(members) {
  return members.map((m, idx) => ({
    member_key: idx + 1,
    member_id: m.member_id,
    name: m.name,
    email: m.email,
    join_date: m.join_date,
  }));
}

// Transform data space
function transformSpaces(spaces) {
  return spaces.map((s, idx) => ({
    space_key: idx + 1,
    space_id: s.space_id,
    space_name: s.space_name,
    type: s.type,
    hourly_rate: s.hourly_rate,
  }));
}

// Transform data tanggal dari bookings & subscriptions
function transformDates(bookings, subscriptions) {
  const seen = new Set();
  const dim_date = [];

  const allDates = [
    ...bookings.map((b) => b.booking_date),
    ...subscriptions.map((s) => s.purchase_date),
  ];

  allDates.forEach((dStr) => {
    if (dStr && !seen.has(dStr)) {
      seen.add(dStr);
      const d = new Date(dStr);
      dim_date.push({
        date_key: dim_date.length + 1,
        full_date: dStr,
        year: d.getUTCFullYear(),
        month: d.getUTCMonth() + 1,
        day_of_week: d.toLocaleString("en", { weekday: "long" }),
      });
    }
  });

  return dim_date;
}

// Bangun tabel fakta revenue
function buildFactRevenue(bookings, subscriptions, dim_date) {
  const dateKeyByDate = new Map(dim_date.map((d) => [d.full_date, d.date_key]));
  const facts = [];

  // Dari bookings
  bookings.forEach((b, idx) => {
    const date_key = dateKeyByDate.get(b.booking_date);
    facts.push({
      revenue_key: idx + 1,
      member_key: b.member_id,
      space_key: b.space_id,
      plan_key: null,
      service_key: null,
      date_key,
      transaction_type: "Booking",
      amount: b.total_price,
    });
  });

  // Dari subscriptions
  subscriptions.forEach((s, idx) => {
    const date_key = dateKeyByDate.get(s.purchase_date);
    facts.push({
      revenue_key: bookings.length + idx + 1,
      member_key: s.member_id,
      space_key: null,
      plan_key: s.plan_id,
      service_key: null,
      date_key,
      transaction_type: "Subscription",
      amount: s.plan_price || 0,
    });
  });

  return facts;
}

// ========== LOAD ==========

async function replaceAndInsert(db, tableName, rows, columns) {
  await db.runAsync(`DELETE FROM ${tableName};`);
  if (!rows.length) return;

  const colNames = columns.map((c) => c.name);
  const placeholders = colNames.map(() => "?").join(", ");
  const stmt = `INSERT INTO ${tableName} (${colNames.join(
    ", "
  )}) VALUES (${placeholders})`;

  await db.runAsync("BEGIN TRANSACTION;");
  for (const r of rows) {
    const vals = colNames.map((cn) => r[cn]);
    await db.runAsync(stmt, vals);
  }
  await db.runAsync("COMMIT;");
}

// ========== MAIN ==========

async function runETL() {
  console.log("🚀 Starting ETL for Co-Working Space...");

  const db = openDb(DB_FILE);
  try {
    // Extract
    const members = await db.allAsync("SELECT * FROM members");
    const spaces = await db.allAsync("SELECT * FROM spaces");
    const bookings = await db.allAsync("SELECT * FROM bookings");
    const subscriptions = await db.allAsync("SELECT * FROM subscriptions");

    // Transform
    const dim_member = transformMembers(members);
    const dim_space = transformSpaces(spaces);
    const dim_date = transformDates(bookings, subscriptions);
    const fact_revenue = buildFactRevenue(bookings, subscriptions, dim_date);

    // Load
    await replaceAndInsert(db, "dim_member", dim_member, [
      { name: "member_key" },
      { name: "member_id" },
      { name: "name" },
      { name: "email" },
      { name: "join_date" },
    ]);

    await replaceAndInsert(db, "dim_space", dim_space, [
      { name: "space_key" },
      { name: "space_id" },
      { name: "space_name" },
      { name: "type" },
      { name: "hourly_rate" },
    ]);

    await replaceAndInsert(db, "dim_date", dim_date, [
      { name: "date_key" },
      { name: "full_date" },
      { name: "year" },
      { name: "month" },
      { name: "day_of_week" },
    ]);

    await replaceAndInsert(db, "fact_revenue", fact_revenue, [
      { name: "revenue_key" },
      { name: "member_key" },
      { name: "space_key" },
      { name: "plan_key" },
      { name: "service_key" },
      { name: "date_key" },
      { name: "transaction_type" },
      { name: "amount" },
    ]);

    console.log("✅ ETL Success! Data loaded into coworking.db");
  } catch (err) {
    console.error("❌ ETL Error:", err);
  } finally {
    db.close();
  }
}

if (require.main === module) {
  runETL();
}

module.exports = { runETL };
