/**
 * UniCampus Full-Stack REST API Service Layer
 *
 * Connects Web + Capacitor Android APK to the Render PostgreSQL Backend
 * with JWT authentication, 60-second Render Cold-Start handling, and Offline Mode fallback.
 */

import {
  COLD_START_BANNER_DELAY_MS,
  getApiBaseUrl,
  RENDER_COLD_START_TIMEOUT_MS,
  STORAGE_KEY_AUTH_TOKEN,
  STORAGE_KEY_AUTH_USER,
} from '../config/apiConfig';
import type {
  AssessmentCategory,
  Assignment,
  AttendanceRecord,
  AttendanceStatusType,
  AuthUser,
  CourseRecord,
  GradeRecord,
  RoomBooking,
  ScheduleItem,
  UserRole,
} from '../types';

type ColdStartListener = (isColdStarting: boolean) => void;
const coldStartListeners = new Set<ColdStartListener>();

export function onColdStartStatusChange(listener: ColdStartListener): () => void {
  coldStartListeners.add(listener);
  return () => {
    coldStartListeners.delete(listener);
  };
}

function notifyColdStart(active: boolean) {
  coldStartListeners.forEach((cb) => cb(active));
}

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_AUTH_TOKEN);
  } catch {
    return null;
  }
}

export function setStoredAuth(token: string | null, user: AuthUser | null): void {
  try {
    if (token) {
      localStorage.setItem(STORAGE_KEY_AUTH_TOKEN, token);
    } else {
      localStorage.removeItem(STORAGE_KEY_AUTH_TOKEN);
    }
    if (user) {
      localStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY_AUTH_USER);
    }
  } catch {
    // ignore storage errors
  }
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUTH_USER);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

async function fetchWithColdStartTimeout<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const token = getStoredToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), RENDER_COLD_START_TIMEOUT_MS);
  const coldStartTimer = setTimeout(() => notifyColdStart(true), COLD_START_BANNER_DELAY_MS);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `Request failed with status ${response.status}`);
    }
    return data as T;
  } finally {
    clearTimeout(timeoutId);
    clearTimeout(coldStartTimer);
    notifyColdStart(false);
  }
}

// Helper to map DB schedule rows to frontend ScheduleItem
export function mapDbScheduleItem(raw: Record<string, unknown>): ScheduleItem {
  return {
    id: String(raw.id),
    courseName: String(raw.courseName || raw.course_name || 'Course'),
    courseCode: String(raw.courseCode || raw.course_code || 'CRS101'),
    professor: String(raw.professor || 'Dr. Yersultan M.'),
    groupName: String(raw.groupName || raw.group_name || 'CS-2401'),
    day: (raw.day as ScheduleItem['day']) || 'Mon',
    startTime: String(raw.startTime || raw.start_time || '10:00'),
    endTime: String(raw.endTime || raw.end_time || '11:00'),
    timeRowIndex: Number(raw.timeRowIndex ?? raw.time_row_index ?? 1),
    durationHours: Number(raw.durationHours ?? raw.duration_hours ?? 1),
    room: String(raw.room || 'C1.1.320'),
    building: String(raw.building || 'AITU Block C1.1'),
    color: (raw.color as ScheduleItem['color']) || 'blue',
  };
}

// Helper to map DB assignment rows to frontend Assignment
export function mapDbAssignment(raw: Record<string, unknown>, grades: GradeRecord[] = []): Assignment {
  const dueFormatted = String(raw.dueFormatted || raw.due_date || raw.dueDate || 'Nov 05, 23:59');
  const shortDate = dueFormatted.split(',')[0].replace(/^Due\s+/i, '');
  const courseCode = String(raw.courseCode || raw.course_code || 'PHYS101');
  const matchedGrade = grades.find(
    (g) => g.course_code === courseCode && g.category.toLowerCase().includes(String(raw.category || 'assignment').toLowerCase())
  );

  return {
    id: String(raw.id),
    title: String(raw.title || 'Task'),
    description: String(raw.description || ''),
    category: (raw.category as AssessmentCategory) || 'assignment',
    courseCode,
    courseName: String(raw.courseName || raw.course_name || courseCode),
    groupName: String(raw.groupName || raw.group_name || 'CS-2401'),
    dueDate: `Due ${shortDate}`,
    dueFormatted,
    daysLeft: typeof raw.daysLeft === 'number' ? raw.daysLeft : 3,
    status: matchedGrade ? 'graded' : ((raw.status as Assignment['status']) || 'todo'),
    weight: String(raw.weight || '10%'),
    grade: matchedGrade ? `${matchedGrade.score}/100` : (raw.grade as string | undefined),
    hasPersonalNote: Boolean(raw.description),
    personalNote: raw.description ? String(raw.description) : undefined,
  };
}

export function mapDbBooking(raw: Record<string, unknown>): RoomBooking {
  return {
    id: String(raw.id),
    userId: raw.user_id ? String(raw.user_id) : null,
    userName: String(raw.user_name || raw.userName || 'Student'),
    userRole: (raw.user_role as UserRole) || 'student',
    roomNumber: String(raw.room_number || raw.roomNumber || 'Study Room B'),
    buildingName: String(raw.building_name || raw.buildingName || 'Main Library'),
    date: String(raw.date || '2026-10-28'),
    timeSlot: String(raw.time_slot || raw.timeSlot || '14:00 - 16:00'),
    purpose: String(raw.purpose || 'Study session'),
    status: (raw.status as RoomBooking['status']) || 'pending',
    createdAt: raw.created_at ? String(raw.created_at) : undefined,
  };
}

