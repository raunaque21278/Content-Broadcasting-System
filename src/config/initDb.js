const db = require("./db");

const initDb = async () => {
  await db.query(`
    CREATE TYPE user_role AS ENUM ('principal', 'teacher');
  `).catch(() => {});

  await db.query(`
    CREATE TYPE content_status AS ENUM ('pending', 'approved', 'rejected');
  `).catch(() => {});

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role user_role NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS content_slots (
      id SERIAL PRIMARY KEY,
      subject VARCHAR(100) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS content (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      subject VARCHAR(100) NOT NULL,
      file_path VARCHAR(255) NOT NULL,
      file_type VARCHAR(50) NOT NULL,
      file_size INTEGER NOT NULL,
      uploaded_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status content_status DEFAULT 'pending',
      rejection_reason TEXT,
      approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      approved_at TIMESTAMP NULL,
      start_time TIMESTAMP NULL,
      end_time TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS content_schedule (
      id SERIAL PRIMARY KEY,
      content_id INTEGER NOT NULL REFERENCES content(id) ON DELETE CASCADE,
      slot_id INTEGER NOT NULL REFERENCES content_slots(id) ON DELETE CASCADE,
      rotation_order INTEGER NOT NULL,
      duration INTEGER NOT NULL DEFAULT 5,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS content_views (
      id SERIAL PRIMARY KEY,
      content_id INTEGER REFERENCES content(id) ON DELETE CASCADE,
      teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      subject VARCHAR(100),
      viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log("Database tables initialized successfully");
};

module.exports = initDb;