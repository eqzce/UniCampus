/**
 * UniCampus Offline Storage Manager
 *
 * Persists and retrieves Schedule, Campus Map (buildings, rooms, floor plans),
 * Grades (scores, feedback, GPA), Attendance, and Deadlines for full offline access
 * in both Web and compiled Android APK modes.
 */

import type {
  Assignment,
  AttendanceRecord,
  CourseRecord,
  GradeRecord,
  OfflineCacheSnapshot,
  RoomBooking,
  ScheduleItem,
} from '../types';
import {
  ASSIGNMENTS_LIST,
  CAMPUS_BUILDINGS,
  CLASSROOM_LOCATIONS,
  COURSES_LIST,
  WEEKLY_SCHEDULE,
} from '../data/mockData';
import { VALID_CAMPUS_ROOMS } from '../components/map/buildings';

const STORAGE_KEY_OFFLINE_SNAPSHOT = 'unicampus_offline_snapshot_v2';
const STORAGE_KEY_OFFLINE_ENABLED = 'unicampus_offline_mode_enabled_v2';

export const DEFAULT_OFFLINE_GRADES: GradeRecord[] = [
  {
    id: 'grd-1',
    student_id: 'usr-student-1',
    course_id: 'crs-phys101',
    teacher_id: 'usr-teacher-1',
    category: 'Assignment',
    score: 95,
    feedback: 'Excellent friction & kinematics lab analysis. Clear error propagation charts.',
    updated_at: '2026-10-26T10:00:00.000Z',
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
    score: 91,
    feedback: 'Strong grasp of Newtonian mechanics; review rotational inertia derivations.',
    updated_at: '2026-10-26T12:00:00.000Z',
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
    teacher_id: 'usr-teacher-2',
    category: 'Assignment',
    score: 92,
    feedback: 'Well-structured limits and derivatives problem set solutions.',
    updated_at: '2026-10-25T15:00:00.000Z',
    course_code: 'MATH101',
    course_title: 'Calculus & Linear Algebra',
    course_credits: 5,
    student_name: 'Arystan Seitkaliyev',
    student_group: 'CS-2401',
    teacher_name: 'Prof. Danial R.',
  },
  {
    id: 'grd-4',
    student_id: 'usr-student-1',
    course_id: 'crs-math101',
    teacher_id: 'usr-teacher-2',
    category: 'Midterm 1',
    score: 94,
    feedback: 'Outstanding matrix eigenvalue proofs!',
    updated_at: '2026-10-27T09:00:00.000Z',
    course_code: 'MATH101',
    course_title: 'Calculus & Linear Algebra',
    course_credits: 5,
    student_name: 'Arystan Seitkaliyev',
    student_group: 'CS-2401',
    teacher_name: 'Prof. Danial R.',
  },
  {
    id: 'grd-5',
    student_id: 'usr-student-1',
    course_id: 'crs-cs101',
    teacher_id: 'usr-teacher-1',
    category: 'Assignment',
    score: 97,
    feedback: 'Optimal O(n log n) sorting implementation with clean edge-case tests.',
    updated_at: '2026-10-27T14:00:00.000Z',
    course_code: 'CS101',
    course_title: 'Introduction to Algorithms',
    course_credits: 6,
    student_name: 'Arystan Seitkaliyev',
    student_group: 'CS-2401',
    teacher_name: 'Dr. Yersultan M.',
  },
  {
    id: 'grd-6',
    student_id: 'usr-student-1',
    course_id: 'crs-hist102',
    teacher_id: 'usr-teacher-2',
    category: 'Assignment',
    score: 95,
    feedback: 'Deep primary-source analysis on 20th century modernization.',
    updated_at: '2026-10-24T11:00:00.000Z',
    course_code: 'HIST102',
    course_title: 'Modern History of Kazakhstan',
    course_credits: 4,
    student_name: 'Arystan Seitkaliyev',
    student_group: 'CS-2401',
    teacher_name: 'Prof. Danial R.',
  },
];

export const DEFAULT_OFFLINE_ATTENDANCE: AttendanceRecord[] = [
  { id: 'att-1', student_id: 'usr-student-1', course_id: 'crs-phys101', course_code: 'PHYS101', course_title: 'Physics & Laboratory', date: '2026-10-26', status: 'present' },
  { id: 'att-2', student_id: 'usr-student-1', course_id: 'crs-phys101', course_code: 'PHYS101', course_title: 'Physics & Laboratory', date: '2026-10-28', status: 'present' },
  { id: 'att-3', student_id: 'usr-student-1', course_id: 'crs-math101', course_code: 'MATH101', course_title: 'Calculus & Linear Algebra', date: '2026-10-26', status: 'present' },
  { id: 'att-4', student_id: 'usr-student-1', course_id: 'crs-math101', course_code: 'MATH101', course_title: 'Calculus & Linear Algebra', date: '2026-10-27', status: 'present' },
  { id: 'att-5', student_id: 'usr-student-1', course_id: 'crs-cs101', course_code: 'CS101', course_title: 'Introduction to Algorithms', date: '2026-10-27', status: 'present' },
  { id: 'att-6', student_id: 'usr-student-1', course_id: 'crs-hist102', course_code: 'HIST102', course_title: 'Modern History of Kazakhstan', date: '2026-10-28', status: 'late' },
];

export const DEFAULT_OFFLINE_COURSES: CourseRecord[] = COURSES_LIST.map((c, idx) => ({
  id: `crs-${c.code.toLowerCase()}`,
  title: c.name,
  code: c.code,
  credits: idx === 2 ? 6 : idx === 3 ? 4 : 5,
  teacher_id: idx % 2 === 0 ? 'usr-teacher-1' : 'usr-teacher-2',
  teacher_name: idx % 2 === 0 ? 'Dr. Yersultan M.' : 'Prof. Danial R.',
}));

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
      gpa: 3.78,
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
          date: '2026-10-28',
          timeSlot: '14:00 - 16:00',
          purpose: 'Group study session for CS101',
          status: 'confirmed',
        },
      ],
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
