// @vitest-environment node
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const request = require('supertest');
import { getWeekSummaryInfo } from '../utils/dateUtils';

const tempDbFile = path.join(os.tmpdir(), `unicampus-test-${Date.now()}.json`);
process.env.UNICAMPUS_LOCAL_DB_PATH = tempDbFile;
process.env.DATABASE_URL = '';

const { app, initDatabase } = require('../../backend/src/index.js');

describe('UniCampus Backend API End-to-End', () => {
  let studentToken = '';
  let teacherToken = '';
  let adminToken = '';

  beforeAll(async () => {
    const res = await initDatabase(true);
    expect(res.engine).toBe('local-json');
  });

  afterAll(() => {
    if (fs.existsSync(tempDbFile)) {
      fs.unlinkSync(tempDbFile);
    }
  });

  it('returns healthy status from /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('local-json');
  });

  it('authenticates seeded accounts (3 students in 3 groups with 3 subjects, 4 teachers, 1 admin) and supports registration', async () => {
    const bad = await request(app)
      .post('/api/auth/login')
      .send({ email: 'student@unicampus.kz', password: 'wrong' });
    expect(bad.status).toBe(401);

    const removedDanial = await request(app)
      .post('/api/auth/login')
      .send({ email: 'danial@unicampus.kz', password: 'teacher123' });
    expect(removedDanial.status).toBe(401);

    const stu = await request(app)
      .post('/api/auth/login')
      .send({ email: 'student@unicampus.kz', password: 'student123' });
    expect(stu.status).toBe(200);
    expect(stu.body.token).toBeTruthy();
    expect(stu.body.user.role).toBe('student');
    expect(stu.body.user.group_name).toBe('CS-2401');
    expect(stu.body.user.enrolled_course_ids).toHaveLength(3);
    studentToken = stu.body.token;

    const stu2 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alisher@unicampus.kz', password: 'student123' });
    expect(stu2.status).toBe(200);
    expect(stu2.body.user.role).toBe('student');
    expect(stu2.body.user.group_name).toBe('SE-2402');
    expect(stu2.body.user.enrolled_course_ids).toHaveLength(3);

    const stu3 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'dana@unicampus.kz', password: 'student123' });
    expect(stu3.status).toBe(200);
    expect(stu3.body.user.role).toBe('student');
    expect(stu3.body.user.group_name).toBe('IT-2403');
    expect(stu3.body.user.enrolled_course_ids).toHaveLength(3);

    const tch = await request(app)
      .post('/api/auth/login')
      .send({ email: 'teacher@unicampus.kz', password: 'teacher123' });
    expect(tch.status).toBe(200);
    expect(tch.body.user.role).toBe('teacher');
    teacherToken = tch.body.token;

    const tch2 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'aigerim@unicampus.kz', password: 'teacher123' });
    expect(tch2.status).toBe(200);
    expect(tch2.body.user.role).toBe('teacher');

    // Verify 3 GPA tiers (High, Medium, Low) and 5 scoped tasks per student
    const stu1Boot = await request(app)
      .get('/api/bootstrap')
      .set('Authorization', `Bearer ${stu.body.token}`);
    const stu2Boot = await request(app)
      .get('/api/bootstrap')
      .set('Authorization', `Bearer ${stu2.body.token}`);
    const stu3Boot = await request(app)
      .get('/api/bootstrap')
      .set('Authorization', `Bearer ${stu3.body.token}`);
    expect(stu1Boot.body.gpa).toBeGreaterThanOrEqual(3.66);
    expect(stu2Boot.body.gpa).toBeGreaterThanOrEqual(2.33);
    expect(stu2Boot.body.gpa).toBeLessThan(3.66);
    expect(stu3Boot.body.gpa).toBeLessThan(2.33);
    expect(stu1Boot.body.assignments).toHaveLength(5);
    expect(stu2Boot.body.assignments).toHaveLength(5);
    expect(stu3Boot.body.assignments).toHaveLength(5);

    // Verify teacher@unicampus.kz is scoped to 2 courses (PHYS101 & MATH101)
    const tch1Boot = await request(app)
      .get('/api/bootstrap')
      .set('Authorization', `Bearer ${tch.body.token}`);
    expect(
      tch1Boot.body.assignments.every(
        (a: { course_code: string }) => a.course_code === 'PHYS101' || a.course_code === 'MATH101'
      )
    ).toBe(true);

    // Verify aigerim@unicampus.kz is scoped to 1 course (CS101)
    const tch2Boot = await request(app)
      .get('/api/bootstrap')
      .set('Authorization', `Bearer ${tch2.body.token}`);
    expect(
      tch2Boot.body.assignments.every((a: { course_code: string }) => a.course_code === 'CS101')
    ).toBe(true);

    const adm = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@unicampus.kz', password: 'admin123' });
    expect(adm.status).toBe(200);
    expect(adm.body.user.role).toBe('admin');
    adminToken = adm.body.token;

    // Register a student with 2 enrolled subjects and verify schedule relational sync
    const regStudent = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'newstudent@unicampus.kz',
        password: 'password123',
        full_name: 'Sanzhar Akhmetov',
        role: 'student',
        group_name: 'CS-2401',
        enrolled_course_ids: ['crs-phys101', 'crs-cs101'],
      });
    expect(regStudent.status).toBe(201);
    expect(regStudent.body.user.role).toBe('student');
    expect(regStudent.body.user.enrolled_course_ids).toEqual(['crs-phys101', 'crs-cs101']);

    const newStudentBoot = await request(app)
      .get('/api/bootstrap')
      .set('Authorization', `Bearer ${regStudent.body.token}`);
    expect(newStudentBoot.status).toBe(200);
    expect(
      newStudentBoot.body.schedule.every(
        (s: { course_id?: string }) =>
          s.course_id === 'crs-phys101' || s.course_id === 'crs-cs101'
      )
    ).toBe(true);

    // Register a new teacher with bound subject & a new admin
    const regTeacher = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'newteacher@unicampus.kz',
        password: 'password123',
        full_name: 'Prof. Marat B.',
        role: 'teacher',
        department: 'Data Science',
        course_code: 'DS201',
        course_title: 'Applied Data Science',
      });
    expect(regTeacher.status).toBe(201);
    expect(regTeacher.body.user.role).toBe('teacher');

    const regAdmin = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'newadmin@unicampus.kz',
        password: 'password123',
        full_name: 'Admin Saltanat M.',
        role: 'admin',
      });
    expect(regAdmin.status).toBe(201);
    expect(regAdmin.body.user.role).toBe('admin');
  });

  it('hydrates bootstrap payload with 5 subjects, 4 teachers, 3+ students, grades, scholarship info without grant', async () => {
    const res = await request(app)
      .get('/api/bootstrap')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.gpa).toBe('number');
    expect(res.body.courses.length).toBeGreaterThanOrEqual(5);
    const base5 = res.body.courses.filter(
      (c: { id: string; code: string }) =>
        c.id.startsWith('crs-') &&
        ['PHYS101', 'MATH101', 'CS101', 'HIST102', 'ENG103'].includes(c.code)
    );
    expect(base5).toHaveLength(5);
    const uniqueTeachers = new Set(base5.map((c: { teacher_id: string }) => c.teacher_id));
    expect(uniqueTeachers.size).toBe(4);
    expect(res.body.teachers.length).toBeGreaterThanOrEqual(4);
    expect(JSON.stringify(res.body.announcements)).not.toMatch(/grant/i);
    expect(res.body.aiQuota?.monthly_quota).toBeGreaterThan(0);

    // Admin/Teacher bootstrap includes full student roster
    const adminBoot = await request(app)
      .get('/api/bootstrap')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminBoot.status).toBe(200);
    expect(adminBoot.body.students.length).toBeGreaterThanOrEqual(3);
  });

  it('persists teacher homework create, edit (PUT/PATCH), submission toggle & delete', async () => {
    const createRes = await request(app)
      .post('/api/assignments')
      .send({
        course_code: 'CS101',
        group_name: 'CS-2401',
        title: 'Graph BFS Lab',
        due_date: 'Nov 18, 23:59',
        category: 'assignment',
        weight: '15%',
      });
    expect(createRes.status).toBe(201);
    const id = createRes.body.assignment.id;
    expect(createRes.body.announcement?.type).toBe('deadline');

    const putRes = await request(app)
      .put(`/api/assignments/${id}`)
      .send({ title: 'Graph BFS & DFS Lab', weight: '20%', due_date: 'Nov 21, 23:59' });
    expect(putRes.status).toBe(200);
    expect(putRes.body.assignment.title).toBe('Graph BFS & DFS Lab');
    expect(putRes.body.assignment.weight).toBe('20%');

    const patchRes = await request(app)
      .patch(`/api/assignments/${id}`)
      .send({ status: 'submitted', personal_note: 'Remember adjacency list complexity' });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.assignment.status).toBe('submitted');
    expect(patchRes.body.assignment.personal_note).toBe('Remember adjacency list complexity');

    const delRes = await request(app).delete(`/api/assignments/${id}`);
    expect(delRes.status).toBe(200);
  });

  it('supports teacher schedule batch import, future week filtering, edit, and announcements', async () => {
    const nextWeekIso = getWeekSummaryInfo(1).activeWeekIso;
    const importRes = await request(app)
      .post('/api/schedule/import')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        replaceWeekStart: nextWeekIso,
        items: [
          {
            course_id: 'crs-phys101',
            course_code: 'PHYS101',
            course_name: 'Physics & Laboratory',
            day: 'Wed',
            start_time: '14:00',
            end_time: '15:00',
            time_row_index: 5,
            room: 'C1.1.320',
            building: 'AITU Block C1.1',
            week_start: nextWeekIso,
          },
        ],
      });
    expect(importRes.status).toBe(201);
    expect(importRes.body.scheduleItems).toHaveLength(1);
    expect(importRes.body.scheduleItems[0].week_start).toBe(nextWeekIso);

    const weekGet = await request(app).get(`/api/schedule?week_start=${nextWeekIso}`);
    expect(weekGet.status).toBe(200);
    expect(
      weekGet.body.schedule.some((s: { week_start?: string }) => s.week_start === nextWeekIso)
    ).toBe(true);

    const boot = await request(app).get('/api/bootstrap');
    const firstClass = boot.body.schedule[0];
    expect(firstClass).toBeTruthy();

    const putRes = await request(app)
      .put(`/api/schedule/${firstClass.id}`)
      .send({ room: 'C1.2.136' });
    expect(putRes.status).toBe(200);
    expect(putRes.body.scheduleItem.room).toBe('C1.2.136');
    expect(putRes.body.announcement?.type).toBe('schedule_change');
    expect(putRes.body.announcement?.room).toBe('C1.2.136');

    const annId = putRes.body.announcement.id;
    const readRes = await request(app)
      .patch(`/api/announcements/${annId}/read`)
      .send({ unread: false });
    expect(readRes.status).toBe(200);
    expect(readRes.body.announcement.unread).toBe(false);

    const readAllRes = await request(app).post('/api/announcements/read-all');
    expect(readAllRes.status).toBe(200);
    expect(readAllRes.body.announcements.every((a: { unread: boolean }) => a.unread === false)).toBe(
      true
    );
  });

  it('enforces RBAC on teacher grade submission and triggers live GPA & grade announcement', async () => {
    const forbidden = await request(app)
      .post('/api/grades')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        student_id: 'usr-student-1',
        course_id: 'crs-phys101',
        category: 'Quiz 2',
        score: 96,
      });
    expect(forbidden.status).toBe(403);

    const ok = await request(app)
      .post('/api/grades')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        student_id: 'usr-student-1',
        course_id: 'crs-phys101',
        category: 'Final Exam',
        score: 96,
        feedback: 'Strong experimental accuracy',
      });
    expect(ok.status).toBe(200);
    expect(ok.body.grade.score).toBe(96);
    expect(ok.body.announcement?.title).toContain('PHYS101');
  });

  it('creates pending student room booking and allows admin/teacher confirmation', async () => {
    const createRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        room_number: 'C1.1.320',
        building_name: 'AITU Block C1.1',
        date: '2026-11-22',
        time_slot: '14:00 - 16:00',
        purpose: 'Physics Lab Practice',
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.booking.status).toBe('pending');

    const patchRes = await request(app)
      .patch(`/api/bookings/${createRes.body.booking.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'confirmed' });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.booking.status).toBe('confirmed');
  });

  it('answers contextual AI advisor questions with 2.33 / 3.66 scholarship thresholds and zero grant/directions text', async () => {
    const beforeQuotaRes = await request(app).get('/api/ai/quota');
    const beforeTokens = beforeQuotaRes.body.quota.used_tokens;

    const gpaRes = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ prompt: 'What is my live GPA and scholarship status?' });
    expect(gpaRes.status).toBe(200);
    expect(gpaRes.body.reply).toContain('2.33');
    expect(gpaRes.body.reply).toContain('3.66');
    expect(gpaRes.body.reply).not.toMatch(/grant/i);
    expect(gpaRes.body.reply).not.toContain('3.50');
    expect(gpaRes.body.quota.used_tokens).toBeGreaterThan(beforeTokens);

    const mapRes = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ prompt: 'Where is room C1.1.320?' });
    expect(mapRes.status).toBe(200);
    expect(mapRes.body.recommendedRoom).toBe('C1.1.320');
  });

  it('supports student life events RSVP and LMS middleware sync', async () => {
    const createEvt = await request(app)
      .post('/api/student-life')
      .send({
        title: 'AITU Fall Innovation Cup',
        organizer: 'Tech Club',
        category: 'hackathon',
        date: 'Nov 25',
        location: 'Atrium',
        room: 'ATRIUM',
        description: 'Campus hackathon',
      });
    expect(createEvt.status).toBe(201);
    const evtId = createEvt.body.event.id;

    const toggle = await request(app).post(`/api/student-life/${evtId}/toggle-register`);
    expect(toggle.status).toBe(200);
    expect(toggle.body.event.registered).toBe(true);

    const syncRes = await request(app)
      .post('/api/integrations/sync')
      .send({ provider: 'moodle' });
    expect(syncRes.status).toBe(200);
    expect(syncRes.body.synced.id).toBe('moodle');
    expect(syncRes.body.synced.synced_courses).toBeGreaterThanOrEqual(5);
  });
});