export const ApiService = {
  async login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
    const res = await fetchWithColdStartTimeout<{ token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredAuth(res.token, res.user);
    return res;
  },

  async register(payload: {
    email: string;
    password: string;
    full_name: string;
    role: UserRole;
    group_name?: string;
    department?: string;
  }): Promise<{ token: string; user: AuthUser }> {
    const res = await fetchWithColdStartTimeout<{ token: string; user: AuthUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setStoredAuth(res.token, res.user);
    return res;
  },

  async fetchBootstrap() {
    const data = await fetchWithColdStartTimeout<{
      user: AuthUser | null;
      courses: CourseRecord[];
      teachers?: AuthUser[];
      students?: AuthUser[];
      grades: GradeRecord[];
      gpa?: number;
      attendance: AttendanceRecord[];
      assignments: Record<string, unknown>[];
      schedule: Record<string, unknown>[];
      bookings: Record<string, unknown>[];
      syncedAt: string;
    }>('/bootstrap');

    return {
      user: data.user,
      courses: data.courses || [],
      teachers: data.teachers || [],
      students: data.students || [],
      grades: data.grades || [],
      gpa: data.gpa ?? 3.78,
      attendance: data.attendance || [],
      assignments: (data.assignments || []).map((a) => mapDbAssignment(a, data.grades || [])),
      schedule: (data.schedule || []).map(mapDbScheduleItem),
      bookings: (data.bookings || []).map(mapDbBooking),
      syncedAt: data.syncedAt,
    };
  },

  async createCourse(payload: {
    title: string;
    code: string;
    credits: number;
    teacher_id: string;
  }): Promise<CourseRecord> {
    const res = await fetchWithColdStartTimeout<{ course: CourseRecord }>('/courses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.course;
  },

  async updateCourse(
    id: string,
    payload: {
      title?: string;
      code?: string;
      credits?: number;
      teacher_id?: string;
    }
  ): Promise<CourseRecord> {
    const res = await fetchWithColdStartTimeout<{ course: CourseRecord }>(`/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res.course;
  },

  async deleteCourse(id: string): Promise<void> {
    await fetchWithColdStartTimeout(`/courses/${id}`, {
      method: 'DELETE',
    });
  },

  async saveGrade(payload: {
    id?: string;
    student_id: string;
    course_id: string;
    category: string;
    score: number;
    feedback: string;
  }): Promise<GradeRecord> {
    const res = await fetchWithColdStartTimeout<{ grade: GradeRecord }>('/grades', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.grade;
  },

  async saveAttendance(payload: {
    student_id?: string;
    course_id: string;
    date: string;
    status?: AttendanceStatusType;
    records?: { student_id: string; status: AttendanceStatusType }[];
  }): Promise<AttendanceRecord | AttendanceRecord[]> {
    const res = await fetchWithColdStartTimeout<{ attendance: AttendanceRecord | AttendanceRecord[] }>(
      '/attendance',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return res.attendance;
  },

  async createAssignment(payload: {
    course_id?: string;
    course_code?: string;
    group_name: string;
    title: string;
    description?: string;
    due_date: string;
    category?: AssessmentCategory;
    weight?: string;
  }): Promise<Assignment> {
    const res = await fetchWithColdStartTimeout<{ assignment: Record<string, unknown> }>(
      '/assignments',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return mapDbAssignment(res.assignment);
  },

  async deleteAssignment(id: string): Promise<void> {
    await fetchWithColdStartTimeout(`/assignments/${id}`, {
      method: 'DELETE',
    });
  },

  async createScheduleItem(payload: Omit<ScheduleItem, 'id'>): Promise<ScheduleItem> {
    const res = await fetchWithColdStartTimeout<{ scheduleItem: Record<string, unknown> }>(
      '/schedule',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return mapDbScheduleItem(res.scheduleItem);
  },

  async updateScheduleItem(id: string, payload: Partial<Omit<ScheduleItem, 'id'>>): Promise<ScheduleItem> {
    const res = await fetchWithColdStartTimeout<{ scheduleItem: Record<string, unknown> }>(
      `/schedule/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    );
    return mapDbScheduleItem(res.scheduleItem);
  },

  async deleteScheduleItem(id: string): Promise<void> {
    await fetchWithColdStartTimeout(`/schedule/${id}`, {
      method: 'DELETE',
    });
  },

  async createBooking(payload: {
    room_number: string;
    building_name: string;
    date: string;
    time_slot: string;
    purpose: string;
    user_name?: string;
    user_role?: UserRole;
  }): Promise<RoomBooking> {
    const res = await fetchWithColdStartTimeout<{ booking: Record<string, unknown> }>('/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return mapDbBooking(res.booking);
  },

  async updateBookingStatus(id: string, status: 'confirmed' | 'pending' | 'rejected'): Promise<RoomBooking> {
    const res = await fetchWithColdStartTimeout<{ booking: Record<string, unknown> }>(
      `/bookings/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }
    );
    return mapDbBooking(res.booking);
  },
};
