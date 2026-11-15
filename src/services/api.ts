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
  AIQuotaInfo,
  Announcement,
  AssessmentCategory,
  Assignment,
  AttendanceRecord,
  AttendanceStatusType,
  AuthUser,
  CourseRecord,
  GradeRecord,
  LmsIntegrationItem,
  RoomBooking,
  ScheduleItem,
  StudentLifeEvent,
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
    courseId: raw.course_id || raw.courseId ? String(raw.course_id || raw.courseId) : undefined,
    courseName: String(raw.courseName || raw.course_name || 'Course'),
    courseCode: String(raw.courseCode || raw.course_code || 'CRS101'),
    professor: String(raw.professor || 'Dr. Yersultan M.'),
    groupName: String(raw.groupName || raw.group_name || 'CS-2401'),
    weekStart: String(raw.weekStart || raw.week_start || 'recurring'),
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
  const noteText =
    raw.personal_note !== undefined && raw.personal_note !== null
      ? String(raw.personal_note)
      : raw.personalNote !== undefined && raw.personalNote !== null
        ? String(raw.personalNote)
        : '';

  return {
    id: String(raw.id),
    courseId: raw.course_id || raw.courseId ? String(raw.course_id || raw.courseId) : undefined,
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
    hasPersonalNote: Boolean(noteText.trim()),
    personalNote: noteText.trim() ? noteText : undefined,
  };
}

export function mapDbAnnouncement(raw: Record<string, unknown>): Announcement {
  return {
    id: String(raw.id),
    title: String(raw.title || 'Campus Notice'),
    courseCode: raw.course_code || raw.courseCode ? String(raw.course_code || raw.courseCode) : undefined,
    room: raw.room ? String(raw.room) : undefined,
    timestamp: String(raw.timestamp || 'Just now'),
    createdAt: raw.created_at || raw.createdAt ? String(raw.created_at || raw.createdAt) : undefined,
    description: String(raw.description || ''),
    unread: Boolean(raw.unread),
    type: (['schedule_change', 'deadline', 'admin', 'scholarship'].includes(String(raw.type))
      ? raw.type
      : 'admin') as Announcement['type'],
  };
}

export function mapDbStudentLifeEvent(raw: Record<string, unknown>): StudentLifeEvent {
  const rawCategory = String(raw.category || 'club');
  const category = (['hackathon', 'career', 'club', 'lecture'].includes(rawCategory)
    ? rawCategory
    : 'lecture') as StudentLifeEvent['category'];
  return {
    id: String(raw.id),
    title: String(raw.title || 'Campus Event'),
    organizer: String(raw.organizer || 'AITU Student Hub'),
    category,
    date: String(raw.date || 'Upcoming'),
    location: String(raw.location || 'AITU Atrium'),
    room: raw.room ? String(raw.room) : undefined,
    prizeOrPerks:
      raw.prize_or_perks || raw.prizeOrPerks
        ? String(raw.prize_or_perks || raw.prizeOrPerks)
        : undefined,
    isSponsored: Boolean(raw.is_sponsored ?? raw.isSponsored),
    registered: Boolean(raw.registered),
    description: String(raw.description || ''),
  };
}

export function mapDbLmsIntegration(raw: Record<string, unknown>): LmsIntegrationItem {
  return {
    id: (raw.id as LmsIntegrationItem['id']) || 'moodle',
    name: String(raw.name || 'Moodle LMS'),
    protocol: String(raw.protocol || 'REST API'),
    status: (raw.status as LmsIntegrationItem['status']) || 'connected',
    lastSyncedAt: String(raw.last_synced_at || raw.lastSyncedAt || new Date().toISOString()),
    syncedCourses: Number(raw.synced_courses ?? raw.syncedCourses ?? 0),
    syncedGrades: Number(raw.synced_grades ?? raw.syncedGrades ?? 0),
    syncedStudents: Number(raw.synced_students ?? raw.syncedStudents ?? 0),
  };
}

