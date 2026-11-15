const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { createInitialSeedData, SEED_VERSION } = require('./seedData');

function getLocalDbPath() {
  if (process.env.UNICAMPUS_LOCAL_DB_PATH) {
    return process.env.UNICAMPUS_LOCAL_DB_PATH;
  }
  if (process.env.VERCEL) {
    return '/tmp/unicampus-local-db.json';
  }
  return path.join(__dirname, '..', 'data', 'local-db.json');
}

let pgPool = null;
let usingPostgres = false;
let localStore = null;
let loadedLocalDbPath = null;

function ensureLocalStore() {
  const dbPath = getLocalDbPath();
  if (localStore && loadedLocalDbPath === dbPath) return localStore;
  loadedLocalDbPath = dbPath;
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (fs.existsSync(dbPath)) {
    try {
      localStore = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      const seed = createInitialSeedData();
      let changed = false;
      if (!Array.isArray(localStore.announcements)) {
        localStore.announcements = seed.announcements;
        changed = true;
      }
      if (!Array.isArray(localStore.student_life_events)) {
        localStore.student_life_events = seed.student_life_events;
        changed = true;
      }
      if (!Array.isArray(localStore.lms_integrations)) {
        localStore.lms_integrations = seed.lms_integrations;
        changed = true;
      }
      if (!localStore.ai_quota) {
        localStore.ai_quota = seed.ai_quota;
        changed = true;
      }
      // Upgrade legacy stores to v3-3groups-3courses schema cleanly
      if (localStore.seed_version !== SEED_VERSION) {
        const preservedCustomUsers = (localStore.users || []).filter(
          (u) => !seed.users.some((su) => su.email === u.email) && u.email !== 'danial@unicampus.kz'
        );
        localStore = {
          ...seed,
          users: [...seed.users, ...preservedCustomUsers],
        };
        changed = true;
      } else {
        const allIds = (localStore.courses || []).map((c) => c.id);
        for (const u of localStore.users || []) {
          if (u.role === 'student' && (!Array.isArray(u.enrolled_course_ids) || u.enrolled_course_ids.length === 0)) {
            u.enrolled_course_ids = allIds.slice(0, 3);
            changed = true;
          }
        }
      }
      // Remove any stale grant wording from seeded announcement if present
      if (Array.isArray(localStore.announcements)) {
        const ann3Seed = seed.announcements.find((a) => a.id === 'ann-3');
        localStore.announcements = localStore.announcements.map((a) => {
          if (a.id === 'ann-3' && /grant|3\.50/i.test(String(a.description || '')) && ann3Seed) {
            changed = true;
            return { ...a, description: ann3Seed.description };
          }
          return a;
        });
      }
      if (changed) saveLocalStore();
      return localStore;
    } catch (err) {
      console.warn('[DB] Corrupted local-db.json, recreating from seed...', err.message);
    }
  }
  localStore = createInitialSeedData();
  saveLocalStore();
  return localStore;
}

function saveLocalStore() {
  if (!localStore) return;
  const dbPath = getLocalDbPath();
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(dbPath, JSON.stringify(localStore, null, 2), 'utf8');
}

const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  group_name TEXT,
  department TEXT,
  enrolled_course_ids JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS enrolled_course_ids JSONB DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  credits INTEGER NOT NULL DEFAULT 5,
  teacher_id TEXT REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS grades (
  id TEXT PRIMARY KEY,
  student_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
  teacher_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  score DOUBLE PRECISION NOT NULL,
  feedback TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  student_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'present',
  UNIQUE(student_id, course_id, date)
);

CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
  group_name TEXT NOT NULL DEFAULT 'ALL',
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  due_date TEXT NOT NULL,
  category TEXT DEFAULT 'assignment',
  weight TEXT DEFAULT '10%',
  status TEXT DEFAULT 'todo',
  personal_note TEXT DEFAULT '',
  grade TEXT
);

ALTER TABLE assignments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'todo';
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS personal_note TEXT DEFAULT '';
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS grade TEXT;

CREATE TABLE IF NOT EXISTS schedule (
  id TEXT PRIMARY KEY,
  course_id TEXT,
  course_name TEXT NOT NULL,
  course_code TEXT NOT NULL,
  professor TEXT NOT NULL,
  group_name TEXT NOT NULL DEFAULT 'CS-2401',
  week_start TEXT NOT NULL DEFAULT 'recurring',
  day TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  time_row_index INTEGER NOT NULL DEFAULT 1,
  duration_hours DOUBLE PRECISION NOT NULL DEFAULT 1,
  room TEXT NOT NULL,
  building TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'blue'
);

ALTER TABLE schedule ADD COLUMN IF NOT EXISTS week_start TEXT NOT NULL DEFAULT 'recurring';

