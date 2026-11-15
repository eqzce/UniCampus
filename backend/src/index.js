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
    const {
      email,
      password,
      full_name,
      role,
      group_name,
      department,
      enrolled_course_ids,
      course_code,
      course_title,
    } = req.body || {};

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
      enrolled_course_ids: Array.isArray(enrolled_course_ids) ? enrolled_course_ids : undefined,
    });

    if (validRole === 'student') {
      const courses = await db.getCourses();
      const studentCourses =
        Array.isArray(newUser.enrolled_course_ids) && newUser.enrolled_course_ids.length > 0
          ? courses.filter((c) => newUser.enrolled_course_ids.includes(c.id))
          : courses;
      for (const course of studentCourses) {
        await db.upsertGrade({
          student_id: newUser.id,
          course_id: course.id,
          teacher_id: course.teacher_id,
          category: 'Assignment',
          score: 88,
          feedback: `Enrolled in ${course.code} (${course.title}). Initial diagnostic assessment recorded.`,
        });
      }
    } else if (validRole === 'teacher' && course_code && course_title) {
      await db.createCourse({
        title: course_title,
        code: course_code,
        credits: 5,
        teacher_id: newUser.id,
      });
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
    const announcements = await db.getAnnouncements();
    const studentLifeEvents = await db.getStudentLifeEvents();
    const lmsIntegrations = await db.getIntegrations();
    const aiQuota = await db.getAiQuota();

    if (activeUser && (activeUser.role === 'teacher' || activeUser.role === 'admin')) {
      const students = await db.getStudents();
      const allGrades = await db.getGrades();
      const allAttendance = await db.getAttendance();
      const allAssignments = await db.getAssignments();
      const allSchedule = await db.getSchedule();

      if (activeUser.role === 'teacher') {
        const teacherCourseIds = courses
          .filter((c) => c.teacher_id === activeUser.id)
          .map((c) => c.id);
        return res.json({
          user: sanitizeUser(activeUser),
          courses,
          teachers,
          students,
          grades: allGrades.filter((g) => teacherCourseIds.includes(g.course_id)),
          attendance: allAttendance.filter((a) => teacherCourseIds.includes(a.course_id)),
          assignments: allAssignments.filter((a) => teacherCourseIds.includes(a.course_id)),
          schedule: allSchedule.filter((s) => teacherCourseIds.includes(s.course_id)),
          bookings,
          announcements,
          studentLifeEvents,
          lmsIntegrations,
          aiQuota,
          syncedAt: new Date().toISOString(),
        });
      }

      return res.json({
        user: sanitizeUser(activeUser),
        courses,
        teachers,
        students,
        grades: allGrades,
        attendance: allAttendance,
        assignments: allAssignments,
        schedule: allSchedule,
        bookings,
        announcements,
        studentLifeEvents,
        lmsIntegrations,
        aiQuota,
        syncedAt: new Date().toISOString(),
      });
    }

    // Student data (relationally synced to enrolled subjects & assigned teachers)
    const studentId = activeUser ? activeUser.id : 'usr-student-1';
    const groupName = activeUser?.group_name || 'CS-2401';
    const enrolledCourseIds =
      Array.isArray(activeUser?.enrolled_course_ids) && activeUser.enrolled_course_ids.length > 0
        ? activeUser.enrolled_course_ids
        : courses.map((c) => c.id);
    const grades = await db.getGrades({ studentId });
    const attendance = await db.getAttendance({ studentId });
    const assignments = await db.getAssignments({ groupName, courseIds: enrolledCourseIds });
    const schedule = await db.getSchedule({ groupName, courseIds: enrolledCourseIds });
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
      announcements,
      studentLifeEvents,
      lmsIntegrations,
      aiQuota,
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

    const courses = await db.getCourses();
    const course = courses.find((c) => c.id === course_id);
    const announcement = await db.createAnnouncement({
      title: `Grade Posted: ${course?.code || 'Course'} ${category}`,
      course_code: course?.code || null,
      timestamp: 'Just now',
      description: `Score ${Number(score)}/100 recorded${feedback ? ` — "${feedback}"` : ''}. Your GPA & scholarship eligibility have been recalculated.`,
      type: Number(score) >= 85 ? 'scholarship' : 'admin',
      unread: true,
    });

    res.json({ grade: updated, announcement });
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

    const announcement = await db.createAnnouncement({
      title: `New Deadline: ${created?.title || title}`,
      course_code: created?.course_code || course_code || null,
      timestamp: 'Just now',
      description: `${created?.category || category || 'assignment'} (${created?.weight || weight || '10%'}) due ${created?.due_date || due_date || 'soon'} for ${created?.group_name || group_name || 'CS-2401'}.`,
      type: 'deadline',
      unread: true,
    });

    res.status(201).json({ assignment: created, announcement });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function handleUpdateAssignment(req, res) {
  try {
    const updated = await db.updateAssignment(req.params.id, req.body || {});
    if (!updated) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    res.json({ assignment: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

app.patch('/api/assignments/:id', authenticateOptional, handleUpdateAssignment);
app.put('/api/assignments/:id', authenticateOptional, handleUpdateAssignment);

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
    const { group_name, week_start } = req.query;
    const schedule = await db.getSchedule({
      groupName: group_name,
      weekStart: week_start,
    });
    res.json({ schedule });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/schedule/import', authenticateOptional, async (req, res) => {
  try {
    const { items, replaceWeekStart } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Schedule items array is required.' });
    }
    const created = await db.importScheduleItems(items, { replaceWeekStart });
    const announcement = await db.createAnnouncement({
      title: `Schedule Imported (${created.length} classes)`,
      course_code: created[0]?.course_code || null,
      room: created[0]?.room || null,
      timestamp: 'Just now',
      description: `${created.length} schedule entries synced for ${
        replaceWeekStart && replaceWeekStart !== 'recurring' ? `week ${replaceWeekStart}` : 'timetable'
      }.`,
      type: 'schedule_change',
      unread: true,
    });
    res.status(201).json({ scheduleItems: created, announcement });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/schedule', authenticateOptional, async (req, res) => {
  try {
    const created = await db.createScheduleItem(req.body || {});
    const room = created.room || created.room_number || 'C1.1.320';
    const day = created.day || created.day_of_week || 'Mon';
    const courseLabel = created.course_code || created.course_name || created.subject_name || 'Class';
    const announcement = await db.createAnnouncement({
      title: `Schedule Added: ${courseLabel}`,
      course_code: created.course_code || null,
      room,
      timestamp: 'Just now',
      description: `${day} ${created.start_time}-${created.end_time} in Room ${room} (${created.group_name || 'CS-2401'}).`,
      type: 'schedule_change',
      unread: true,
    });
    res.status(201).json({ scheduleItem: created, announcement });
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
    const room = updated.room || updated.room_number || 'C1.1.320';
    const day = updated.day || updated.day_of_week || 'Mon';
    const courseLabel = updated.course_code || updated.course_name || updated.subject_name || 'Class';
    const announcement = await db.createAnnouncement({
      title: `Schedule Updated: ${courseLabel}`,
      course_code: updated.course_code || null,
      room,
      timestamp: 'Just now',
      description: `${day} ${updated.start_time}-${updated.end_time} moved to Room ${room}.`,
      type: 'schedule_change',
      unread: true,
    });
    res.json({ scheduleItem: updated, announcement });
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

// ============================================================================
// Live Announcements & Notifications
// ============================================================================
app.get('/api/announcements', authenticateOptional, async (_req, res) => {
  try {
    const announcements = await db.getAnnouncements();
    res.json({ announcements });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/announcements', authenticateOptional, async (req, res) => {
  try {
    const { title, description, course_code, room, type } = req.body || {};
    if (!title || !description) {
      return res.status(400).json({ error: 'Announcement title and description are required.' });
    }
    const created = await db.createAnnouncement({
      title,
      description,
      course_code,
      room,
      type: type || 'admin',
      unread: true,
    });
    res.status(201).json({ announcement: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/announcements/:id/read', authenticateOptional, async (req, res) => {
  try {
    const unread = typeof req.body?.unread === 'boolean' ? req.body.unread : false;
    const updated = await db.markAnnouncementRead(req.params.id, unread);
    if (!updated) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    res.json({ announcement: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/announcements/read-all', authenticateOptional, async (_req, res) => {
  try {
    const announcements = await db.markAllAnnouncementsRead();
    res.json({ announcements });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/announcements/:id', authenticateOptional, async (req, res) => {
  try {
    await db.deleteAnnouncement(req.params.id);
    res.json({ deleted: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// Student Life & Career / Hackathon Events
// ============================================================================
app.get('/api/student-life', authenticateOptional, async (_req, res) => {
  try {
    const events = await db.getStudentLifeEvents();
    res.json({ events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/student-life', authenticateOptional, async (req, res) => {
  try {
    const { title, organizer, category, date, location, room, prize_or_perks, is_sponsored, description } =
      req.body || {};
    if (!title) {
      return res.status(400).json({ error: 'Event title is required.' });
    }
    const created = await db.createStudentLifeEvent({
      title,
      organizer,
      category,
      date,
      location,
      room,
      prize_or_perks,
      is_sponsored,
      description,
    });
    res.status(201).json({ event: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/student-life/:id/toggle-register', authenticateOptional, async (req, res) => {
  try {
    const updated = await db.toggleStudentLifeRegistration(req.params.id);
    if (!updated) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json({ event: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// LMS / University ERP Middleware Sync (Moodle / Platonus / DU)
// ============================================================================
app.get('/api/integrations', authenticateOptional, async (_req, res) => {
  try {
    const integrations = await db.getIntegrations();
    res.json({ integrations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/integrations/sync', authenticateOptional, async (req, res) => {
  try {
    const provider = req.body?.provider || 'all';
    const result = await db.syncIntegration(provider);
    if (!result) {
      return res.status(404).json({ error: `Integration '${provider}' not found.` });
    }
    const integrations = await db.getIntegrations();
    res.json({ synced: result, integrations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// AI Academic Advisor & Institutional Token Metering
// ============================================================================
const AI_ROOM_SHORTCUTS = {
  '320': 'C1.1.320',
  '301': 'C1.1.320',
  '136': 'C1.2.136',
  '105': 'C1.2.136',
  '246': 'C1.3.246',
  '140': 'C1.1.140',
  '125': 'C1.3.125',
  '328': 'C1.3.328',
  library: 'LIBRARY',
  atrium: 'ATRIUM',
  dining: 'DININGHALL',
};

function resolveRoomFromPrompt(prompt, schedule) {
  const explicit = prompt.match(/C1\.\d\.\d{3}/i);
  if (explicit) return explicit[0].toUpperCase();
  const lower = prompt.toLowerCase();
  for (const [key, roomId] of Object.entries(AI_ROOM_SHORTCUTS)) {
    if (lower.includes(key)) return roomId;
  }
  const firstRoom = schedule?.[0]?.room || schedule?.[0]?.room_number;
  return firstRoom || 'C1.1.320';
}

function buildContextualAiReply({ prompt, user, courses, grades, assignments, schedule, gpa }) {
  const q = String(prompt || '').toLowerCase();
  const sortedSchedule = [...(schedule || [])];
  const nextClass = sortedSchedule[0];
  const todoTasks = (assignments || []).filter((a) => a.status !== 'graded' && a.status !== 'submitted');
  const standardThreshold = 2.33;
  const increasedThreshold = 3.66;
  const gpaNum = typeof gpa === 'number' ? gpa : 3.66;
  const standardMargin = Number((gpaNum - standardThreshold).toFixed(2));
  const increasedGap = Number((increasedThreshold - gpaNum).toFixed(2));

  // Detect intent
  const asksMapOrWhere =
    /where|room|map|floor|block|library|atrium|c1\.|301|320|136|246|105|где|аудитор|карт/.test(q);
  const asksNextClass = /next|schedule|today|class|lesson|lecture|пара|распис|следующ/.test(q);
  const asksGpaOrScholarship =
    /gpa|scholarship|grade|exam|final|score|simulate|target|risk|стипенд|балл|оценк/.test(q);
  const asksDeadlines = /due|deadline|assignment|task|homework|todo|quiz|midterm|дедлайн|задан|срок/.test(q);

  if (asksMapOrWhere && !asksNextClass) {
    const targetRoom = resolveRoomFromPrompt(prompt, sortedSchedule);
    const floorMatch = targetRoom.match(/^C1\.(\d)\./i) || targetRoom.match(/\.(\d)/);
    const floorNum = targetRoom === 'LIBRARY' ? 2 : targetRoom === 'ATRIUM' ? 1 : floorMatch ? floorMatch[1] : '1';
    const matchingClass = sortedSchedule.find((s) =>
      String(s.room || s.room_number || '').toUpperCase().includes(targetRoom.toUpperCase())
    );
    return {
      reply: `Room ${targetRoom} is on Floor ${floorNum} of the AITU Campus Map.${
        matchingClass
          ? ` Your class "${matchingClass.course_name || matchingClass.subject_name || matchingClass.course_code}" (${matchingClass.day || matchingClass.day_of_week} ${matchingClass.start_time}) is scheduled here.`
          : ''
      } Tap "Open Map to ${targetRoom}" below to highlight the room on the floorplan.`,
      recommendedRoom: targetRoom,
      recommendedTab: 'map',
    };
  }

  if (asksNextClass) {
    if (!nextClass) {
      return {
        reply: `No classes are currently scheduled for group ${user?.group_name || 'CS-2401'}. Check the Campus Map or Tasks tab for study sessions and deadlines.`,
        recommendedRoom: 'LIBRARY',
        recommendedTab: 'schedule',
      };
    }
    const targetRoom = nextClass.room || nextClass.room_number || 'C1.1.320';
    return {
      reply: `Your next class is ${nextClass.course_name || nextClass.subject_name || 'Lecture'} (${
        nextClass.course_code || 'COURSE'
      }) with ${nextClass.professor || 'Instructor'} on ${nextClass.day || nextClass.day_of_week}, ${nextClass.start_time}–${
        nextClass.end_time
      } in Room ${targetRoom}. Tap the button below to highlight it on the Campus Map.`,
      recommendedRoom: targetRoom,
      recommendedTab: 'map',
    };
  }

  if (asksGpaOrScholarship) {
    // Group current scores by course to find lowest average and required Final score
    const byCourse = new Map();
    for (const g of grades || []) {
      const code = g.course_code || g.course_id;
      if (!byCourse.has(code)) byCourse.set(code, []);
      byCourse.get(code).push(Number(g.score || 0));
    }
    let lowestCourse = { code: courses?.[0]?.code || 'PHYS101', avg: 85 };
    if (byCourse.size > 0) {
      lowestCourse = Array.from(byCourse.entries())
        .map(([code, scores]) => ({
          code,
          avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        }))
        .sort((a, b) => a.avg - b.avg)[0];
    }
    const neededFinal = Math.max(50, Math.min(100, Math.ceil((90 - lowestCourse.avg * 0.6) / 0.4)));
    let statusText = `AT RISK (${Math.abs(standardMargin).toFixed(2)} below the ${standardThreshold.toFixed(
      2
    )} Standard Scholarship threshold)`;
    if (gpaNum >= increasedThreshold) {
      statusText = `INCREASED SCHOLARSHIP (+${(gpaNum - increasedThreshold).toFixed(
        2
      )} above ${increasedThreshold.toFixed(2)} threshold; Standard retained at >= ${standardThreshold.toFixed(2)})`;
    } else if (gpaNum >= standardThreshold) {
      statusText = `STANDARD SCHOLARSHIP RETAINED (+${standardMargin.toFixed(2)} above ${standardThreshold.toFixed(
        2
      )}; need +${increasedGap.toFixed(2)} to reach ${increasedThreshold.toFixed(2)} Increased Scholarship)`;
    }

    return {
      reply: `Your live GPA is ${gpaNum.toFixed(2)} — Status: ${statusText}.\nFormula: Course points weighted by credits (Assignment 20% + Quiz 10% + Midterm 30% + Final 40%).\nFocus area: ${lowestCourse.code} (current avg ${lowestCourse.avg}%). Scoring ${neededFinal}%+ on the Final pushes ${lowestCourse.code} to an A- (90%+) and strengthens your scholarship standing.`,
      recommendedRoom: null,
      recommendedTab: 'grades',
    };
  }

  if (asksDeadlines) {
    if (todoTasks.length === 0) {
      return {
        reply: `Great news! You have 0 pending assignments right now. Keep monitoring the Tasks tab for new assessments and focus on upcoming exams.`,
        recommendedRoom: null,
        recommendedTab: 'assignments',
      };
    }
    const topTasks = todoTasks
      .slice(0, 3)
      .map((t, i) => `${i + 1}. ${t.title} (${t.course_code || 'Course'}, weight ${t.weight || '10%'}) — due ${t.due_date}`)
      .join('\n');
    return {
      reply: `You have ${todoTasks.length} active deadline(s):\n${topTasks}\nPrioritize the highest-weight task first to protect your ${gpaNum.toFixed(2)} GPA.`,
      recommendedRoom: null,
      recommendedTab: 'assignments',
    };
  }

  const defaultRoom = nextClass?.room || nextClass?.room_number || 'C1.1.320';
  return {
    reply: `UniCampus AI Overview for ${user?.full_name || 'Student'} (${user?.group_name || 'CS-2401'}):\n• Live GPA: ${gpaNum.toFixed(
      2
    )} (Standard Scholarship: >= 2.33, Increased: >= 3.66)\n• Next Class: ${
      nextClass
        ? `${nextClass.course_code || nextClass.course_name || nextClass.subject_name} (${
            nextClass.day || nextClass.day_of_week
          } ${nextClass.start_time}) in ${defaultRoom}`
        : 'None scheduled'
    }\n• Pending Tasks: ${todoTasks.length} assignment(s)\nAsk me about your GPA & scholarship simulation, upcoming deadlines, or room locations on the Campus Map.`,
    recommendedRoom: nextClass ? defaultRoom : null,
    recommendedTab: 'dashboard',
  };
}

async function tryExternalLlm({ prompt, user, gpa, schedule, todoCount }) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const sysText = `You are UniCampus AI Academic Advisor at AITU. Keep answers concise (<110 words) and grounded ONLY in this student data: Name=${
      user?.full_name || 'Student'
    }, Group=${user?.group_name || 'CS-2401'}, GPA=${gpa}, PendingTasks=${todoCount}, FirstClass=${
      schedule?.[0]
        ? `${schedule[0].course_code} ${schedule[0].day || schedule[0].day_of_week} ${schedule[0].start_time} in ${schedule[0].room || schedule[0].room_number}`
        : 'None'
    }.`;
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(
        geminiKey
      )}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `${sysText}\n\nStudent Question: ${prompt}` }] }],
        }),
      }
    );
    clearTimeout(timer);
    if (!resp.ok) return null;
    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text ? String(text).trim() : null;
  } catch {
    return null;
  }
}

app.get('/api/ai/quota', authenticateOptional, async (_req, res) => {
  try {
    const quota = await db.getAiQuota();
    res.json({ quota });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/chat', authenticateOptional, async (req, res) => {
  try {
    const { prompt, userId, groupName } = req.body || {};
    if (!prompt || !String(prompt).trim()) {
      return res.status(400).json({ error: 'Prompt text is required.' });
    }

    let activeUser = null;
    if (req.user?.id) activeUser = await db.findUserById(req.user.id);
    else if (userId) activeUser = await db.findUserById(userId);
    if (!activeUser) activeUser = await db.findUserByEmail('student@unicampus.kz');

    const courses = await db.getCourses();
    const studentId = activeUser?.id || 'usr-student-1';
    const effectiveGroup = groupName || activeUser?.group_name || 'CS-2401';
    const enrolledCourseIds =
      Array.isArray(activeUser?.enrolled_course_ids) && activeUser.enrolled_course_ids.length > 0
        ? activeUser.enrolled_course_ids
        : courses.map((c) => c.id);
    const grades = await db.getGrades({ studentId });
    const assignments = await db.getAssignments({ groupName: effectiveGroup, courseIds: enrolledCourseIds });
    const schedule = await db.getSchedule({ groupName: effectiveGroup, courseIds: enrolledCourseIds });
    const gpa = calculateStudentGpa(grades, courses);

    const localResult = buildContextualAiReply({
      prompt: String(prompt),
      user: activeUser,
      courses,
      grades,
      assignments,
      schedule,
      gpa,
    });

    const todoCount = assignments.filter((a) => a.status !== 'graded' && a.status !== 'submitted').length;
    const externalText = await tryExternalLlm({
      prompt: String(prompt),
      user: activeUser,
      gpa,
      schedule,
      todoCount,
    });

    const finalReply = externalText || localResult.reply;
    const estimatedTokens = Math.max(95, Math.min(480, Math.round((String(prompt).length + finalReply.length) / 3) + 65));
    const quota = await db.incrementAiQuota(estimatedTokens);

    res.json({
      reply: finalReply,
      recommendedRoom: localResult.recommendedRoom,
      recommendedTab: localResult.recommendedTab,
      provider: externalText ? 'gemini-live' : 'unicampus-contextual-engine',
      quota,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

if (require.main === module) {
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
}

module.exports = { app, initDatabase };