export function mapDbAiQuota(raw?: Record<string, unknown> | null): AIQuotaInfo {
  return {
    usedTokens: Number(raw?.used_tokens ?? raw?.usedTokens ?? 1420),
    monthlyQuota: Number(raw?.monthly_quota ?? raw?.monthlyQuota ?? 10000),
    queriesCount: Number(raw?.queries_count ?? raw?.queriesCount ?? 14),
    tier: String(raw?.tier || 'B2B Institutional Metered Tier'),
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
    date: String(raw.date || new Date().toISOString().slice(0, 10)),
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
    enrolled_course_ids?: string[];
    course_code?: string;
    course_title?: string;
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
      announcements?: Record<string, unknown>[];
      studentLifeEvents?: Record<string, unknown>[];
      lmsIntegrations?: Record<string, unknown>[];
      aiQuota?: Record<string, unknown>;
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
      announcements: (data.announcements || []).map(mapDbAnnouncement),
      studentLifeEvents: (data.studentLifeEvents || []).map(mapDbStudentLifeEvent),
      lmsIntegrations: (data.lmsIntegrations || []).map(mapDbLmsIntegration),
      aiQuota: mapDbAiQuota(data.aiQuota),
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

  async updateAssignment(
    id: string,
    payload: {
      status?: 'todo' | 'submitted' | 'graded';
      personal_note?: string;
      description?: string;
      title?: string;
      due_date?: string;
      grade?: string;
      category?: AssessmentCategory;
      weight?: string;
      group_name?: string;
      course_id?: string;
    }
  ): Promise<Assignment> {
    const res = await fetchWithColdStartTimeout<{ assignment: Record<string, unknown> }>(
      `/assignments/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    );
    return mapDbAssignment(res.assignment);
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

  async importScheduleItems(
    items: Array<Omit<ScheduleItem, 'id'>>,
    replaceWeekStart?: string
  ): Promise<ScheduleItem[]> {
    const res = await fetchWithColdStartTimeout<{ scheduleItems: Record<string, unknown>[] }>(
      '/schedule/import',
      {
        method: 'POST',
        body: JSON.stringify({ items, replaceWeekStart }),
      }
    );
    return (res.scheduleItems || []).map(mapDbScheduleItem);
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

  async getAnnouncements(): Promise<Announcement[]> {
    const res = await fetchWithColdStartTimeout<{ announcements: Record<string, unknown>[] }>('/announcements');
    return (res.announcements || []).map(mapDbAnnouncement);
  },

  async createAnnouncement(payload: {
    title: string;
    description: string;
    course_code?: string;
    room?: string;
    type?: Announcement['type'];
  }): Promise<Announcement> {
    const res = await fetchWithColdStartTimeout<{ announcement: Record<string, unknown> }>('/announcements', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return mapDbAnnouncement(res.announcement);
  },

  async markAnnouncementRead(id: string, unread = false): Promise<Announcement> {
    const res = await fetchWithColdStartTimeout<{ announcement: Record<string, unknown> }>(
      `/announcements/${id}/read`,
      {
        method: 'PATCH',
        body: JSON.stringify({ unread }),
      }
    );
    return mapDbAnnouncement(res.announcement);
  },

  async markAllAnnouncementsRead(): Promise<Announcement[]> {
    const res = await fetchWithColdStartTimeout<{ announcements: Record<string, unknown>[] }>(
      '/announcements/read-all',
      { method: 'POST' }
    );
    return (res.announcements || []).map(mapDbAnnouncement);
  },

  async getStudentLifeEvents(): Promise<StudentLifeEvent[]> {
    const res = await fetchWithColdStartTimeout<{ events: Record<string, unknown>[] }>('/student-life');
    return (res.events || []).map(mapDbStudentLifeEvent);
  },

  async createStudentLifeEvent(payload: {
    title: string;
    organizer: string;
    category: StudentLifeEvent['category'];
    date: string;
    location: string;
    room?: string;
    prize_or_perks?: string;
    is_sponsored?: boolean;
    description: string;
  }): Promise<StudentLifeEvent> {
    const res = await fetchWithColdStartTimeout<{ event: Record<string, unknown> }>('/student-life', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return mapDbStudentLifeEvent(res.event);
  },

  async toggleStudentLifeRegistration(id: string): Promise<StudentLifeEvent> {
    const res = await fetchWithColdStartTimeout<{ event: Record<string, unknown> }>(
      `/student-life/${id}/toggle-register`,
      { method: 'POST' }
    );
    return mapDbStudentLifeEvent(res.event);
  },

  async getIntegrations(): Promise<LmsIntegrationItem[]> {
    const res = await fetchWithColdStartTimeout<{ integrations: Record<string, unknown>[] }>('/integrations');
    return (res.integrations || []).map(mapDbLmsIntegration);
  },

  async syncIntegration(provider: string = 'all'): Promise<LmsIntegrationItem[]> {
    const res = await fetchWithColdStartTimeout<{ integrations: Record<string, unknown>[] }>(
      '/integrations/sync',
      {
        method: 'POST',
        body: JSON.stringify({ provider }),
      }
    );
    return (res.integrations || []).map(mapDbLmsIntegration);
  },

  async getAIQuota(): Promise<AIQuotaInfo> {
    const res = await fetchWithColdStartTimeout<{ quota: Record<string, unknown> }>('/ai/quota');
    return mapDbAiQuota(res.quota);
  },

  async askAIAdvisor(payload: {
    prompt: string;
    userId?: string;
    groupName?: string;
  }): Promise<{
    reply: string;
    recommendedRoom: string | null;
    recommendedTab: string | null;
    provider: string;
    quota: AIQuotaInfo;
  }> {
    const res = await fetchWithColdStartTimeout<{
      reply: string;
      recommendedRoom: string | null;
      recommendedTab: string | null;
      provider: string;
      quota: Record<string, unknown>;
    }>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return {
      reply: res.reply,
      recommendedRoom: res.recommendedRoom || null,
      recommendedTab: res.recommendedTab || null,
      provider: res.provider || 'unicampus-contextual-engine',
      quota: mapDbAiQuota(res.quota),
    };
  },
};
