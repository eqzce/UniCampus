/**
 * UniCampus Offline Storage Manager
 *
 * Persists and retrieves Schedule, Campus Map (buildings, rooms, floor plans),
 * Grades (scores, feedback, GPA), Attendance, and Deadlines for full offline access
 * in both Web and compiled Android APK modes.
 */

import type {
  Announcement,
  Assignment,
  AttendanceRecord,
  CourseRecord,
  GradeRecord,
  OfflineCacheSnapshot,
  RoomBooking,
  ScheduleItem,
  StudentLifeEvent,
} from '../types';
import {
  ASSIGNMENTS_LIST,
  CAMPUS_BUILDINGS,
  CLASSROOM_LOCATIONS,
  COURSES_LIST,
  DEFAULT_STUDENT_LIFE_EVENTS,
  RECENT_ANNOUNCEMENTS,
  WEEKLY_SCHEDULE,
} from '../data/mockData';
import { VALID_CAMPUS_ROOMS } from '../components/map/buildings';
import { getRelativeIsoDate } from '../utils/dateUtils';

const STORAGE_KEY_OFFLINE_SNAPSHOT = 'unicampus_offline_snapshot_v3';
const STORAGE_KEY_OFFLINE_ENABLED = 'unicampus_offline_mode_enabled_v2';

export const DEFAULT_OFFLINE_GRADES: GradeRecord[] = [
  // Student 1: Arystan Seitkaliyev (CS-2401, High GPA ~3.90 -> Increased Scholarship)
  {
    id: 'grd-1',
    student_id: 'usr-student-1',
    course_id: 'crs-phys101',
    teacher_id: 'usr-teacher-1',
    category: 'Assignment',
    score: 96,
    feedback: 'Excellent friction & kinematics lab analysis. Clear error propagation charts.',
    updated_at: new Date().toISOString(),
    course_code: 'PHYS101',
    course_title: 'Physics & Laboratory',
    course_credits: 5,
    student_name: 'Arystan Seitkaliyev',
    student_group: 'CS-2401',
    teacher_name: 'Dr. Yersultan M.',
  },
  {
    id: 'grd-2',
    student_id: 'usr-student-1',
    course_id: 'crs-phys101',
    teacher_id: 'usr-teacher-1',
    category: 'Midterm 1',
    score: 94,
    feedback: 'Strong grasp of Newtonian mechanics and rotational inertia.',
    updated_at: new Date().toISOString(),
    course_code: 'PHYS101',
    course_title: 'Physics & Laboratory',
    course_credits: 5,
    student_name: 'Arystan Seitkaliyev',
    student_group: 'CS-2401',
    teacher_name: 'Dr. Yersultan M.',
  },
  {
    id: 'grd-3',
    student_id: 'usr-student-1',
    course_id: 'crs-math101',
    teacher_id: 'usr-teacher-1',
    category: 'Assignment',
    score: 92,
    feedback: 'Well-structured limits and derivatives problem set solutions.',
    updated_at: new Date().toISOString(),
    course_code: 'MATH101',
    course_title: 'Calculus & Linear Algebra',
    course_credits: 5,
    student_name: 'Arystan Seitkaliyev',
    student_group: 'CS-2401',
    teacher_name: 'Dr. Yersultan M.',
  },
  {
    id: 'grd-4',
    student_id: 'usr-student-1',
    course_id: 'crs-math101',
    teacher_id: 'usr-teacher-1',
    category: 'Midterm 1',
    score: 94,
    feedback: 'Outstanding matrix eigenvalue proofs!',
    updated_at: new Date().toISOString(),
    course_code: 'MATH101',
    course_title: 'Calculus & Linear Algebra',
    course_credits: 5,
    student_name: 'Arystan Seitkaliyev',
    student_group: 'CS-2401',
    teacher_name: 'Dr. Yersultan M.',
  },
  {
    id: 'grd-5',
    student_id: 'usr-student-1',
    course_id: 'crs-cs101',
    teacher_id: 'usr-teacher-3',
    category: 'Assignment',
    score: 97,
    feedback: 'Optimal O(n log n) sorting implementation with clean edge-case tests.',
    updated_at: new Date().toISOString(),
    course_code: 'CS101',
    course_title: 'Introduction to Algorithms',
    course_credits: 6,
    student_name: 'Arystan Seitkaliyev',
    student_group: 'CS-2401',
    teacher_name: 'Dr. Aigerim S.',
  },
  // Student 2: Alisher Nurlanov (SE-2402, Medium GPA ~2.95 -> Standard Scholarship)
  {
    id: 'grd-8',
    student_id: 'usr-student-2',
    course_id: 'crs-math101',
    teacher_id: 'usr-teacher-1',
    category: 'Midterm 1',
    score: 82,
    feedback: 'Solid integration steps; watch boundary limits on triple integrals.',
    updated_at: new Date().toISOString(),
    course_code: 'MATH101',
    course_title: 'Calculus & Linear Algebra',
    course_credits: 5,
    student_name: 'Alisher Nurlanov',
    student_group: 'SE-2402',
    teacher_name: 'Dr. Yersultan M.',
  },
  {
    id: 'grd-9',
    student_id: 'usr-student-2',
    course_id: 'crs-cs101',
    teacher_id: 'usr-teacher-3',
    category: 'Assignment',
    score: 86,
    feedback: 'Clean recursion tree; analyze worst-case memory overhead.',
    updated_at: new Date().toISOString(),
    course_code: 'CS101',
    course_title: 'Introduction to Algorithms',
    course_credits: 6,
    student_name: 'Alisher Nurlanov',
    student_group: 'SE-2402',
    teacher_name: 'Dr. Aigerim S.',
  },
  {
    id: 'grd-10',
    student_id: 'usr-student-2',
    course_id: 'crs-hist102',
    teacher_id: 'usr-teacher-4',
    category: 'Assignment',
    score: 74,
    feedback: 'Good timeline overview; add more primary-source citations.',
    updated_at: new Date().toISOString(),
    course_code: 'HIST102',
    course_title: 'Modern History of Kazakhstan',
    course_credits: 4,
    student_name: 'Alisher Nurlanov',
    student_group: 'SE-2402',
    teacher_name: 'Prof. Serik B.',
  },
  // Student 3: Dana Suleimenova (IT-2403, Low GPA ~1.69)
  {
    id: 'grd-11',
    student_id: 'usr-student-3',
    course_id: 'crs-phys101',
    teacher_id: 'usr-teacher-1',
    category: 'Midterm 1',
    score: 66,
    feedback: 'Review torque balance equations and attend weekly lab office hours.',
    updated_at: new Date().toISOString(),
    course_code: 'PHYS101',
    course_title: 'Physics & Laboratory',
    course_credits: 5,
    student_name: 'Dana Suleimenova',
    student_group: 'IT-2403',
    teacher_name: 'Dr. Yersultan M.',
  },
  {
    id: 'grd-12',
    student_id: 'usr-student-3',
    course_id: 'crs-hist102',
    teacher_id: 'usr-teacher-4',
    category: 'Quiz',
    score: 61,
    feedback: 'Missed key dates from the 20th-century constitutional reforms module.',
    updated_at: new Date().toISOString(),
    course_code: 'HIST102',
    course_title: 'Modern History of Kazakhstan',
    course_credits: 4,
    student_name: 'Dana Suleimenova',
    student_group: 'IT-2403',
    teacher_name: 'Prof. Serik B.',
  },
  {
    id: 'grd-13',
    student_id: 'usr-student-3',
    course_id: 'crs-eng103',
    teacher_id: 'usr-teacher-5',
    category: 'Assignment',
    score: 59,
    feedback: 'Needs thesis statement clarity and proper IEEE reference formatting.',
    updated_at: new Date().toISOString(),
    course_code: 'ENG103',
    course_title: 'Academic & Technical English',
    course_credits: 4,
    student_name: 'Dana Suleimenova',
    student_group: 'IT-2403',
    teacher_name: 'Dr. Elena K.',
  },
];

