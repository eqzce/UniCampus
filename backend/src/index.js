require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { initDatabase, db, calculateStudentGpa } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'unicampus-super-secret-jwt-key-2026';

app.use(
  cors({
    origin: function (_origin, callback) {
      callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
  })
);

app.use(express.json());

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      group_name: user.group_name,
      department: user.department,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function sanitizeUser(user) {
  if (!user) return null;
  const { password_hash: _password_hash, ...safeUser } = user;
  return safeUser;
}

function authenticateOptional(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch {
      req.user = null;
    }
  }
  next();
}

function authenticateRequired(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication token required (Bearer <token>)' });
  }
  const token = authHeader.slice(7);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRoles(roles) {
  return (req, res, next) => {
    const allowed = Array.isArray(roles) ? roles : [roles];
    if (!req.user || !allowed.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied. Requires role: ${allowed.join(' or ')}.` });
    }
    next();
  };
}

// ============================================================================
// Health Check
// ============================================================================
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'unicampus-api',
    database: db.getEngine(),
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// Authentication & Role System (Student / Teacher / Admin)
// ============================================================================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, full_name, role, group_name, department } = req.body || {};

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Full name, email, and password are required.' });
    }

    const existing = await db.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const validRole = ['student', 'teacher', 'admin'].includes(role) ? role : 'student';
    const password_hash = await bcrypt.hash(String(password), 10);

    const newUser = await db.createUser({
      email,
      password_hash,
      full_name,
      role: validRole,
      group_name: validRole === 'student' ? group_name || 'CS-2401' : null,
      department: validRole !== 'student' ? department || 'Computer Science & Software Engineering' : null,
    });

    if (validRole === 'student') {
      const courses = await db.getCourses();
      if (courses.length > 0) {
        await db.upsertGrade({
          student_id: newUser.id,
          course_id: courses[0].id,
          teacher_id: courses[0].teacher_id,
          category: 'Assignment',
          score: 92,
          feedback: 'Welcome to UniCampus! Initial diagnostic lab assessment.',
        });
      }
    }

    const token = signToken(newUser);
    res.status(201).json({
      token,
      user: sanitizeUser(newUser),
    });
  } catch (err) {
    console.error('[AUTH REGISTER ERROR]', err);
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await db.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const validPassword = await bcrypt.compare(String(password), user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken(user);
    res.json({
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error('[AUTH LOGIN ERROR]', err);
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

app.get('/api/auth/me', authenticateRequired, async (req, res) => {
  try {
    const user = await db.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const courses = await db.getCourses();
    const grades = user.role === 'student' ? await db.getGrades({ studentId: user.id }) : [];
    const gpa = user.role === 'student' ? calculateStudentGpa(grades, courses) : null;

    res.json({
      user: {
        ...sanitizeUser(user),
        gpa,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// Bootstrap Endpoint (Fetches all role-appropriate data in 1 call)
// ============================================================================
app.get('/api/bootstrap', authenticateOptional, async (req, res) => {
  try {
    let activeUser = null;
    if (req.user?.id) {
      activeUser = await db.findUserById(req.user.id);
    }
    if (!activeUser) {
      activeUser = await db.findUserByEmail('student@unicampus.kz');
    }

    const courses = await db.getCourses();
    const teachers = await db.getTeachers();
    const bookings = await db.getRoomBookings();

    if (activeUser && (activeUser.role === 'teacher' || activeUser.role === 'admin')) {
      const students = await db.getStudents();
      const grades = await db.getGrades();
      const attendance = await db.getAttendance();
      const assignments = await db.getAssignments();
      const schedule = await db.getSchedule();

      return res.json({
        user: sanitizeUser(activeUser),
        courses,
        teachers,
        students,
        grades,
        attendance,
        assignments,
        schedule,
        bookings,
        syncedAt: new Date().toISOString(),
      });
    }

    // Student data
    const studentId = activeUser ? activeUser.id : 'usr-student-1';
    const groupName = activeUser?.group_name || 'CS-2401';
    const grades = await db.getGrades({ studentId });
    const attendance = await db.getAttendance({ studentId });
    const assignments = await db.getAssignments({ groupName });
    const schedule = await db.getSchedule({ groupName });
    const gpa = calculateStudentGpa(grades, courses);

    res.json({
      user: activeUser ? { ...sanitizeUser(activeUser), gpa } : null,
      courses,
      teachers,
      grades,
      gpa,
      attendance,
      assignments,
      schedule,
      bookings,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[BOOTSTRAP ERROR]', err);
    res.status(500).json({ error: 'Failed to load data: ' + err.message });
  }
});

// ============================================================================
// Courses / Subjects & Teachers (Admin Subject & Teacher Binding)
// ============================================================================
app.get('/api/courses', async (_req, res) => {
  try {
    const courses = await db.getCourses();
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/courses', authenticateOptional, async (req, res) => {
  try {
    const { title, code, credits, teacher_id } = req.body || {};
    if (!title || !code) {
      return res.status(400).json({ error: 'Subject title and code are required.' });
    }
    const course = await db.createCourse({ title, code, credits, teacher_id });
    res.status(201).json({ course });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/courses/:id', authenticateOptional, async (req, res) => {
  try {
    const updated = await db.updateCourse(req.params.id, req.body || {});
    if (!updated) {
      return res.status(404).json({ error: 'Course not found' });
    }
    res.json({ course: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/courses/:id', authenticateOptional, async (req, res) => {
  try {
    await db.deleteCourse(req.params.id);
    res.json({ deleted: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/teachers', async (_req, res) => {
  try {
    const teachers = await db.getTeachers();
    res.json(teachers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/students', authenticateOptional, async (req, res) => {
  try {
    const { group } = req.query;
    const students = await db.getStudents(group);
    const courses = await db.getCourses();
    const allGrades = await db.getGrades();

    const enriched = students.map((st) => {
      const stGrades = allGrades.filter((g) => g.student_id === st.id);
      return {
        ...st,
        gpa: calculateStudentGpa(stGrades, courses),
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// Grades (Student Read-Only + Teacher/Admin Gradebook)
// ============================================================================
app.get('/api/grades', authenticateOptional, async (req, res) => {
  try {
    const { student_id, course_id, group_name } = req.query;
    const effectiveStudentId =
      student_id || (req.user?.role === 'student' ? req.user.id : undefined);
    const grades = await db.getGrades({
      studentId: effectiveStudentId,
      courseId: course_id,
      groupName: group_name,
    });
    const courses = await db.getCourses();
    const gpa = effectiveStudentId ? calculateStudentGpa(grades, courses) : null;

    res.json({ grades, gpa });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/grades', authenticateRequired, requireRoles(['teacher', 'admin']), async (req, res) => {
  try {
    const { id, student_id, course_id, category, score, feedback } = req.body || {};
    if (!student_id || !course_id || !category || score === undefined) {
      return res.status(400).json({ error: 'student_id, course_id, category, and score are required.' });
    }

    const updated = await db.upsertGrade({
      id,
      student_id,
      course_id,
      teacher_id: req.user.id,
      category,
      score: Number(score),
      feedback: feedback || '',
    });

    res.json({ grade: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// Attendance
// ============================================================================
app.get('/api/attendance', authenticateOptional, async (req, res) => {
  try {
    const { student_id, course_id, date, group_name } = req.query;
    const effectiveStudentId =
      student_id || (req.user?.role === 'student' ? req.user.id : undefined);

    const records = await db.getAttendance({
      studentId: effectiveStudentId,
      courseId: course_id,
      date,
      groupName: group_name,
    });

    res.json({ attendance: records });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/attendance', authenticateRequired, requireRoles(['teacher', 'admin']), async (req, res) => {
  try {
    const { records, student_id, course_id, date, status } = req.body || {};

    if (Array.isArray(records)) {
      const results = [];
      for (const item of records) {
        const saved = await db.upsertAttendance({
          student_id: item.student_id,
          course_id: item.course_id || course_id,
          date: item.date || date,
          status: item.status,
        });
        results.push(saved);
      }
      return res.json({ attendance: results });
    }

    if (!student_id || !course_id || !date || !status) {
      return res.status(400).json({ error: 'student_id, course_id, date, and status are required.' });
    }

    const saved = await db.upsertAttendance({ student_id, course_id, date, status });
    res.json({ attendance: saved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// Assignments & Deadlines
// ============================================================================
app.get('/api/assignments', authenticateOptional, async (req, res) => {
  try {
    const { group_name, course_id } = req.query;
    const effectiveGroup =
      group_name || (req.user?.role === 'student' ? req.user.group_name : undefined);
    const list = await db.getAssignments({ groupName: effectiveGroup, courseId: course_id });
    res.json({ assignments: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/assignments', authenticateOptional, async (req, res) => {
  try {
    const { course_id, course_code, group_name, title, description, due_date, category, weight } = req.body || {};
    if (!title) {
      return res.status(400).json({ error: 'Assignment title is required.' });
    }

    let resolvedCourseId = course_id;
    if (!resolvedCourseId) {
      const courses = await db.getCourses();
      const match = courses.find(
        (c) => c.code.toLowerCase() === String(course_code || '').toLowerCase()
      );
      resolvedCourseId = match ? match.id : courses[0]?.id;
    }

    const created = await db.createAssignment({
      course_id: resolvedCourseId,
      group_name: group_name || 'CS-2401',
      title,
      description: description || '',
      due_date: due_date || 'Nov 05, 23:59',
      category: category || 'assignment',
      weight: weight || '10%',
    });

    res.status(201).json({ assignment: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/assignments/:id', authenticateOptional, async (req, res) => {
  try {
    await db.deleteAssignment(req.params.id);
    res.json({ deleted: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// Schedule (Student Read-Only + Teacher & Admin Modify/Create/Delete)
// ============================================================================
app.get('/api/schedule', authenticateOptional, async (req, res) => {
  try {
    const { group_name } = req.query;
    const schedule = await db.getSchedule({ groupName: group_name });
    res.json({ schedule });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/schedule', authenticateOptional, async (req, res) => {
  try {
    const created = await db.createScheduleItem(req.body || {});
    res.status(201).json({ scheduleItem: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/schedule/:id', authenticateOptional, async (req, res) => {
  try {
    const updated = await db.updateScheduleItem(req.params.id, req.body || {});
    if (!updated) {
      return res.status(404).json({ error: 'Schedule item not found' });
    }
    res.json({ scheduleItem: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/schedule/:id', authenticateOptional, async (req, res) => {
  try {
    await db.deleteScheduleItem(req.params.id);
    res.json({ deleted: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// Room Bookings
// ============================================================================
app.get('/api/bookings', authenticateOptional, async (_req, res) => {
  try {
    const bookings = await db.getRoomBookings();
    res.json({ bookings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bookings', authenticateOptional, async (req, res) => {
  try {
    const { room_number, building_name, date, time_slot, purpose } = req.body || {};
    if (!room_number || !building_name) {
      return res.status(400).json({ error: 'Room number and building name are required.' });
    }

    const booking = await db.createRoomBooking({
      user_id: req.user?.id || null,
      user_name: req.user?.full_name || req.body.user_name || 'Arystan Seitkaliyev',
      user_role: req.user?.role || req.body.user_role || 'student',
      room_number,
      building_name,
      date: date || new Date().toISOString().slice(0, 10),
      time_slot: time_slot || '14:00 - 16:00',
      purpose: purpose || 'Study session',
      status: req.user?.role === 'teacher' || req.user?.role === 'admin' ? 'confirmed' : 'pending',
    });

    res.status(201).json({ booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/bookings/:id', authenticateRequired, requireRoles(['teacher', 'admin']), async (req, res) => {
  try {
    const { status } = req.body || {};
    const updated = await db.updateRoomBookingStatus(req.params.id, status);
    if (!updated) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json({ booking: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

initDatabase()
  .then(({ engine }) => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`========================================================`);
      console.log(`  UniCampus Backend API running on http://0.0.0.0:${PORT}`);
      console.log(`  Database Engine: ${engine}`);
      console.log(`========================================================`);
    });
  })
  .catch((err) => {
    console.error('[FATAL] Failed to initialize database:', err);
    process.exit(1);
  });
