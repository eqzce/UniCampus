const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { createInitialSeedData } = require('./seedData');

const LOCAL_DB_PATH = path.join(__dirname, '..', 'data', 'local-db.json');

let pgPool = null;
let usingPostgres = false;
let localStore = null;

function ensureLocalStore() {
  if (localStore) return localStore;
  const dir = path.dirname(LOCAL_DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (fs.existsSync(LOCAL_DB_PATH)) {
    try {
      localStore = JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf8'));
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
  const dir = path.dirname(LOCAL_DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(localStore, null, 2), 'utf8');
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
  weight TEXT DEFAULT '10%'
);

CREATE TABLE IF NOT EXISTS schedule (
  id TEXT PRIMARY KEY,
  course_id TEXT,
  course_name TEXT NOT NULL,
  course_code TEXT NOT NULL,
  professor TEXT NOT NULL,
  group_name TEXT NOT NULL DEFAULT 'CS-2401',
  day TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  time_row_index INTEGER NOT NULL DEFAULT 1,
  duration_hours DOUBLE PRECISION NOT NULL DEFAULT 1,
  room TEXT NOT NULL,
  building TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'blue'
);

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

    console.log('[DB] Seeding PostgreSQL database with demo Student & Teacher accounts...');
    const seed = createInitialSeedData();

    await client.query('BEGIN');
    if (force) {
      await client.query('TRUNCATE room_bookings, schedule, assignments, attendance, grades, courses, users CASCADE');
    }

    for (const u of seed.users) {
      await client.query(
        `INSERT INTO users (id, email, password_hash, full_name, role, group_name, department, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (email) DO NOTHING`,
        [u.id, u.email, u.password_hash, u.full_name, u.role, u.group_name, u.department, u.created_at]
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
        `INSERT INTO assignments (id, course_id, group_name, title, description, due_date, category, weight)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [asg.id, asg.course_id, asg.group_name, asg.title, asg.description, asg.due_date, asg.category, asg.weight]
      );
    }

    for (const s of seed.schedule) {
      await client.query(
        `INSERT INTO schedule (id, course_id, course_name, course_code, professor, group_name, day, start_time, end_time, time_row_index, duration_hours, room, building, color)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (id) DO NOTHING`,
        [
          s.id,
          s.course_id,
          s.course_name,
          s.course_code,
          s.professor,
          s.group_name,
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
    saveLocalStore();
  } else {
    ensureLocalStore();
  }
  console.log(`[DB] Using persistent local database at ${LOCAL_DB_PATH}`);
  return { engine: 'local-json' };
}

// Helper to convert 0-100 score to 4.0 GPA scale (AITU standard grading scale)
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

  async createUser({ email, password_hash, full_name, role, group_name, department }) {
    const id = `usr-${role}-${Date.now()}`;
    const created_at = new Date().toISOString();
    const user = {
      id,
      email: email.trim().toLowerCase(),
      password_hash,
      full_name: full_name.trim(),
      role: role === 'teacher' ? 'teacher' : 'student',
      group_name: role === 'student' ? (group_name || 'CS-2401') : null,
      department: role === 'teacher' ? (department || 'Computer Science & Software Engineering') : null,
      created_at,
    };

    if (usingPostgres) {
      await pgPool.query(
        `INSERT INTO users (id, email, password_hash, full_name, role, group_name, department, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          user.id,
          user.email,
          user.password_hash,
          user.full_name,
          user.role,
          user.group_name,
          user.department,
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
          `SELECT id, email, full_name, role, group_name, created_at FROM users WHERE role = 'student' AND group_name = $1 ORDER BY full_name ASC`,
          [groupName]
        );
        return rows;
      }
      const { rows } = await pgPool.query(
        `SELECT id, email, full_name, role, group_name, created_at FROM users WHERE role = 'student' ORDER BY group_name ASC, full_name ASC`
      );
      return rows;
    }

    const store = ensureLocalStore();
    return store.users
      .filter((u) => u.role === 'student' && (!groupName || groupName === 'all' || groupName === 'ALL' || u.group_name === groupName))
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
      // Check if a grade for this student + course + category already exists
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

  async getAssignments({ groupName, courseId } = {}) {
    if (usingPostgres) {
      let query = `
        SELECT a.*, c.code AS course_code, c.title AS course_name
        FROM assignments a
        JOIN courses c ON c.id = a.course_id
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
      const { rows } = await pgPool.query(query, params);
      return rows;
    }

    const store = ensureLocalStore();
    return store.assignments
      .map((a) => {
        const course = store.courses.find((c) => c.id === a.course_id) || {};
        return {
          ...a,
          course_code: course.code || 'CRS101',
          course_name: course.title || 'Course',
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
        return true;
      });
  },

  async createAssignment({ course_id, group_name, title, description, due_date, category, weight }) {
    const id = `asg-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const record = {
      id,
      course_id,
      group_name: group_name || 'CS-2401',
      title: title.trim(),
      description: description || '',
      due_date: due_date || 'Nov 05, 23:59',
      category: category || 'assignment',
      weight: weight || '10%',
    };

    if (usingPostgres) {
      await pgPool.query(
        `INSERT INTO assignments (id, course_id, group_name, title, description, due_date, category, weight)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          record.id,
          record.course_id,
          record.group_name,
          record.title,
          record.description,
          record.due_date,
          record.category,
          record.weight,
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

  async getSchedule({ groupName } = {}) {
    if (usingPostgres) {
      if (groupName && groupName !== 'all' && groupName !== 'ALL') {
        const { rows } = await pgPool.query(
          'SELECT * FROM schedule WHERE group_name = $1 OR group_name = $2 ORDER BY time_row_index ASC',
          [groupName, 'ALL']
        );
        return rows;
      }
      const { rows } = await pgPool.query('SELECT * FROM schedule ORDER BY time_row_index ASC');
      return rows;
    }

    const store = ensureLocalStore();
    return store.schedule.filter((s) => {
      if (groupName && groupName !== 'all' && groupName !== 'ALL') {
        return s.group_name === groupName || s.group_name === 'ALL' || !s.group_name;
      }
      return true;
    });
  },

  async createScheduleItem(item) {
    const id = item.id || `sched-custom-${Date.now()}`;
    const record = {
      id,
      course_id: item.course_id || null,
      course_name: item.courseName || item.course_name || 'Course',
      course_code: item.courseCode || item.course_code || 'CRS101',
      professor: item.professor || 'Dr. Yersultan M.',
      group_name: item.group_name || item.groupName || 'CS-2401',
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
        `INSERT INTO schedule (id, course_id, course_name, course_code, professor, group_name, day, start_time, end_time, time_row_index, duration_hours, room, building, color)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          record.id,
          record.course_id,
          record.course_name,
          record.course_code,
          record.professor,
          record.group_name,
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
      status: status || (user_role === 'teacher' ? 'confirmed' : 'pending'),
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

  calculateStudentGpa,
};

module.exports = { initDatabase, db, calculateStudentGpa, scoreToGpaPoints };