export const DEFAULT_OFFLINE_ATTENDANCE: AttendanceRecord[] = [
  { id: 'att-1', student_id: 'usr-student-1', course_id: 'crs-phys101', course_code: 'PHYS101', course_title: 'Physics & Laboratory', date: getRelativeIsoDate(-2), status: 'present' },
  { id: 'att-2', student_id: 'usr-student-1', course_id: 'crs-phys101', course_code: 'PHYS101', course_title: 'Physics & Laboratory', date: getRelativeIsoDate(0), status: 'present' },
  { id: 'att-3', student_id: 'usr-student-1', course_id: 'crs-math101', course_code: 'MATH101', course_title: 'Calculus & Linear Algebra', date: getRelativeIsoDate(-1), status: 'present' },
  { id: 'att-4', student_id: 'usr-student-1', course_id: 'crs-cs101', course_code: 'CS101', course_title: 'Introduction to Algorithms', date: getRelativeIsoDate(0), status: 'present' },
  { id: 'att-5', student_id: 'usr-student-2', course_id: 'crs-math101', course_code: 'MATH101', course_title: 'Calculus & Linear Algebra', date: getRelativeIsoDate(-1), status: 'present' },
  { id: 'att-6', student_id: 'usr-student-2', course_id: 'crs-cs101', course_code: 'CS101', course_title: 'Introduction to Algorithms', date: getRelativeIsoDate(0), status: 'present' },
  { id: 'att-7', student_id: 'usr-student-2', course_id: 'crs-hist102', course_code: 'HIST102', course_title: 'Modern History of Kazakhstan', date: getRelativeIsoDate(-2), status: 'late' },
  { id: 'att-8', student_id: 'usr-student-3', course_id: 'crs-phys101', course_code: 'PHYS101', course_title: 'Physics & Laboratory', date: getRelativeIsoDate(-2), status: 'absent' },
  { id: 'att-9', student_id: 'usr-student-3', course_id: 'crs-hist102', course_code: 'HIST102', course_title: 'Modern History of Kazakhstan', date: getRelativeIsoDate(-1), status: 'present' },
  { id: 'att-10', student_id: 'usr-student-3', course_id: 'crs-eng103', course_code: 'ENG103', course_title: 'Academic & Technical English', date: getRelativeIsoDate(0), status: 'late' },
];