CREATE TABLE IF NOT EXISTS room_bookings (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  user_name TEXT NOT NULL DEFAULT 'Student',
  user_role TEXT NOT NULL DEFAULT 'student',
  room_number TEXT NOT NULL,
  building_name TEXT NOT NULL,
  date TEXT NOT NULL,
  time_slot TEXT NOT NULL,
  purpose TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  course_code TEXT,
  room TEXT,
  timestamp TEXT NOT NULL,
  description TEXT NOT NULL,
  unread BOOLEAN NOT NULL DEFAULT TRUE,
  type TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_life_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  organizer TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'hackathon',
  date TEXT NOT NULL,
  location TEXT NOT NULL,
  room TEXT,
  prize_or_perks TEXT,
  is_sponsored BOOLEAN NOT NULL DEFAULT FALSE,
  registered BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lms_integrations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  protocol TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'connected',
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  synced_courses INTEGER NOT NULL DEFAULT 0,
  synced_grades INTEGER NOT NULL DEFAULT 0,
  synced_students INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ai_quota (
  id TEXT PRIMARY KEY,
  used_tokens INTEGER NOT NULL DEFAULT 1420,
  monthly_quota INTEGER NOT NULL DEFAULT 10000,
  queries_count INTEGER NOT NULL DEFAULT 14,
  tier TEXT NOT NULL DEFAULT 'B2B Institutional Metered Tier'
);
`;

async function seedPostgresIfNeeded(pool, force = false) {
  const client = await pool.connect();
  try {
    await client.query(CREATE_TABLES_SQL);

    const { rows } = await client.query('SELECT COUNT(*)::int AS count FROM users');
    if (rows[0].count > 0 && !force) {
      console.log(`[DB] PostgreSQL already has ${rows[0].count} users. Skipping initial seed.`);
      return;
    }

    console.log('[DB] Seeding PostgreSQL database with demo Student, Teacher & Admin accounts...');
    const seed = createInitialSeedData();

    await client.query('BEGIN');
    if (force) {
      await client.query(
        'TRUNCATE ai_quota, lms_integrations, student_life_events, announcements, room_bookings, schedule, assignments, attendance, grades, courses, users CASCADE'
      );
    }

    for (const u of seed.users) {
      await client.query(
        `INSERT INTO users (id, email, password_hash, full_name, role, group_name, department, enrolled_course_ids, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
         ON CONFLICT (email) DO NOTHING`,
        [
          u.id,
          u.email,
          u.password_hash,
          u.full_name,
          u.role,
          u.group_name,
          u.department,
          JSON.stringify(u.enrolled_course_ids || []),
          u.created_at,
        ]
      );
    }

    for (const c of seed.courses) {
      await client.query(
        `INSERT INTO courses (id, title, code, credits, teacher_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (code) DO NOTHING`,
        [c.id, c.title, c.code, c.credits, c.teacher_id]
      );
    }

    for (const g of seed.grades) {
      await client.query(
        `INSERT INTO grades (id, student_id, course_id, teacher_id, category, score, feedback, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [g.id, g.student_id, g.course_id, g.teacher_id, g.category, g.score, g.feedback, g.updated_at]
      );
    }

    for (const a of seed.attendance) {
      await client.query(
        `INSERT INTO attendance (id, student_id, course_id, date, status)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (student_id, course_id, date) DO UPDATE SET status = EXCLUDED.status`,
        [a.id, a.student_id, a.course_id, a.date, a.status]
      );
    }

    for (const asg of seed.assignments) {
      await client.query(
        `INSERT INTO assignments (id, course_id, group_name, title, description, due_date, category, weight, status, personal_note, grade)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO NOTHING`,
        [
          asg.id,
          asg.course_id,
          asg.group_name,
          asg.title,
          asg.description,
          asg.due_date,
          asg.category,
          asg.weight,
          asg.status || 'todo',
          asg.personal_note || '',
          asg.grade || null,
        ]
      );
    }

    for (const s of seed.schedule) {
      await client.query(
        `INSERT INTO schedule (id, course_id, course_name, course_code, professor, group_name, week_start, day, start_time, end_time, time_row_index, duration_hours, room, building, color)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (id) DO NOTHING`,
        [
          s.id,
          s.course_id,
          s.course_name,
          s.course_code,
          s.professor,
          s.group_name,
          s.week_start || 'recurring',
          s.day,
          s.start_time,
          s.end_time,
          s.time_row_index,
          s.duration_hours,
          s.room,
          s.building,
          s.color,
        ]
      );
    }

    for (const b of seed.room_bookings) {
      await client.query(
        `INSERT INTO room_bookings (id, user_id, user_name, user_role, room_number, building_name, date, time_slot, purpose, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO NOTHING`,
        [
          b.id,
          b.user_id,
          b.user_name,
          b.user_role,
          b.room_number,
          b.building_name,
          b.date,
          b.time_slot,
          b.purpose,
          b.status,
          b.created_at,
        ]
      );
    }

    for (const ann of seed.announcements) {
      await client.query(
        `INSERT INTO announcements (id, title, course_code, room, timestamp, description, unread, type, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [ann.id, ann.title, ann.course_code, ann.room, ann.timestamp, ann.description, ann.unread, ann.type, ann.created_at]
      );
    }

    for (const evt of seed.student_life_events) {
      await client.query(
        `INSERT INTO student_life_events (id, title, organizer, category, date, location, room, prize_or_perks, is_sponsored, registered, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO NOTHING`,
        [
          evt.id,
          evt.title,
          evt.organizer,
          evt.category,
          evt.date,
          evt.location,
          evt.room,
          evt.prize_or_perks,
          evt.is_sponsored,
          evt.registered,
          evt.description,
        ]
      );
    }

    for (const lms of seed.lms_integrations) {
      await client.query(
        `INSERT INTO lms_integrations (id, name, protocol, status, last_synced_at, synced_courses, synced_grades, synced_students)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [lms.id, lms.name, lms.protocol, lms.status, lms.last_synced_at, lms.synced_courses, lms.synced_grades, lms.synced_students]
      );
    }

    await client.query(
      `INSERT INTO ai_quota (id, used_tokens, monthly_quota, queries_count, tier)
       VALUES ('default', $1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [seed.ai_quota.used_tokens, seed.ai_quota.monthly_quota, seed.ai_quota.queries_count, seed.ai_quota.tier]
    );

    await client.query('COMMIT');
    console.log('[DB] PostgreSQL seed complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function initDatabase(forceSeed = false) {
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && dbUrl.startsWith('postgres')) {
    try {
      const isLocal = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
      pgPool = new Pool({
        connectionString: dbUrl,
        ssl: isLocal ? false : { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
      });
      await pgPool.query('SELECT 1');
      usingPostgres = true;
      console.log('[DB] Connected to PostgreSQL database successfully.');
      await seedPostgresIfNeeded(pgPool, forceSeed);
      return { engine: 'postgresql' };
    } catch (err) {
      console.warn('[DB] PostgreSQL connection failed, falling back to persistent local DB:', err.message);
      usingPostgres = false;
      pgPool = null;
    }
  }

  if (forceSeed) {
    localStore = createInitialSeedData();
    loadedLocalDbPath = getLocalDbPath();
    saveLocalStore();
  } else {
    ensureLocalStore();
  }
  console.log(`[DB] Using persistent local database at ${getLocalDbPath()}`);
  return { engine: 'local-json' };
}

function scoreToGpaPoints(score) {
  if (score >= 95) return 4.0;
  if (score >= 90) return 3.67;
  if (score >= 85) return 3.33;
  if (score >= 80) return 3.0;
  if (score >= 75) return 2.67;
  if (score >= 70) return 2.33;
  if (score >= 65) return 2.0;
  if (score >= 60) return 1.67;
  if (score >= 55) return 1.33;
  if (score >= 50) return 1.0;
  return 0.0;
}

function calculateStudentGpa(grades, courses) {
  if (!grades || grades.length === 0) return 3.78;
  const courseMap = new Map(courses.map((c) => [c.id, c]));
  const byCourse = new Map();

  for (const g of grades) {
    if (!byCourse.has(g.course_id)) {
      byCourse.set(g.course_id, []);
    }
    byCourse.get(g.course_id).push(Number(g.score));
  }

  let totalWeightedPoints = 0;
  let totalCredits = 0;

  for (const [courseId, scores] of byCourse.entries()) {
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const credits = courseMap.get(courseId)?.credits || 5;
    totalWeightedPoints += scoreToGpaPoints(avgScore) * credits;
    totalCredits += credits;
  }

  if (totalCredits === 0) return 3.78;
  return Number((totalWeightedPoints / totalCredits).toFixed(2));
}

const db = {
  getEngine() {
    return usingPostgres ? 'postgresql' : 'local-json';
  },

  async findUserByEmail(email) {
    const normalized = String(email || '').trim().toLowerCase();
    if (usingPostgres) {
      const { rows } = await pgPool.query('SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1', [normalized]);
      return rows[0] || null;
    }
    const store = ensureLocalStore();
    return store.users.find((u) => u.email.toLowerCase() === normalized) || null;
  },

  async findUserById(id) {
    if (usingPostgres) {
      const { rows } = await pgPool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
      return rows[0] || null;
    }
    const store = ensureLocalStore();
    return store.users.find((u) => u.id === id) || null;
  },

  async createUser({ email, password_hash, full_name, role, group_name, department, enrolled_course_ids }) {
    const validRole = ['student', 'teacher', 'admin'].includes(role) ? role : 'student';
    const id = `usr-${validRole}-${Date.now()}`;
    const created_at = new Date().toISOString();

    let resolvedCourseIds = Array.isArray(enrolled_course_ids) ? enrolled_course_ids : [];
    if (validRole === 'student' && resolvedCourseIds.length === 0) {
      const existingCourses = await this.getCourses();
      resolvedCourseIds = existingCourses.map((c) => c.id);
    }

    const user = {
      id,
      email: email.trim().toLowerCase(),
      password_hash,
      full_name: full_name.trim(),
      role: validRole,
      group_name: validRole === 'student' ? (group_name || 'CS-2401') : null,
      department: validRole !== 'student' ? (department || 'Computer Science & Software Engineering') : null,
      enrolled_course_ids: resolvedCourseIds,
      created_at,
    };

    if (usingPostgres) {
      await pgPool.query(
        `INSERT INTO users (id, email, password_hash, full_name, role, group_name, department, enrolled_course_ids, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)`,
        [
          user.id,
          user.email,
          user.password_hash,
          user.full_name,
          user.role,
          user.group_name,
          user.department,
          JSON.stringify(user.enrolled_course_ids || []),
          user.created_at,
        ]
      );
      return user;
    }

    const store = ensureLocalStore();
    store.users.push(user);
    saveLocalStore();
    return user;
  },

  async getStudents(groupName) {
    if (usingPostgres) {
      if (groupName && groupName !== 'all' && groupName !== 'ALL') {
        const { rows } = await pgPool.query(
          `SELECT id, email, full_name, role, group_name, enrolled_course_ids, created_at FROM users WHERE role = 'student' AND group_name = $1 ORDER BY full_name ASC`,
          [groupName]
        );
        return rows;
      }
      const { rows } = await pgPool.query(
        `SELECT id, email, full_name, role, group_name, enrolled_course_ids, created_at FROM users WHERE role = 'student' ORDER BY group_name ASC, full_name ASC`
      );
      return rows;
    }

    const store = ensureLocalStore();
    return store.users
      .filter((u) => u.role === 'student' && (!groupName || groupName === 'all' || groupName === 'ALL' || u.group_name === groupName))
      .map(({ password_hash: _password_hash, ...rest }) => rest);
  },

  async getTeachers() {
    if (usingPostgres) {
      const { rows } = await pgPool.query(
        `SELECT id, email, full_name, role, department, enrolled_course_ids, created_at FROM users WHERE role = 'teacher' ORDER BY full_name ASC`
      );
      return rows;
    }
    const store = ensureLocalStore();
    return store.users
      .filter((u) => u.role === 'teacher')
      .map(({ password_hash: _password_hash, ...rest }) => rest);
  },

  async getCourses() {
    if (usingPostgres) {
      const { rows } = await pgPool.query(
        `SELECT c.*, u.full_name AS teacher_name
         FROM courses c
         LEFT JOIN users u ON u.id = c.teacher_id
         ORDER BY c.code ASC`
      );
      return rows;
    }
    const store = ensureLocalStore();
    return store.courses.map((c) => {
      const teacher = store.users.find((u) => u.id === c.teacher_id);
      return { ...c, teacher_name: teacher ? teacher.full_name : 'University Professor' };
    });
  },

  async createCourse({ title, code, credits, teacher_id }) {
    const cleanCode = String(code || '')
      .trim()
      .toUpperCase();
    const id = `crs-${cleanCode.toLowerCase()}-${Date.now().toString().slice(-4)}`;
    const record = {
      id,
      title: String(title || '').trim(),
      code: cleanCode,
      credits: Number(credits) || 5,
      teacher_id: teacher_id || 'usr-teacher-1',
    };

    if (usingPostgres) {
      await pgPool.query(
        `INSERT INTO courses (id, title, code, credits, teacher_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (code) DO UPDATE SET title = EXCLUDED.title, credits = EXCLUDED.credits, teacher_id = EXCLUDED.teacher_id`,
        [record.id, record.title, record.code, record.credits, record.teacher_id]
      );
      const courses = await this.getCourses();
      return courses.find((c) => c.code === cleanCode);
    }

    const store = ensureLocalStore();
    const existing = store.courses.find((c) => c.code.toUpperCase() === cleanCode);
    if (existing) {
      existing.title = record.title;
      existing.credits = record.credits;
      existing.teacher_id = record.teacher_id;
    } else {
      store.courses.push(record);
    }
    saveLocalStore();
    const courses = await this.getCourses();
    return courses.find((c) => c.code === cleanCode);
  },

  async updateCourse(id, { title, code, credits, teacher_id }) {
    if (usingPostgres) {
      const current = await pgPool.query('SELECT * FROM courses WHERE id = $1 OR code = $1 LIMIT 1', [id]);
      if (current.rows.length === 0) return null;
      const target = current.rows[0];
      const nextTitle = title ? title.trim() : target.title;
      const nextCode = code ? code.trim().toUpperCase() : target.code;
      const nextCredits = credits !== undefined ? Number(credits) : target.credits;
      const nextTeacher = teacher_id || target.teacher_id;

      await pgPool.query(
        `UPDATE courses SET title = $1, code = $2, credits = $3, teacher_id = $4 WHERE id = $5`,
        [nextTitle, nextCode, nextCredits, nextTeacher, target.id]
      );

      // Update schedule professor name if teacher was reassigned
      const teacherRow = await this.findUserById(nextTeacher);
      if (teacherRow) {
        await pgPool.query(
          `UPDATE schedule SET professor = $1 WHERE course_id = $2 OR course_code = $3`,
          [teacherRow.full_name, target.id, nextCode]
        );
      }

      const courses = await this.getCourses();
      return courses.find((c) => c.id === target.id);
    }

    const store = ensureLocalStore();
    const course = store.courses.find((c) => c.id === id || c.code === id);
    if (!course) return null;
    if (title) course.title = title.trim();
    if (code) course.code = code.trim().toUpperCase();
    if (credits !== undefined) course.credits = Number(credits);
    if (teacher_id) {
      course.teacher_id = teacher_id;
      const teacher = store.users.find((u) => u.id === teacher_id);
      if (teacher) {
        store.schedule.forEach((s) => {
          if (s.course_id === course.id || s.course_code.startsWith(course.code)) {
            s.professor = teacher.full_name;
          }
        });
      }
    }
    saveLocalStore();
    const courses = await this.getCourses();
    return courses.find((c) => c.id === course.id);
  },

  async deleteCourse(id) {
    if (usingPostgres) {
      await pgPool.query('DELETE FROM courses WHERE id = $1 OR code = $1', [id]);
      return true;
    }
    const store = ensureLocalStore();
    store.courses = store.courses.filter((c) => c.id !== id && c.code !== id);
    saveLocalStore();
    return true;
  },

  async getGrades({ studentId, courseId, groupName } = {}) {
    if (usingPostgres) {
      let query = `
        SELECT g.*,
               c.code AS course_code,
               c.title AS course_title,
               c.credits AS course_credits,
               s.full_name AS student_name,
               s.email AS student_email,
               s.group_name AS student_group,
               t.full_name AS teacher_name
        FROM grades g
        JOIN courses c ON c.id = g.course_id
        JOIN users s ON s.id = g.student_id
        LEFT JOIN users t ON t.id = g.teacher_id
        WHERE 1=1
      `;
      const params = [];
      if (studentId) {
        params.push(studentId);
        query += ` AND g.student_id = $${params.length}`;
      }
      if (courseId && courseId !== 'all') {
        params.push(courseId);
        query += ` AND (g.course_id = $${params.length} OR c.code = $${params.length})`;
      }
      if (groupName && groupName !== 'all' && groupName !== 'ALL') {
        params.push(groupName);
        query += ` AND s.group_name = $${params.length}`;
      }
      query += ' ORDER BY g.updated_at DESC';
      const { rows } = await pgPool.query(query, params);
      return rows;
    }

    const store = ensureLocalStore();
    return store.grades
      .map((g) => {
        const course = store.courses.find((c) => c.id === g.course_id) || {};
        const student = store.users.find((u) => u.id === g.student_id) || {};
        const teacher = store.users.find((u) => u.id === g.teacher_id) || {};
        return {
          ...g,
          course_code: course.code || 'CRS101',
          course_title: course.title || 'Course',
          course_credits: course.credits || 5,
          student_name: student.full_name || 'Student',
          student_email: student.email || '',
          student_group: student.group_name || 'CS-2401',
          teacher_name: teacher.full_name || 'Dr. Yersultan M.',
        };
      })
      .filter((g) => {
        if (studentId && g.student_id !== studentId) return false;
        if (courseId && courseId !== 'all' && g.course_id !== courseId && g.course_code !== courseId) return false;
        if (groupName && groupName !== 'all' && groupName !== 'ALL' && g.student_group !== groupName) return false;
        return true;
      });
  },

  async upsertGrade({ id, student_id, course_id, teacher_id, category, score, feedback }) {
    const updated_at = new Date().toISOString();
    const numericScore = Math.max(0, Math.min(100, Number(score)));

    if (usingPostgres) {
      const existing = id
        ? await pgPool.query('SELECT id FROM grades WHERE id = $1', [id])
        : await pgPool.query(
            'SELECT id FROM grades WHERE student_id = $1 AND course_id = $2 AND category = $3 LIMIT 1',
            [student_id, course_id, category]
          );

      if (existing.rows.length > 0) {
        const targetId = existing.rows[0].id;
        await pgPool.query(
          `UPDATE grades
           SET score = $1, feedback = $2, teacher_id = $3, category = $4, updated_at = $5
           WHERE id = $6`,
          [numericScore, feedback || '', teacher_id, category, updated_at, targetId]
        );
        const grades = await this.getGrades({ studentId: student_id });
        return grades.find((g) => g.id === targetId);
      } else {
        const newId = `grd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        await pgPool.query(
          `INSERT INTO grades (id, student_id, course_id, teacher_id, category, score, feedback, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [newId, student_id, course_id, teacher_id, category, numericScore, feedback || '', updated_at]
        );
        const grades = await this.getGrades({ studentId: student_id });
        return grades.find((g) => g.id === newId);
      }
    }

    const store = ensureLocalStore();
    let record = store.grades.find(
      (g) => (id && g.id === id) || (g.student_id === student_id && g.course_id === course_id && g.category === category)
    );
    if (record) {
      record.score = numericScore;
      record.feedback = feedback !== undefined ? feedback : record.feedback;
      record.teacher_id = teacher_id || record.teacher_id;
      record.category = category || record.category;
      record.updated_at = updated_at;
    } else {
      record = {
        id: `grd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        student_id,
        course_id,
        teacher_id,
        category,
        score: numericScore,
        feedback: feedback || '',
        updated_at,
      };
      store.grades.unshift(record);
    }
    saveLocalStore();
    const all = await this.getGrades({ studentId: student_id });
    return all.find((g) => g.id === record.id);
  },

  async getAttendance({ studentId, courseId, date, groupName } = {}) {
    if (usingPostgres) {
      let query = `
        SELECT a.*,
               c.code AS course_code,
               c.title AS course_title,
               s.full_name AS student_name,
               s.group_name AS student_group
        FROM attendance a
        JOIN courses c ON c.id = a.course_id
        JOIN users s ON s.id = a.student_id
        WHERE 1=1
      `;
      const params = [];
      if (studentId) {
        params.push(studentId);
        query += ` AND a.student_id = $${params.length}`;
      }
      if (courseId && courseId !== 'all') {
        params.push(courseId);
        query += ` AND (a.course_id = $${params.length} OR c.code = $${params.length})`;
      }
      if (date) {
        params.push(date);
        query += ` AND a.date = $${params.length}`;
      }
      if (groupName && groupName !== 'all' && groupName !== 'ALL') {
        params.push(groupName);
        query += ` AND s.group_name = $${params.length}`;
      }
      query += ' ORDER BY a.date DESC';
      const { rows } = await pgPool.query(query, params);
      return rows;
    }

    const store = ensureLocalStore();
    return store.attendance
      .map((a) => {
        const course = store.courses.find((c) => c.id === a.course_id) || {};
        const student = store.users.find((u) => u.id === a.student_id) || {};
        return {
          ...a,
          course_code: course.code || 'CRS101',
          course_title: course.title || 'Course',
          student_name: student.full_name || 'Student',
          student_group: student.group_name || 'CS-2401',
        };
      })
      .filter((a) => {
        if (studentId && a.student_id !== studentId) return false;
        if (courseId && courseId !== 'all' && a.course_id !== courseId && a.course_code !== courseId) return false;
        if (date && a.date !== date) return false;
        if (groupName && groupName !== 'all' && groupName !== 'ALL' && a.student_group !== groupName) return false;
        return true;
      });
  },

  async upsertAttendance({ student_id, course_id, date, status }) {
    const validStatus = ['present', 'absent', 'late'].includes(status) ? status : 'present';

    if (usingPostgres) {
      const id = `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await pgPool.query(
        `INSERT INTO attendance (id, student_id, course_id, date, status)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (student_id, course_id, date)
         DO UPDATE SET status = EXCLUDED.status`,
        [id, student_id, course_id, date, validStatus]
      );
      const rows = await this.getAttendance({ studentId: student_id, courseId: course_id, date });
      return rows[0];
    }

    const store = ensureLocalStore();
    let rec = store.attendance.find(
      (a) => a.student_id === student_id && a.course_id === course_id && a.date === date
    );
    if (rec) {
      rec.status = validStatus;
    } else {
      rec = {
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        student_id,
        course_id,
        date,
        status: validStatus,
      };
      store.attendance.push(rec);
    }
    saveLocalStore();
    const rows = await this.getAttendance({ studentId: student_id, courseId: course_id, date });
    return rows[0];
  },

  async getAssignments({ groupName, courseId, courseIds } = {}) {
    if (usingPostgres) {
      let query = `
        SELECT a.*, c.code AS course_code, c.title AS course_name, u.full_name AS teacher_name
        FROM assignments a
        JOIN courses c ON c.id = a.course_id
        LEFT JOIN users u ON u.id = c.teacher_id
        WHERE 1=1
      `;
      const params = [];
      if (groupName && groupName !== 'all' && groupName !== 'ALL') {
        params.push(groupName);
        query += ` AND (a.group_name = $${params.length} OR a.group_name = 'ALL')`;
      }
      if (courseId && courseId !== 'all') {
        params.push(courseId);
        query += ` AND (a.course_id = $${params.length} OR c.code = $${params.length})`;
      }
      if (Array.isArray(courseIds) && courseIds.length > 0) {
        params.push(courseIds);
        query += ` AND a.course_id = ANY($${params.length}::text[])`;
      }
      const { rows } = await pgPool.query(query, params);
      return rows;
    }

    const store = ensureLocalStore();
    return store.assignments
      .map((a) => {
        const course = store.courses.find((c) => c.id === a.course_id) || {};
        const teacher = store.users.find((u) => u.id === course.teacher_id);
        return {
          ...a,
          course_code: course.code || 'CRS101',
          course_name: course.title || 'Course',
          teacher_name: teacher ? teacher.full_name : undefined,
        };
      })
      .filter((a) => {
        if (
          groupName &&
          groupName !== 'all' &&
          groupName !== 'ALL' &&
          a.group_name !== groupName &&
          a.group_name !== 'ALL'
        ) {
          return false;
        }
        if (courseId && courseId !== 'all' && a.course_id !== courseId && a.course_code !== courseId) {
          return false;
        }
        if (Array.isArray(courseIds) && courseIds.length > 0 && !courseIds.includes(a.course_id)) {
          return false;
        }
        return true;
      });
  },

  async createAssignment({ course_id, group_name, title, description, due_date, category, weight, status, personal_note, grade }) {
    const id = `asg-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const defaultDue = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fallbackDueDate = `${months[defaultDue.getUTCMonth()]} ${String(defaultDue.getUTCDate()).padStart(2, '0')}, 23:59`;
    const record = {
      id,
      course_id,
      group_name: group_name || 'CS-2401',
      title: title.trim(),
      description: description || '',
      due_date: due_date || fallbackDueDate,
      category: category || 'assignment',
      weight: weight || '10%',
      status: ['todo', 'submitted', 'graded'].includes(status) ? status : 'todo',
      personal_note: personal_note || '',
      grade: grade || null,
    };

    if (usingPostgres) {
      await pgPool.query(
        `INSERT INTO assignments (id, course_id, group_name, title, description, due_date, category, weight, status, personal_note, grade)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          record.id,
          record.course_id,
          record.group_name,
          record.title,
          record.description,
          record.due_date,
          record.category,
          record.weight,
          record.status,
          record.personal_note,
          record.grade,
        ]
      );
      const list = await this.getAssignments();
      return list.find((a) => a.id === id);
    }

    const store = ensureLocalStore();
    store.assignments.unshift(record);
    saveLocalStore();
    const list = await this.getAssignments();
    return list.find((a) => a.id === id);
  },

  async updateAssignment(id, patch = {}) {
    if (usingPostgres) {
      const { rows: existing } = await pgPool.query('SELECT * FROM assignments WHERE id = $1', [id]);
      if (!existing[0]) return null;
      const cur = existing[0];
      const nextStatus =
        patch.status !== undefined && ['todo', 'submitted', 'graded'].includes(patch.status)
          ? patch.status
          : cur.status;
      const nextNote =
        patch.personal_note !== undefined ? String(patch.personal_note) : cur.personal_note;
      const nextDesc =
        patch.description !== undefined ? String(patch.description) : cur.description;
      const nextTitle =
        patch.title !== undefined && String(patch.title).trim()
          ? String(patch.title).trim()
          : cur.title;
      const nextDue = patch.due_date !== undefined ? String(patch.due_date) : cur.due_date;
      const nextGrade = patch.grade !== undefined ? patch.grade : cur.grade;
      const nextCategory = patch.category !== undefined ? String(patch.category) : cur.category;
      const nextWeight = patch.weight !== undefined ? String(patch.weight) : cur.weight;
      const nextGroupName = patch.group_name !== undefined ? String(patch.group_name) : cur.group_name;
      const nextCourseId = patch.course_id !== undefined ? String(patch.course_id) : cur.course_id;

      await pgPool.query(
        `UPDATE assignments
         SET status = $1, personal_note = $2, description = $3, title = $4, due_date = $5, grade = $6,
             category = $7, weight = $8, group_name = $9, course_id = $10
         WHERE id = $11`,
        [
          nextStatus,
          nextNote,
          nextDesc,
          nextTitle,
          nextDue,
          nextGrade,
          nextCategory,
          nextWeight,
          nextGroupName,
          nextCourseId,
          id,
        ]
      );
      const list = await this.getAssignments();
      return list.find((a) => a.id === id) || null;
    }

    const store = ensureLocalStore();
    const idx = store.assignments.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    const cur = store.assignments[idx];
    store.assignments[idx] = {
      ...cur,
      ...(patch.status !== undefined && ['todo', 'submitted', 'graded'].includes(patch.status)
        ? { status: patch.status }
        : {}),
      ...(patch.personal_note !== undefined ? { personal_note: String(patch.personal_note) } : {}),
      ...(patch.description !== undefined ? { description: String(patch.description) } : {}),
      ...(patch.title !== undefined && String(patch.title).trim()
        ? { title: String(patch.title).trim() }
        : {}),
      ...(patch.due_date !== undefined ? { due_date: String(patch.due_date) } : {}),
      ...(patch.grade !== undefined ? { grade: patch.grade } : {}),
      ...(patch.category !== undefined ? { category: String(patch.category) } : {}),
      ...(patch.weight !== undefined ? { weight: String(patch.weight) } : {}),
      ...(patch.group_name !== undefined ? { group_name: String(patch.group_name) } : {}),
      ...(patch.course_id !== undefined ? { course_id: String(patch.course_id) } : {}),
    };
    saveLocalStore();
    const list = await this.getAssignments();
    return list.find((a) => a.id === id) || null;
  },

  async deleteAssignment(id) {
    if (usingPostgres) {
      await pgPool.query('DELETE FROM assignments WHERE id = $1', [id]);
      return true;
    }
    const store = ensureLocalStore();
    store.assignments = store.assignments.filter((a) => a.id !== id);
    saveLocalStore();
    return true;
  },

  async getSchedule({ groupName, courseIds, weekStart } = {}) {
    if (usingPostgres) {
      let query = `
        SELECT s.*, COALESCE(u.full_name, s.professor) AS resolved_professor, c.id AS matched_course_id
        FROM schedule s
        LEFT JOIN courses c ON (s.course_id = c.id OR UPPER(s.course_code) = UPPER(c.code))
        LEFT JOIN users u ON c.teacher_id = u.id
        WHERE 1=1
      `;
      const params = [];
      if (groupName && groupName !== 'all' && groupName !== 'ALL') {
        params.push(groupName);
        query += ` AND (s.group_name = $${params.length} OR s.group_name = 'ALL')`;
      }
      if (Array.isArray(courseIds) && courseIds.length > 0) {
        params.push(courseIds);
        query += ` AND (COALESCE(s.course_id, c.id) = ANY($${params.length}::text[]) OR COALESCE(s.course_id, c.id) IS NULL)`;
      }
      if (weekStart && weekStart !== 'all') {
        params.push(weekStart);
        query += ` AND (s.week_start = $${params.length} OR s.week_start = 'recurring' OR s.week_start IS NULL)`;
      }
      query += ' ORDER BY s.time_row_index ASC';
      const { rows } = await pgPool.query(query, params);
      return rows.map(({ resolved_professor, matched_course_id, ...row }) => ({
        ...row,
        course_id: row.course_id || matched_course_id || null,
        week_start: row.week_start || 'recurring',
        professor: resolved_professor || row.professor,
      }));
    }

    const store = ensureLocalStore();
    return store.schedule
      .map((s) => {
        const course = store.courses.find(
          (c) =>
            (s.course_id && c.id === s.course_id) ||
            (s.course_code && c.code.toUpperCase() === String(s.course_code).toUpperCase())
        );
        const teacher = course ? store.users.find((u) => u.id === course.teacher_id) : null;
        return {
          ...s,
          course_id: s.course_id || (course ? course.id : null),
          week_start: s.week_start || 'recurring',
          professor: teacher ? teacher.full_name : s.professor,
        };
      })
      .filter((s) => {
        if (groupName && groupName !== 'all' && groupName !== 'ALL') {
          if (s.group_name !== groupName && s.group_name !== 'ALL' && s.group_name) {
            return false;
          }
        }
        if (Array.isArray(courseIds) && courseIds.length > 0) {
          if (s.course_id && !courseIds.includes(s.course_id)) {
            return false;
          }
        }
        if (weekStart && weekStart !== 'all') {
          if (s.week_start !== weekStart && s.week_start !== 'recurring') {
            return false;
          }
        }
        return true;
      });
  },

  async createScheduleItem(item) {
    const courses = await this.getCourses();
    const matchedCourse = courses.find(
      (c) =>
        (item.course_id && c.id === item.course_id) ||
        (item.courseCode && c.code.toUpperCase() === String(item.courseCode).toUpperCase()) ||
        (item.course_code && c.code.toUpperCase() === String(item.course_code).toUpperCase())
    );
    const id = item.id || `sched-custom-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const record = {
      id,
      course_id: item.course_id || (matchedCourse ? matchedCourse.id : null),
      course_name: item.courseName || item.course_name || (matchedCourse ? matchedCourse.title : 'Course'),
      course_code: item.courseCode || item.course_code || (matchedCourse ? matchedCourse.code : 'CRS101'),
      professor: item.professor || (matchedCourse ? matchedCourse.teacher_name : 'University Professor'),
      group_name: item.group_name || item.groupName || 'CS-2401',
      week_start: item.weekStart || item.week_start || 'recurring',
      day: item.day || 'Mon',
      start_time: item.startTime || item.start_time || '10:00',
      end_time: item.endTime || item.end_time || '11:00',
      time_row_index: Number(item.timeRowIndex ?? item.time_row_index ?? 1),
      duration_hours: Number(item.durationHours ?? item.duration_hours ?? 1),
      room: item.room || 'C1.1.320',
      building: item.building || 'AITU Block C1.1',
      color: item.color || 'blue',
    };

    if (usingPostgres) {
      await pgPool.query(
        `INSERT INTO schedule (id, course_id, course_name, course_code, professor, group_name, week_start, day, start_time, end_time, time_row_index, duration_hours, room, building, color)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          record.id,
          record.course_id,
          record.course_name,
          record.course_code,
          record.professor,
          record.group_name,
          record.week_start,
          record.day,
          record.start_time,
          record.end_time,
          record.time_row_index,
          record.duration_hours,
          record.room,
          record.building,
          record.color,
        ]
      );
      return record;
    }

    const store = ensureLocalStore();
    store.schedule.push(record);
    saveLocalStore();
    return record;
  },

  async importScheduleItems(items = [], { replaceWeekStart } = {}) {
    if (!Array.isArray(items)) return [];
    if (replaceWeekStart && replaceWeekStart !== 'recurring') {
      if (usingPostgres) {
        await pgPool.query('DELETE FROM schedule WHERE week_start = $1', [replaceWeekStart]);
      } else {
        const store = ensureLocalStore();
        store.schedule = store.schedule.filter((s) => s.week_start !== replaceWeekStart);
        saveLocalStore();
      }
    }
    const created = [];
    for (const item of items) {
      const saved = await this.createScheduleItem(item);
      created.push(saved);
    }
    return created;
  },

  async updateScheduleItem(id, item) {
    if (usingPostgres) {
      const existing = await pgPool.query('SELECT * FROM schedule WHERE id = $1 LIMIT 1', [id]);
      if (existing.rows.length === 0) return null;
      const cur = existing.rows[0];
      const updated = {
        course_name: item.courseName || item.course_name || cur.course_name,
        course_code: item.courseCode || item.course_code || cur.course_code,
        professor: item.professor || cur.professor,
        group_name: item.groupName || item.group_name || cur.group_name,
        week_start: item.weekStart || item.week_start || cur.week_start || 'recurring',
        day: item.day || cur.day,
        start_time: item.startTime || item.start_time || cur.start_time,
        end_time: item.endTime || item.end_time || cur.end_time,
        time_row_index: Number(item.timeRowIndex ?? item.time_row_index ?? cur.time_row_index),
        room: item.room || cur.room,
        building: item.building || cur.building,
        color: item.color || cur.color,
      };
      const { rows } = await pgPool.query(
        `UPDATE schedule
         SET course_name = $1, course_code = $2, professor = $3, group_name = $4, week_start = $5, day = $6,
             start_time = $7, end_time = $8, time_row_index = $9, room = $10, building = $11, color = $12
         WHERE id = $13 RETURNING *`,
        [
          updated.course_name,
          updated.course_code,
          updated.professor,
          updated.group_name,
          updated.week_start,
          updated.day,
          updated.start_time,
          updated.end_time,
          updated.time_row_index,
          updated.room,
          updated.building,
          updated.color,
          id,
        ]
      );
      return rows[0];
    }

    const store = ensureLocalStore();
    const s = store.schedule.find((it) => it.id === id);
    if (!s) return null;
    if (item.courseName || item.course_name) s.course_name = item.courseName || item.course_name;
    if (item.courseCode || item.course_code) s.course_code = item.courseCode || item.course_code;
    if (item.professor) s.professor = item.professor;
    if (item.groupName || item.group_name) s.group_name = item.groupName || item.group_name;
    if (item.weekStart || item.week_start) s.week_start = item.weekStart || item.week_start;
    if (item.day) s.day = item.day;
    if (item.startTime || item.start_time) s.start_time = item.startTime || item.start_time;
    if (item.endTime || item.end_time) s.end_time = item.endTime || item.end_time;
    if (item.timeRowIndex !== undefined || item.time_row_index !== undefined) {
      s.time_row_index = Number(item.timeRowIndex ?? item.time_row_index);
    }
    if (item.room) s.room = item.room;
    if (item.building) s.building = item.building;
    if (item.color) s.color = item.color;
    saveLocalStore();
    return s;
  },

  async deleteScheduleItem(id) {
    if (usingPostgres) {
      await pgPool.query('DELETE FROM schedule WHERE id = $1', [id]);
      return true;
    }
    const store = ensureLocalStore();
    store.schedule = store.schedule.filter((s) => s.id !== id);
    saveLocalStore();
    return true;
  },

  async getRoomBookings() {
    if (usingPostgres) {
      const { rows } = await pgPool.query('SELECT * FROM room_bookings ORDER BY created_at DESC');
      return rows;
    }
    const store = ensureLocalStore();
    return store.room_bookings;
  },

  async createRoomBooking({ user_id, user_name, user_role, room_number, building_name, date, time_slot, purpose, status }) {
    const id = `bk-${Date.now()}`;
    const created_at = new Date().toISOString();
    const record = {
      id,
      user_id: user_id || null,
      user_name: user_name || 'Student',
      user_role: user_role || 'student',
      room_number: room_number || 'Study Room B',
      building_name: building_name || 'Main Library',
      date: date || new Date().toISOString().slice(0, 10),
      time_slot: time_slot || '14:00 - 16:00',
      purpose: purpose || 'Group study session',
      status: status || (user_role === 'teacher' || user_role === 'admin' ? 'confirmed' : 'pending'),
      created_at,
    };

    if (usingPostgres) {
      await pgPool.query(
        `INSERT INTO room_bookings (id, user_id, user_name, user_role, room_number, building_name, date, time_slot, purpose, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          record.id,
          record.user_id,
          record.user_name,
          record.user_role,
          record.room_number,
          record.building_name,
          record.date,
          record.time_slot,
          record.purpose,
          record.status,
          record.created_at,
        ]
      );
      return record;
    }

    const store = ensureLocalStore();
    store.room_bookings.unshift(record);
    saveLocalStore();
    return record;
  },

  async updateRoomBookingStatus(id, status) {
    const validStatus = ['confirmed', 'pending', 'rejected'].includes(status) ? status : 'confirmed';
    if (usingPostgres) {
      const { rows } = await pgPool.query(
        'UPDATE room_bookings SET status = $1 WHERE id = $2 RETURNING *',
        [validStatus, id]
      );
      return rows[0] || null;
    }
    const store = ensureLocalStore();
    const booking = store.room_bookings.find((b) => b.id === id);
    if (booking) {
      booking.status = validStatus;
      saveLocalStore();
    }
    return booking || null;
  },

  async getAnnouncements() {
    if (usingPostgres) {
      const { rows } = await pgPool.query('SELECT * FROM announcements ORDER BY created_at DESC');
      return rows;
    }
    const store = ensureLocalStore();
    return [...(store.announcements || [])];
  },

  async createAnnouncement({ title, course_code, room, timestamp, description, type, unread = true }) {
    const id = `ann-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const record = {
      id,
      title: String(title || 'Campus Notice').trim(),
      course_code: course_code || null,
      room: room || null,
      timestamp: timestamp || 'Just now',
      description: String(description || '').trim(),
      unread: Boolean(unread),
      type: ['schedule_change', 'deadline', 'scholarship', 'admin'].includes(type) ? type : 'admin',
      created_at: new Date().toISOString(),
    };

    if (usingPostgres) {
      await pgPool.query(
        `INSERT INTO announcements (id, title, course_code, room, timestamp, description, unread, type, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          record.id,
          record.title,
          record.course_code,
          record.room,
          record.timestamp,
          record.description,
          record.unread,
          record.type,
          record.created_at,
        ]
      );
      return record;
    }

    const store = ensureLocalStore();
    store.announcements = [record, ...(store.announcements || [])];
    saveLocalStore();
    return record;
  },

  async markAnnouncementRead(id, unread = false) {
    if (usingPostgres) {
      const { rows } = await pgPool.query(
        'UPDATE announcements SET unread = $1 WHERE id = $2 RETURNING *',
        [Boolean(unread), id]
      );
      return rows[0] || null;
    }
    const store = ensureLocalStore();
    const target = (store.announcements || []).find((a) => a.id === id);
    if (!target) return null;
    target.unread = Boolean(unread);
    saveLocalStore();
    return target;
  },

  async markAllAnnouncementsRead() {
    if (usingPostgres) {
      await pgPool.query('UPDATE announcements SET unread = FALSE');
      return this.getAnnouncements();
    }
    const store = ensureLocalStore();
    store.announcements = (store.announcements || []).map((a) => ({ ...a, unread: false }));
    saveLocalStore();
    return [...store.announcements];
  },

  async deleteAnnouncement(id) {
    if (usingPostgres) {
      await pgPool.query('DELETE FROM announcements WHERE id = $1', [id]);
      return true;
    }
    const store = ensureLocalStore();
    store.announcements = (store.announcements || []).filter((a) => a.id !== id);
    saveLocalStore();
    return true;
  },

  async getStudentLifeEvents() {
    if (usingPostgres) {
      const { rows } = await pgPool.query('SELECT * FROM student_life_events ORDER BY id DESC');
      return rows;
    }
    const store = ensureLocalStore();
    return [...(store.student_life_events || [])];
  },

  async createStudentLifeEvent({
    title,
    organizer,
    category,
    date,
    location,
    room,
    prize_or_perks,
    is_sponsored,
    description,
  }) {
    const id = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const record = {
      id,
      title: String(title || 'Campus Event').trim(),
      organizer: String(organizer || 'AITU Student Hub').trim(),
      category: ['hackathon', 'career', 'club', 'lecture', 'scholarship'].includes(category) ? category : 'club',
      date: String(date || 'Upcoming').trim(),
      location: String(location || 'AITU Atrium').trim(),
      room: room || 'ATRIUM',
      prize_or_perks: prize_or_perks || '',
      is_sponsored: Boolean(is_sponsored),
      registered: false,
      description: String(description || '').trim(),
    };

    if (usingPostgres) {
      await pgPool.query(
        `INSERT INTO student_life_events (id, title, organizer, category, date, location, room, prize_or_perks, is_sponsored, registered, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          record.id,
          record.title,
          record.organizer,
          record.category,
          record.date,
          record.location,
          record.room,
          record.prize_or_perks,
          record.is_sponsored,
          record.registered,
          record.description,
        ]
      );
      return record;
    }

    const store = ensureLocalStore();
    store.student_life_events = [record, ...(store.student_life_events || [])];
    saveLocalStore();
    return record;
  },

  async toggleStudentLifeRegistration(id) {
    if (usingPostgres) {
      const { rows } = await pgPool.query(
        'UPDATE student_life_events SET registered = NOT registered WHERE id = $1 RETURNING *',
        [id]
      );
      return rows[0] || null;
    }
    const store = ensureLocalStore();
    const evt = (store.student_life_events || []).find((e) => e.id === id);
    if (!evt) return null;
    evt.registered = !evt.registered;
    saveLocalStore();
    return evt;
  },

  async getIntegrations() {
    if (usingPostgres) {
      const { rows } = await pgPool.query('SELECT * FROM lms_integrations ORDER BY id ASC');
      return rows;
    }
    const store = ensureLocalStore();
    return [...(store.lms_integrations || [])];
  },

  async syncIntegration(providerId) {
    const now = new Date().toISOString();
    const courses = await this.getCourses();
    const grades = await this.getGrades();
    const students = await this.getStudents();
    const syncedCourses = courses.length;
    const syncedGrades = grades.length;
    const syncedStudents = students.length;

    if (usingPostgres) {
      if (providerId && providerId !== 'all') {
        const { rows } = await pgPool.query(
          `UPDATE lms_integrations
           SET status = 'connected', last_synced_at = $1, synced_courses = $2, synced_grades = $3, synced_students = $4
           WHERE id = $5
           RETURNING *`,
          [now, syncedCourses, syncedGrades, syncedStudents, providerId]
        );
        return rows[0] || null;
      }
      await pgPool.query(
        `UPDATE lms_integrations
         SET status = 'connected', last_synced_at = $1, synced_courses = $2, synced_grades = $3, synced_students = $4`,
        [now, syncedCourses, syncedGrades, syncedStudents]
      );
      return this.getIntegrations();
    }

    const store = ensureLocalStore();
    if (!Array.isArray(store.lms_integrations)) {
      store.lms_integrations = createInitialSeedData().lms_integrations;
    }
    if (providerId && providerId !== 'all') {
      const target = store.lms_integrations.find((item) => item.id === providerId);
      if (!target) return null;
      target.status = 'connected';
      target.last_synced_at = now;
      target.synced_courses = syncedCourses;
      target.synced_grades = syncedGrades;
      target.synced_students = syncedStudents;
      saveLocalStore();
      return target;
    }
    store.lms_integrations = store.lms_integrations.map((item) => ({
      ...item,
      status: 'connected',
      last_synced_at: now,
      synced_courses: syncedCourses,
      synced_grades: syncedGrades,
      synced_students: syncedStudents,
    }));
    saveLocalStore();
    return [...store.lms_integrations];
  },

  async getAiQuota() {
    if (usingPostgres) {
      const { rows } = await pgPool.query("SELECT * FROM ai_quota WHERE id = 'default' LIMIT 1");
      if (rows[0]) return rows[0];
    }
    const store = ensureLocalStore();
    if (!store.ai_quota) {
      store.ai_quota = createInitialSeedData().ai_quota;
      saveLocalStore();
    }
    return { ...store.ai_quota };
  },

  async incrementAiQuota(tokensUsed = 120) {
    const delta = Math.max(20, Number(tokensUsed) || 120);
    if (usingPostgres) {
      const { rows } = await pgPool.query(
        `UPDATE ai_quota
         SET used_tokens = used_tokens + $1, queries_count = queries_count + 1
         WHERE id = 'default'
         RETURNING *`,
        [delta]
      );
      if (rows[0]) return rows[0];
    }
    const store = ensureLocalStore();
    if (!store.ai_quota) {
      store.ai_quota = createInitialSeedData().ai_quota;
    }
    store.ai_quota = {
      ...store.ai_quota,
      used_tokens: Number(store.ai_quota.used_tokens || 0) + delta,
      queries_count: Number(store.ai_quota.queries_count || 0) + 1,
    };
    saveLocalStore();
    return { ...store.ai_quota };
  },

  calculateStudentGpa,
};

module.exports = { initDatabase, db, calculateStudentGpa, scoreToGpaPoints };