const DEFAULT_TEACHER_BY_CODE: Record<string, { id: string; name: string; credits: number }> = {
  PHYS101: { id: 'usr-teacher-1', name: 'Dr. Yersultan M.', credits: 5 },
  MATH101: { id: 'usr-teacher-1', name: 'Dr. Yersultan M.', credits: 5 },
  CS101: { id: 'usr-teacher-3', name: 'Dr. Aigerim S.', credits: 6 },
  HIST102: { id: 'usr-teacher-4', name: 'Prof. Serik B.', credits: 4 },
  ENG103: { id: 'usr-teacher-5', name: 'Dr. Elena K.', credits: 4 },
};

export const DEFAULT_OFFLINE_COURSES: CourseRecord[] = COURSES_LIST.map((c) => {
  const meta = DEFAULT_TEACHER_BY_CODE[c.code] || { id: 'usr-teacher-1', name: 'Dr. Yersultan M.', credits: 5 };
  return {
    id: `crs-${c.code.toLowerCase()}`,
    title: c.name,
    code: c.code,
    credits: meta.credits,
    teacher_id: meta.id,
    teacher_name: meta.name,
  };
});

export const OfflineStorage = {
  isOfflineModeEnabled(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY_OFFLINE_ENABLED) === 'true';
    } catch {
      return false;
    }
  },

  setOfflineModeEnabled(enabled: boolean): void {
    try {
      localStorage.setItem(STORAGE_KEY_OFFLINE_ENABLED, enabled ? 'true' : 'false');
    } catch {
      // ignore storage errors
    }
  },

  saveSnapshot(partial: {
    schedule?: ScheduleItem[];
    grades?: GradeRecord[];
    gpa?: number;
    attendance?: AttendanceRecord[];
    assignments?: Assignment[];
    courses?: CourseRecord[];
    bookings?: RoomBooking[];
    announcements?: Announcement[];
    studentLifeEvents?: StudentLifeEvent[];
  }): OfflineCacheSnapshot {
    const existing = this.loadSnapshot();
    const snapshot: OfflineCacheSnapshot = {
      lastSyncedAt: new Date().toISOString(),
      schedule: partial.schedule ?? existing.schedule,
      grades: partial.grades ?? existing.grades,
      gpa: partial.gpa ?? existing.gpa,
      attendance: partial.attendance ?? existing.attendance,
      assignments: partial.assignments ?? existing.assignments,
      courses: partial.courses ?? existing.courses,
      bookings: partial.bookings ?? existing.bookings,
      announcements: partial.announcements ?? existing.announcements,
      studentLifeEvents: partial.studentLifeEvents ?? existing.studentLifeEvents,
      mapData: {
        buildings: CAMPUS_BUILDINGS,
        classrooms: CLASSROOM_LOCATIONS,
        validRooms: VALID_CAMPUS_ROOMS,
        floorsCached: [1, 2, 3],
      },
    };

    try {
      localStorage.setItem(STORAGE_KEY_OFFLINE_SNAPSHOT, JSON.stringify(snapshot));
    } catch {
      // ignore storage quota errors
    }

    return snapshot;
  },

  loadSnapshot(): OfflineCacheSnapshot {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_OFFLINE_SNAPSHOT);
      if (raw) {
        const parsed = JSON.parse(raw) as OfflineCacheSnapshot;
        if (parsed && Array.isArray(parsed.schedule) && Array.isArray(parsed.grades)) {
          return parsed;
        }
      }
    } catch {
      // ignore parse errors
    }

    return {
      lastSyncedAt: new Date().toISOString(),
      schedule: WEEKLY_SCHEDULE,
      grades: DEFAULT_OFFLINE_GRADES,
      gpa: 3.90,
      attendance: DEFAULT_OFFLINE_ATTENDANCE,
      assignments: ASSIGNMENTS_LIST,
      courses: DEFAULT_OFFLINE_COURSES,
      bookings: [
        {
          id: 'bk-1',
          userName: 'Arystan Seitkaliyev',
          userRole: 'student',
          roomNumber: 'Study Room B',
          buildingName: 'AITU Main Library',
          date: getRelativeIsoDate(0),
          timeSlot: '14:00 - 16:00',
          purpose: 'Group study session for CS101',
          status: 'confirmed',
        },
      ],
      announcements: RECENT_ANNOUNCEMENTS,
      studentLifeEvents: DEFAULT_STUDENT_LIFE_EVENTS,
      mapData: {
        buildings: CAMPUS_BUILDINGS,
        classrooms: CLASSROOM_LOCATIONS,
        validRooms: VALID_CAMPUS_ROOMS,
        floorsCached: [1, 2, 3],
      },
    };
  },

  hasSavedCache(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY_OFFLINE_SNAPSHOT) !== null;
    } catch {
      return false;
    }
  },
};
