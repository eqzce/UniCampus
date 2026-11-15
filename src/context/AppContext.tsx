import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type {
  TabType,
  TeacherTabType,
  AdminTabType,
  Assignment,
  AssignmentStatus,
  ScheduleItem,
  AuthUser,
  UserRole,
  CourseRecord,
  GradeRecord,
  AttendanceRecord,
  AttendanceStatusType,
  RoomBooking,
  AssessmentCategory,
  Announcement,
  StudentLifeEvent,
  LmsIntegrationItem,
  AIQuotaInfo,
} from '../types';
import {
  ASSIGNMENTS_LIST,
  CURRENT_STUDENT,
  DEFAULT_LMS_INTEGRATIONS,
  DEFAULT_STUDENT_LIFE_EVENTS,
  RECENT_ANNOUNCEMENTS,
  WEEKLY_SCHEDULE,
} from '../data/mockData';
import { formatShortMonthDay } from '../utils/dateUtils';
import {
  ApiService,
  getStoredToken,
  getStoredUser,
  onColdStartStatusChange,
  setStoredAuth,
} from '../services/api';
import {
  DEFAULT_OFFLINE_ATTENDANCE,
  DEFAULT_OFFLINE_COURSES,
  DEFAULT_OFFLINE_GRADES,
  OfflineStorage,
} from '../services/offlineStorage';

export type ViewLayoutMode = 'phone' | 'all-screens' | 'fullscreen';

const STORAGE_KEY_SCHEDULE = 'unicampus_schedule_v1';
const STORAGE_KEY_ASSIGNMENTS = 'unicampus_assignments_v1';

// Helper to compute 4.0 GPA dynamically from 0-100 course grades
function computeDynamicGpa(grades: GradeRecord[], courses: CourseRecord[]): number {
  if (!grades || grades.length === 0) return CURRENT_STUDENT.gpa;
  const courseMap = new Map(courses.map((c) => [c.id, c]));
  const byCourse = new Map<string, number[]>();

  for (const g of grades) {
    const key = g.course_id || g.course_code || 'default';
    if (!byCourse.has(key)) byCourse.set(key, []);
    byCourse.get(key)!.push(Number(g.score));
  }

  const scoreToPoints = (s: number) => {
    if (s >= 95) return 4.0;
    if (s >= 90) return 3.67;
    if (s >= 85) return 3.33;
    if (s >= 80) return 3.0;
    if (s >= 75) return 2.67;
    if (s >= 70) return 2.33;
    if (s >= 65) return 2.0;
    if (s >= 60) return 1.67;
    if (s >= 55) return 1.33;
    if (s >= 50) return 1.0;
    return 0.0;
  };

  let weighted = 0;
  let totalCredits = 0;
  for (const [cid, scores] of byCourse.entries()) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const credits = courseMap.get(cid)?.credits || 5;
    weighted += scoreToPoints(avg) * credits;
    totalCredits += credits;
  }

  return totalCredits > 0 ? Number((weighted / totalCredits).toFixed(2)) : CURRENT_STUDENT.gpa;
}

interface AppContextType {
  // Navigation & Tabs
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  teacherActiveTab: TeacherTabType;
  setTeacherActiveTab: (tab: TeacherTabType) => void;
  adminActiveTab: AdminTabType;
  setAdminActiveTab: (tab: AdminTabType) => void;
  selectedRoomForNav: string | null;
  roomNavTimestamp: number;
  navigateToClassroom: (room: string) => void;
  clearRoomNavigation: () => void;

  // View presentation mode
  viewMode: ViewLayoutMode;
  setViewMode: (mode: ViewLayoutMode) => void;

  // Authentication & Role State
  currentUser: AuthUser | null;
  userRole: UserRole;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  loginWithCredentials: (email: string, password: string) => Promise<AuthUser>;
  registerAccount: (payload: {
    email: string;
    password: string;
    full_name: string;
    role: UserRole;
    group_name?: string;
    department?: string;
    enrolled_course_ids?: string[];
    course_code?: string;
    course_title?: string;
  }) => Promise<AuthUser>;
  logout: () => void;

  // Backend Sync & Cold-Start Status
  isSyncing: boolean;
  isColdStarting: boolean;
  backendConnected: boolean;
  lastSyncedAt: string | null;
  refreshFromBackend: () => Promise<void>;
  saveAllForOffline: () => void;

  // Modals
  isProfileOpen: boolean;
  setIsProfileOpen: (open: boolean) => void;
  isNotificationsOpen: boolean;
  setIsNotificationsOpen: (open: boolean) => void;
  isAIAssistantOpen: boolean;
  setIsAIAssistantOpen: (open: boolean) => void;
  isBookingOpen: boolean;
  setIsBookingOpen: (open: boolean) => void;
  preselectedBookingRoom: { roomNumber: string; buildingName?: string } | null;
  setPreselectedBookingRoom: (target: { roomNumber: string; buildingName?: string } | null) => void;
  openRoomBookingFor: (roomNumber: string, buildingName?: string) => void;
  isQuickActionsOpen: boolean;
  setIsQuickActionsOpen: (open: boolean) => void;
  isAddScheduleOpen: boolean;
  setIsAddScheduleOpen: (open: boolean) => void;

  // Schedule state & actions
  scheduleItems: ScheduleItem[];
  selectedWeekOffset: number;
  setSelectedWeekOffset: React.Dispatch<React.SetStateAction<number>>;
  addScheduleItem: (
    item: Omit<ScheduleItem, 'id'>,
    homework?: { title: string; dueDate?: string; daysLeft?: number }
  ) => ScheduleItem;
  importTeacherSchedule: (
    items: Array<Omit<ScheduleItem, 'id'>>,
    replaceWeekStart?: string
  ) => Promise<void>;
  updateScheduleClass: (id: string, payload: Partial<Omit<ScheduleItem, 'id'>>) => Promise<void>;
  removeScheduleItem: (id: string) => void;
  clearAllSchedule: () => void;
  resetDefaultSchedule: () => void;
  saveScheduleBackup: () => void;
  restoreSavedSchedule: () => void;
  addHomeworkForCourse: (
    courseName: string,
    courseCode: string,
    title: string,
    dueDate?: string,
    daysLeft?: number
  ) => void;
  removeAssignment: (id: string) => void;

  // Assignments / Deadlines state
  assignments: Assignment[];
  assignmentFilter: 'all' | AssignmentStatus;
  setAssignmentFilter: (filter: 'all' | AssignmentStatus) => void;
  selectedCourseFilter: string;
  setSelectedCourseFilter: (code: string) => void;
  toggleAssignmentStatus: (id: string) => void;
  addPersonalNote: (id: string, note: string) => void;

  // Live Grades, Attendance, Courses, Teachers, Students, Bookings
  courses: CourseRecord[];
  teachersList: AuthUser[];
  studentsList: AuthUser[];
  grades: GradeRecord[];
  attendance: AttendanceRecord[];
  roomBookings: RoomBooking[];
  createSubject: (payload: {
    title: string;
    code: string;
    credits: number;
    teacher_id: string;
  }) => Promise<CourseRecord>;
  updateSubject: (
    id: string,
    payload: {
      title?: string;
      code?: string;
      credits?: number;
      teacher_id?: string;
    }
  ) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  createTeacherAccount: (payload: {
    full_name: string;
    email: string;
    department?: string;
  }) => Promise<AuthUser>;
  submitTeacherGrade: (payload: {
    id?: string;
    student_id: string;
    course_id: string;
    category: string;
    score: number;
    feedback: string;
  }) => Promise<void>;
  submitTeacherAttendance: (payload: {
    course_id: string;
    date: string;
    records: { student_id: string; status: AttendanceStatusType }[];
  }) => Promise<void>;
  publishTeacherTask: (payload: {
    course_id?: string;
    course_code?: string;
    group_name: string;
    title: string;
    description?: string;
    due_date: string;
    category?: AssessmentCategory;
    weight?: string;
  }) => Promise<void>;
  updateTeacherTask: (
    id: string,
    payload: {
      title?: string;
      description?: string;
      due_date?: string;
      category?: AssessmentCategory;
      weight?: string;
      group_name?: string;
      course_id?: string;
      course_code?: string;
    }
  ) => Promise<void>;
  createRoomBooking: (payload: {
    roomNumber: string;
    buildingName: string;
    date: string;
    timeSlot: string;
    purpose: string;
  }) => Promise<void>;
  updateRoomBookingStatus: (id: string, status: 'confirmed' | 'pending' | 'rejected') => Promise<void>;

  // Offline status
  isOfflineMode: boolean;
  setIsOfflineMode: (offline: boolean) => void;

  // Live Announcements, Student Life Events, LMS Middleware & AI Advisor
  announcements: Announcement[];
  markAnnouncementRead: (id: string, unread?: boolean) => Promise<void>;
  markAllAnnouncementsRead: () => Promise<void>;
  createCustomAnnouncement: (payload: {
    title: string;
    description: string;
    courseCode?: string;
    room?: string;
    type?: Announcement['type'];
  }) => Promise<void>;
  studentLifeEvents: StudentLifeEvent[];
  toggleEventRegistration: (id: string) => Promise<void>;
  createStudentLifeEvent: (payload: {
    title: string;
    organizer: string;
    category: StudentLifeEvent['category'];
    date: string;
    location: string;
    room?: string;
    prizeOrPerks?: string;
    isSponsored?: boolean;
    description: string;
  }) => Promise<void>;
  lmsIntegrations: LmsIntegrationItem[];
  syncLmsProvider: (provider?: string) => Promise<void>;
  aiQuota: AIQuotaInfo;
  askAI: (prompt: string) => Promise<{
    reply: string;
    recommendedRoom: string | null;
    recommendedTab: string | null;
    provider: string;
  }>;

  // Student info (dynamically enriched with live user & GPA)
  student: typeof CURRENT_STUDENT & { groupName?: string; role?: UserRole; department?: string };
  unreadAnnouncementsCount: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_COURSE_IDS = ['crs-phys101', 'crs-math101', 'crs-cs101'];

const DEFAULT_DEMO_STUDENT: AuthUser = {
  id: 'usr-student-1',
  email: 'student@unicampus.kz',
  full_name: 'Arystan Seitkaliyev',
  role: 'student',
  group_name: 'CS-2401',
  enrolled_course_ids: DEFAULT_COURSE_IDS,
  gpa: 3.90,
};

const DEFAULT_DEMO_TEACHER: AuthUser = {
  id: 'usr-teacher-1',
  email: 'teacher@unicampus.kz',
  full_name: 'Dr. Yersultan M.',
  role: 'teacher',
  department: 'Department of Physics & Mathematics',
  enrolled_course_ids: ['crs-phys101', 'crs-math101'],
};

const DEFAULT_DEMO_ADMIN: AuthUser = {
  id: 'usr-admin-1',
  email: 'admin@unicampus.kz',
  full_name: 'Aidar K. (System Admin)',
  role: 'admin',
  department: 'University Academic Affairs & IT Administration',
};

const OFFLINE_ACCOUNT_DIRECTORY: AuthUser[] = [
  DEFAULT_DEMO_ADMIN,
  DEFAULT_DEMO_TEACHER,
  {
    id: 'usr-teacher-3',
    email: 'aigerim@unicampus.kz',
    full_name: 'Dr. Aigerim S.',
    role: 'teacher',
    department: 'School of Computer Science',
    enrolled_course_ids: ['crs-cs101'],
  },
  {
    id: 'usr-teacher-4',
    email: 'serik@unicampus.kz',
    full_name: 'Prof. Serik B.',
    role: 'teacher',
    department: 'Department of Humanities & History',
    enrolled_course_ids: ['crs-hist102'],
  },
  {
    id: 'usr-teacher-5',
    email: 'elena@unicampus.kz',
    full_name: 'Dr. Elena K.',
    role: 'teacher',
    department: 'Center for Academic Languages',
    enrolled_course_ids: ['crs-eng103'],
  },
  DEFAULT_DEMO_STUDENT,
  {
    id: 'usr-student-2',
    email: 'alisher@unicampus.kz',
    full_name: 'Alisher Nurlanov',
    role: 'student',
    group_name: 'SE-2402',
    enrolled_course_ids: ['crs-math101', 'crs-cs101', 'crs-hist102'],
    gpa: 2.95,
  },
  {
    id: 'usr-student-3',
    email: 'dana@unicampus.kz',
    full_name: 'Dana Suleimenova',
    role: 'student',
    group_name: 'IT-2403',
    enrolled_course_ids: ['crs-phys101', 'crs-hist102', 'crs-eng103'],
    gpa: 1.69,
  },
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const cachedSnapshot = useMemo(() => OfflineStorage.loadSnapshot(), []);

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    return (['dashboard', 'schedule', 'grades', 'assignments', 'map'] as TabType[]).includes(tab as TabType)
      ? (tab as TabType)
      : 'dashboard';
  });

  const [teacherActiveTab, setTeacherActiveTab] = useState<TeacherTabType>('gradebook');
  const [adminActiveTab, setAdminActiveTab] = useState<AdminTabType>('courses');

  const [selectedRoomForNav, setSelectedRoomForNav] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get('room')
  );
  const [roomNavTimestamp, setRoomNavTimestamp] = useState<number>(0);
  const [viewMode, setViewMode] = useState<ViewLayoutMode>(
    () => (new URLSearchParams(window.location.search).get('view') as ViewLayoutMode) || 'phone'
  );

  // Auth & Role
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const urlRole = new URLSearchParams(window.location.search).get('role');
    if (urlRole === 'admin') return DEFAULT_DEMO_ADMIN;
    if (urlRole === 'teacher') return DEFAULT_DEMO_TEACHER;
    if (urlRole === 'student') return DEFAULT_DEMO_STUDENT;
    return getStoredUser() || DEFAULT_DEMO_STUDENT;
  });

  const userRole: UserRole = currentUser?.role || 'student';

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(
    () => new URLSearchParams(window.location.search).get('profile') === '1'
  );
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [preselectedBookingRoom, setPreselectedBookingRoom] = useState<{
    roomNumber: string;
    buildingName?: string;
  } | null>(null);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [isAddScheduleOpen, setIsAddScheduleOpen] = useState(false);

  // Sync & Cold-Start states
  const [isSyncing, setIsSyncing] = useState(false);
  const [isColdStarting, setIsColdStarting] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(cachedSnapshot.lastSyncedAt);

  // Offline Mode state (automatically turns on if browser is offline or user toggles it)
  const [isOfflineMode, setIsOfflineModeState] = useState<boolean>(() => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
    return OfflineStorage.isOfflineModeEnabled();
  });

  const setIsOfflineMode = useCallback((offline: boolean) => {
    setIsOfflineModeState(offline);
    OfflineStorage.setOfflineModeEnabled(offline);
  }, []);

  // Data states initialized from offline cache / localStorage
  const [courses, setCourses] = useState<CourseRecord[]>(cachedSnapshot.courses || DEFAULT_OFFLINE_COURSES);
  const [teachersList, setTeachersList] = useState<AuthUser[]>(() =>
    OFFLINE_ACCOUNT_DIRECTORY.filter((u) => u.role === 'teacher')
  );
  const [studentsList, setStudentsList] = useState<AuthUser[]>(() =>
    OFFLINE_ACCOUNT_DIRECTORY.filter((u) => u.role === 'student')
  );
  const [selectedWeekOffset, setSelectedWeekOffset] = useState<number>(0);
  const [grades, setGrades] = useState<GradeRecord[]>(cachedSnapshot.grades || DEFAULT_OFFLINE_GRADES);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(
    cachedSnapshot.attendance || DEFAULT_OFFLINE_ATTENDANCE
  );
  const [roomBookings, setRoomBookings] = useState<RoomBooking[]>(cachedSnapshot.bookings || []);
  const [announcements, setAnnouncements] = useState<Announcement[]>(
    cachedSnapshot.announcements?.length ? cachedSnapshot.announcements : RECENT_ANNOUNCEMENTS
  );
  const [studentLifeEvents, setStudentLifeEvents] = useState<StudentLifeEvent[]>(
    cachedSnapshot.studentLifeEvents?.length ? cachedSnapshot.studentLifeEvents : DEFAULT_STUDENT_LIFE_EVENTS
  );
  const [lmsIntegrations, setLmsIntegrations] = useState<LmsIntegrationItem[]>(DEFAULT_LMS_INTEGRATIONS);
  const [aiQuota, setAiQuota] = useState<AIQuotaInfo>({
    usedTokens: 1420,
    monthlyQuota: 10000,
    queriesCount: 14,
    tier: 'B2B Institutional Metered Tier',
  });

  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SCHEDULE);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return cachedSnapshot.schedule?.length ? cachedSnapshot.schedule : WEEKLY_SCHEDULE;
  });

  const [assignments, setAssignments] = useState<Assignment[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ASSIGNMENTS);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return cachedSnapshot.assignments?.length ? cachedSnapshot.assignments : ASSIGNMENTS_LIST;
  });

  // Listen to Render Cold-Start events
  useEffect(() => {
    return onColdStartStatusChange((active) => {
      setIsColdStarting(active);
    });
  }, []);

  // Listen to browser online/offline network transitions
  useEffect(() => {
    const handleOnline = () => {
      if (!OfflineStorage.isOfflineModeEnabled()) {
        setIsOfflineModeState(false);
      }
    };
    const handleOffline = () => {
      setIsOfflineModeState(true);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Persist schedule & assignments to localStorage + OfflineStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SCHEDULE, JSON.stringify(scheduleItems));
    } catch {
      // ignore
    }
  }, [scheduleItems]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ASSIGNMENTS, JSON.stringify(assignments));
    } catch {
      // ignore
    }
  }, [assignments]);

  const saveAllForOffline = useCallback(() => {
    const dynamicGpa = computeDynamicGpa(grades, courses);
    const snap = OfflineStorage.saveSnapshot({
      schedule: scheduleItems,
      grades,
      gpa: dynamicGpa,
      attendance,
      assignments,
      courses,
      bookings: roomBookings,
      announcements,
      studentLifeEvents,
    });
    setLastSyncedAt(snap.lastSyncedAt);
    setIsOfflineMode(true);
  }, [
    scheduleItems,
    grades,
    courses,
    attendance,
    assignments,
    roomBookings,
    announcements,
    studentLifeEvents,
    setIsOfflineMode,
  ]);

  const refreshFromBackend = useCallback(async () => {
    if (isOfflineMode) return;
    setIsSyncing(true);
    try {
      const data = await ApiService.fetchBootstrap();
      setBackendConnected(true);

      if (data.courses.length > 0) setCourses(data.courses);
      if (data.teachers && data.teachers.length > 0) setTeachersList(data.teachers);
      if (data.students && data.students.length > 0) setStudentsList(data.students);
      if (data.grades.length > 0) setGrades(data.grades);
      if (data.attendance.length > 0) setAttendance(data.attendance);
      if (data.bookings.length > 0) setRoomBookings(data.bookings);
      if (data.announcements && data.announcements.length > 0) setAnnouncements(data.announcements);
      if (data.studentLifeEvents && data.studentLifeEvents.length > 0) {
        setStudentLifeEvents(data.studentLifeEvents);
      }
      if (data.lmsIntegrations && data.lmsIntegrations.length > 0) {
        setLmsIntegrations(data.lmsIntegrations);
      }
      if (data.aiQuota) {
        setAiQuota(data.aiQuota);
      }

      if (data.schedule.length > 0) {
        setScheduleItems((prev) => {
          const customItems = prev.filter((item) => item.id.startsWith('sched-custom-'));
          const serverIds = new Set(data.schedule.map((s) => s.id));
          const mergedCustom = customItems.filter((c) => !serverIds.has(c.id));
          return [...data.schedule, ...mergedCustom];
        });
      }

      if (data.assignments.length > 0) {
        setAssignments((prev) => {
          const prevMap = new Map(prev.map((p) => [p.id, p]));
          const mergedServer = data.assignments.map((srv) => {
            const existing = prevMap.get(srv.id);
            return existing
              ? {
                  ...srv,
                  status: existing.status,
                  hasPersonalNote: existing.hasPersonalNote || srv.hasPersonalNote,
                  personalNote: existing.personalNote || srv.personalNote,
                }
              : srv;
          });
          const serverIds = new Set(data.assignments.map((a) => a.id));
          const customItems = prev.filter((p) => p.id.startsWith('asg-custom-') && !serverIds.has(p.id));
          return [...customItems, ...mergedServer];
        });
      }

      if (data.user && getStoredToken()) {
        setCurrentUser(data.user);
      }

      const snap = OfflineStorage.saveSnapshot({
        schedule: data.schedule.length > 0 ? data.schedule : undefined,
        grades: data.grades.length > 0 ? data.grades : undefined,
        gpa: data.gpa,
        attendance: data.attendance.length > 0 ? data.attendance : undefined,
        assignments: data.assignments.length > 0 ? data.assignments : undefined,
        courses: data.courses.length > 0 ? data.courses : undefined,
        bookings: data.bookings,
        announcements: data.announcements?.length ? data.announcements : undefined,
        studentLifeEvents: data.studentLifeEvents?.length ? data.studentLifeEvents : undefined,
      });
      setLastSyncedAt(snap.lastSyncedAt);
    } catch {
      // Backend unreachable -> gracefully use cached OfflineStorage data
      setBackendConnected(false);
    } finally {
      setIsSyncing(false);
    }
  }, [isOfflineMode]);

  useEffect(() => {
    refreshFromBackend();
  }, [refreshFromBackend]);

  // Auth Actions
  const loginWithCredentials = async (email: string, password: string): Promise<AuthUser> => {
    try {
      const { user } = await ApiService.login(email, password);
      setCurrentUser(user);
      setBackendConnected(true);
      await refreshFromBackend();
      return user;
    } catch (err) {
      // Offline / local fallback against the institutional account directory
      const lower = email.trim().toLowerCase();
      const directoryMatch = OFFLINE_ACCOUNT_DIRECTORY.find((u) => u.email.toLowerCase() === lower);
      if (directoryMatch) {
        const expectedPass =
          directoryMatch.role === 'admin'
            ? 'admin123'
            : directoryMatch.role === 'teacher'
              ? 'teacher123'
              : 'student123';
        if (password === expectedPass || password === 'password123') {
          setStoredAuth(`offline-token-${directoryMatch.id}`, directoryMatch);
          setCurrentUser(directoryMatch);
          return directoryMatch;
        }
      }
      throw err;
    }
  };

  const registerAccount = async (payload: {
    email: string;
    password: string;
    full_name: string;
    role: UserRole;
    group_name?: string;
    department?: string;
    enrolled_course_ids?: string[];
    course_code?: string;
    course_title?: string;
  }): Promise<AuthUser> => {
    try {
      const { user } = await ApiService.register(payload);
      setCurrentUser(user);
      setBackendConnected(true);
      await refreshFromBackend();
      return user;
    } catch {
      // Offline fallback registration
      const enrolledIds =
        payload.role === 'student'
          ? payload.enrolled_course_ids?.length
            ? payload.enrolled_course_ids
            : courses.map((c) => c.id)
          : [];
      const fallbackUser: AuthUser = {
        id: `usr-${payload.role}-${Date.now()}`,
        email: payload.email.trim().toLowerCase(),
        full_name: payload.full_name.trim(),
        role: payload.role,
        group_name: payload.role === 'student' ? payload.group_name || 'CS-2401' : null,
        department: payload.role !== 'student' ? payload.department || 'Computer Science' : null,
        enrolled_course_ids: enrolledIds,
        gpa: payload.role === 'student' ? 3.33 : undefined,
      };
      setStoredAuth(`offline-token-${Date.now()}`, fallbackUser);
      setCurrentUser(fallbackUser);
      if (payload.role === 'student') {
        setStudentsList((prev) => [...prev, fallbackUser]);
      } else if (payload.role === 'teacher') {
        setTeachersList((prev) => [...prev, fallbackUser]);
        if (payload.course_code && payload.course_title) {
          const newCourse: CourseRecord = {
            id: `crs-${payload.course_code.toLowerCase()}-${Date.now().toString().slice(-4)}`,
            code: payload.course_code.trim().toUpperCase(),
            title: payload.course_title.trim(),
            credits: 5,
            teacher_id: fallbackUser.id,
            teacher_name: fallbackUser.full_name,
          };
          setCourses((prev) => [...prev, newCourse]);
        }
      }
      return fallbackUser;
    }
  };

  const logout = () => {
    setStoredAuth(null, null);
    setCurrentUser(DEFAULT_DEMO_STUDENT);
    setIsAuthModalOpen(true);
  };

  const [assignmentFilter, setAssignmentFilter] = useState<'all' | AssignmentStatus>('all');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');

  const unreadAnnouncementsCount = useMemo(
    () => announcements.filter((a) => a.unread).length,
    [announcements]
  );

  const pushLocalAnnouncement = useCallback(
    (payload: {
      title: string;
      description: string;
      courseCode?: string;
      room?: string;
      type?: Announcement['type'];
    }) => {
      const nextItem: Announcement = {
        id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        title: payload.title,
        description: payload.description,
        courseCode: payload.courseCode,
        room: payload.room,
        timestamp: 'Just now',
        createdAt: new Date().toISOString(),
        unread: true,
        type: payload.type || 'admin',
      };
      setAnnouncements((prev) => {
        const next = [nextItem, ...prev];
        OfflineStorage.saveSnapshot({ announcements: next });
        return next;
      });
    },
    []
  );

  const openRoomBookingFor = useCallback((roomNumber: string, buildingName?: string) => {
    setPreselectedBookingRoom({ roomNumber, buildingName });
    setIsBookingOpen(true);
  }, []);

  const navigateToClassroom = (room: string) => {
    setSelectedRoomForNav(room);
    setRoomNavTimestamp(Date.now());
    if (userRole === 'admin') {
      setAdminActiveTab('map');
    } else if (userRole === 'teacher') {
      setTeacherActiveTab('map');
    } else {
      setActiveTab('map');
    }
  };

  const clearRoomNavigation = () => {
    setSelectedRoomForNav(null);
  };

  const addHomeworkForCourse = (
    courseName: string,
    courseCode: string,
    title: string,
    dueDate = 'Tomorrow',
    daysLeft = 1
  ) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const newAssignment: Assignment = {
      id: `asg-custom-${Date.now()}`,
      title: trimmedTitle,
      category: 'assignment',
      courseCode: courseCode.trim() || courseName.trim().toUpperCase().slice(0, 6),
      courseName: courseName.trim(),
      groupName: currentUser?.group_name || 'CS-2401',
      dueDate: dueDate.startsWith('Due ') ? dueDate : `Due ${dueDate}`,
      dueFormatted: `${dueDate}, 23:59`,
      daysLeft,
      status: 'todo',
      weight: '10%',
      hasPersonalNote: false,
    };

    setAssignments((prev) => [newAssignment, ...prev]);

    if (!isOfflineMode) {
      ApiService.createAssignment({
        course_code: newAssignment.courseCode,
        group_name: newAssignment.groupName || 'CS-2401',
        title: newAssignment.title,
        due_date: newAssignment.dueFormatted,
        category: 'assignment',
        weight: '10%',
      }).catch(() => {});
    }
  };

  const addScheduleItem = (
    item: Omit<ScheduleItem, 'id'>,
    homework?: { title: string; dueDate?: string; daysLeft?: number }
  ): ScheduleItem => {
    const created: ScheduleItem = {
      ...item,
      id: `sched-custom-${Date.now()}`,
    };

    setScheduleItems((prev) => [...prev, created]);

    pushLocalAnnouncement({
      title: `Schedule Added: ${created.courseCode || created.courseName}`,
      courseCode: created.courseCode,
      room: created.room,
      description: `${created.day} ${created.startTime}–${created.endTime} in Room ${created.room}.`,
      type: 'schedule_change',
    });

    if (!isOfflineMode) {
      ApiService.createScheduleItem(item)
        .then(() => ApiService.getAnnouncements().then(setAnnouncements).catch(() => {}))
        .catch(() => {});
    }

    if (homework && homework.title.trim()) {
      addHomeworkForCourse(
        created.courseName,
        created.courseCode,
        homework.title,
        homework.dueDate || formatShortMonthDay(2),
        homework.daysLeft ?? 2
      );
    }

    return created;
  };

  const importTeacherSchedule = async (
    items: Array<Omit<ScheduleItem, 'id'>>,
    replaceWeekStart?: string
  ): Promise<void> => {
    const localItems: ScheduleItem[] = items.map((item, idx) => {
      const matchedCourse = courses.find(
        (c) =>
          (item.courseId && c.id === item.courseId) ||
          c.code.toUpperCase() === String(item.courseCode || '').toUpperCase()
      );
      return {
        ...item,
        id: `sched-imp-${Date.now()}-${idx}`,
        courseId: item.courseId || matchedCourse?.id,
        professor: item.professor || matchedCourse?.teacher_name || 'Dr. Yersultan M.',
        weekStart: item.weekStart || replaceWeekStart || 'recurring',
      };
    });

    setScheduleItems((prev) => {
      const filtered =
        replaceWeekStart && replaceWeekStart !== 'recurring'
          ? prev.filter((s) => s.weekStart !== replaceWeekStart)
          : prev;
      const next = [...filtered, ...localItems];
      OfflineStorage.saveSnapshot({ schedule: next });
      return next;
    });

    pushLocalAnnouncement({
      title: `Schedule Imported (${localItems.length} classes)`,
      courseCode: localItems[0]?.courseCode,
      room: localItems[0]?.room,
      description: `${localItems.length} timetable classes synced${
        replaceWeekStart && replaceWeekStart !== 'recurring' ? ` for week ${replaceWeekStart}` : ''
      }.`,
      type: 'schedule_change',
    });

    if (!isOfflineMode) {
      try {
        const saved = await ApiService.importScheduleItems(items, replaceWeekStart);
        if (saved.length > 0) {
          setScheduleItems((prev) => {
            const nonTemp = prev.filter((p) => !p.id.startsWith('sched-imp-'));
            return [...nonTemp, ...saved];
          });
        }
        ApiService.getAnnouncements().then(setAnnouncements).catch(() => {});
      } catch {
        // Optimistic import retained
      }
    }
  };

  const updateScheduleClass = async (
    id: string,
    payload: Partial<Omit<ScheduleItem, 'id'>>
  ): Promise<void> => {
    setScheduleItems((prev) => {
      const next = prev.map((it) => (it.id === id ? { ...it, ...payload } : it));
      OfflineStorage.saveSnapshot({ schedule: next });
      return next;
    });

    if (payload.room || payload.startTime || payload.day) {
      const target = scheduleItems.find((s) => s.id === id);
      pushLocalAnnouncement({
        title: `Schedule Updated: ${payload.courseCode || target?.courseCode || target?.courseName || 'Class'}`,
        courseCode: payload.courseCode || target?.courseCode,
        room: payload.room || target?.room,
        description: `Moved to ${payload.day || target?.day || 'Scheduled day'} at ${payload.startTime || target?.startTime || 'class time'}, Room ${payload.room || target?.room || 'Campus'}.`,
        type: 'schedule_change',
      });
    }

    if (!isOfflineMode) {
      try {
        const updated = await ApiService.updateScheduleItem(id, payload);
        setScheduleItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
        ApiService.getAnnouncements().then(setAnnouncements).catch(() => {});
      } catch {
        // Optimistic update already saved
      }
    }
  };

  const removeScheduleItem = (id: string) => {
    setScheduleItems((prev) => prev.filter((item) => item.id !== id));
    if (!isOfflineMode && userRole !== 'student') {
      ApiService.deleteScheduleItem(id).catch(() => {});
    }
  };

  const clearAllSchedule = () => {
    setScheduleItems([]);
  };

  const resetDefaultSchedule = () => {
    setScheduleItems(WEEKLY_SCHEDULE);
  };

  const SAVED_SCHEDULE_BACKUP_KEY = 'unicampus_saved_schedule_backup_v1';

  const saveScheduleBackup = () => {
    try {
      localStorage.setItem(SAVED_SCHEDULE_BACKUP_KEY, JSON.stringify(scheduleItems));
    } catch {
      // ignore storage quota errors
    }
  };

  const restoreSavedSchedule = () => {
    try {
      const raw = localStorage.getItem(SAVED_SCHEDULE_BACKUP_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ScheduleItem[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setScheduleItems(parsed);
          return;
        }
      }
    } catch {
      // fallback to default weekly schedule
    }
    setScheduleItems(WEEKLY_SCHEDULE);
  };

  const removeAssignment = (id: string) => {
    setAssignments((prev) => prev.filter((item) => item.id !== id));
    if (!isOfflineMode) {
      ApiService.deleteAssignment(id).catch(() => {});
    }
  };

  const toggleAssignmentStatus = (id: string) => {
    let nextStatus: AssignmentStatus = 'submitted';
    setAssignments((prev) => {
      const next = prev.map((item) => {
        if (item.id === id) {
          nextStatus = item.status === 'todo' ? 'submitted' : 'todo';
          return { ...item, status: nextStatus };
        }
        return item;
      });
      OfflineStorage.saveSnapshot({ assignments: next });
      return next;
    });

    if (!isOfflineMode) {
      ApiService.updateAssignment(id, { status: nextStatus }).catch(() => {});
    }
  };

  const addPersonalNote = (id: string, note: string) => {
    setAssignments((prev) => {
      const next = prev.map((item) => {
        if (item.id === id) {
          return { ...item, hasPersonalNote: Boolean(note.trim()), personalNote: note };
        }
        return item;
      });
      OfflineStorage.saveSnapshot({ assignments: next });
      return next;
    });

    if (!isOfflineMode) {
      ApiService.updateAssignment(id, { personal_note: note }).catch(() => {});
    }
  };

  // Admin Actions: Create / Update / Delete Subject & Bind Teachers
  const createSubject = async (payload: {
    title: string;
    code: string;
    credits: number;
    teacher_id: string;
  }): Promise<CourseRecord> => {
    const teacherObj = teachersList.find((t) => t.id === payload.teacher_id);
    const optimistic: CourseRecord = {
      id: `crs-${Date.now()}`,
      title: payload.title.trim(),
      code: payload.code.trim().toUpperCase(),
      credits: Number(payload.credits) || 5,
      teacher_id: payload.teacher_id,
      teacher_name: teacherObj?.full_name || 'Dr. Yersultan M.',
    };

    setCourses((prev) => {
      const next = [...prev, optimistic];
      OfflineStorage.saveSnapshot({ courses: next });
      return next;
    });

    if (!isOfflineMode) {
      try {
        const created = await ApiService.createCourse(payload);
        setCourses((prev) => prev.map((c) => (c.id === optimistic.id ? created : c)));
        return created;
      } catch {
        // Optimistic update kept
      }
    }
    return optimistic;
  };

  const updateSubject = async (
    id: string,
    payload: {
      title?: string;
      code?: string;
      credits?: number;
      teacher_id?: string;
    }
  ): Promise<void> => {
    const teacherObj = payload.teacher_id
      ? teachersList.find((t) => t.id === payload.teacher_id)
      : undefined;

    setCourses((prev) => {
      const next = prev.map((c) => {
        if (c.id !== id) return c;
        return {
          ...c,
          title: payload.title !== undefined ? payload.title.trim() : c.title,
          code: payload.code !== undefined ? payload.code.trim().toUpperCase() : c.code,
          credits: payload.credits !== undefined ? Number(payload.credits) : c.credits,
          teacher_id: payload.teacher_id !== undefined ? payload.teacher_id : c.teacher_id,
          teacher_name: teacherObj ? teacherObj.full_name : c.teacher_name,
        };
      });
      OfflineStorage.saveSnapshot({ courses: next });
      return next;
    });

    // If a teacher was bound to this subject, also update matching schedule items professor name
    if (teacherObj) {
      const targetCourse = courses.find((c) => c.id === id);
      if (targetCourse) {
        setScheduleItems((prev) =>
          prev.map((item) =>
            item.courseCode.startsWith(targetCourse.code) || item.courseName === targetCourse.title
              ? { ...item, professor: teacherObj.full_name }
              : item
          )
        );
      }
    }

    if (!isOfflineMode) {
      try {
        const updated = await ApiService.updateCourse(id, payload);
        setCourses((prev) => prev.map((c) => (c.id === id ? updated : c)));
      } catch {
        // Optimistic update kept
      }
    }
  };

  const deleteSubject = async (id: string): Promise<void> => {
    setCourses((prev) => {
      const next = prev.filter((c) => c.id !== id);
      OfflineStorage.saveSnapshot({ courses: next });
      return next;
    });

    if (!isOfflineMode) {
      try {
        await ApiService.deleteCourse(id);
      } catch {
        // Optimistic removal kept
      }
    }
  };

  const createTeacherAccount = async (payload: {
    full_name: string;
    email: string;
    department?: string;
  }): Promise<AuthUser> => {
    const newTeacher: AuthUser = {
      id: `usr-teacher-${Date.now()}`,
      email: payload.email.trim().toLowerCase(),
      full_name: payload.full_name.trim(),
      role: 'teacher',
      department: payload.department?.trim() || 'Department of Computer Science',
    };

    setTeachersList((prev) => [...prev, newTeacher]);

    if (!isOfflineMode) {
      try {
        // Register teacher on backend without overwriting current Admin session
        const prevToken = getStoredToken();
        const prevUser = getStoredUser();
        const res = await ApiService.register({
          email: newTeacher.email,
          password: 'teacher123',
          full_name: newTeacher.full_name,
          role: 'teacher',
          department: newTeacher.department || 'Computer Science',
        });
        if (prevToken && prevUser) {
          setStoredAuth(prevToken, prevUser);
        }
        setTeachersList((prev) => prev.map((t) => (t.id === newTeacher.id ? res.user : t)));
        return res.user;
      } catch {
        // Keep local teacher
      }
    }

    return newTeacher;
  };

  // Teacher Actions (with immediate local state update + PostgreSQL backend sync)
  const submitTeacherGrade = async (payload: {
    id?: string;
    student_id: string;
    course_id: string;
    category: string;
    score: number;
    feedback: string;
  }) => {
    const courseObj = courses.find((c) => c.id === payload.course_id || c.code === payload.course_id);
    const studentObj = studentsList.find((s) => s.id === payload.student_id);
    const optimistic: GradeRecord = {
      id: payload.id || `grd-${Date.now()}`,
      student_id: payload.student_id,
      course_id: courseObj?.id || payload.course_id,
      teacher_id: currentUser?.id || 'usr-teacher-1',
      category: payload.category,
      score: Math.max(0, Math.min(100, Number(payload.score))),
      feedback: payload.feedback,
      updated_at: new Date().toISOString(),
      course_code: courseObj?.code || 'PHYS101',
      course_title: courseObj?.title || 'Physics & Laboratory',
      course_credits: courseObj?.credits || 5,
      student_name: studentObj?.full_name || 'Arystan Seitkaliyev',
      student_group: studentObj?.group_name || 'CS-2401',
      teacher_name: currentUser?.full_name || 'Dr. Yersultan M.',
    };

    setGrades((prev) => {
      const idx = prev.findIndex(
        (g) =>
          (payload.id && g.id === payload.id) ||
          (g.student_id === payload.student_id &&
            g.course_id === optimistic.course_id &&
            g.category === payload.category)
      );
      let next: GradeRecord[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = { ...next[idx], ...optimistic };
      } else {
        next = [optimistic, ...prev];
      }
      OfflineStorage.saveSnapshot({ grades: next });
      return next;
    });

    pushLocalAnnouncement({
      title: `Grade Posted: ${optimistic.course_code} ${optimistic.category}`,
      courseCode: optimistic.course_code,
      description: `Score ${optimistic.score}/100 recorded${optimistic.feedback ? ` — "${optimistic.feedback}"` : ''}. GPA recalculated.`,
      type: optimistic.score >= 85 ? 'scholarship' : 'admin',
    });

    if (!isOfflineMode) {
      try {
        const saved = await ApiService.saveGrade({
          ...payload,
          course_id: optimistic.course_id,
        });
        if (saved) {
          setGrades((prev) =>
            prev.map((g) =>
              g.student_id === saved.student_id &&
              g.course_id === saved.course_id &&
              g.category === saved.category
                ? saved
                : g
            )
          );
        }
        ApiService.getAnnouncements().then(setAnnouncements).catch(() => {});
      } catch {
        // Optimistic update already saved locally
      }
    }
  };

  const submitTeacherAttendance = async (payload: {
    course_id: string;
    date: string;
    records: { student_id: string; status: AttendanceStatusType }[];
  }) => {
    const courseObj = courses.find((c) => c.id === payload.course_id || c.code === payload.course_id);
    const resolvedCourseId = courseObj?.id || payload.course_id;

    setAttendance((prev) => {
      const next = [...prev];
      for (const rec of payload.records) {
        const st = studentsList.find((s) => s.id === rec.student_id);
        const existingIdx = next.findIndex(
          (a) =>
            a.student_id === rec.student_id &&
            a.course_id === resolvedCourseId &&
            a.date === payload.date
        );
        const item: AttendanceRecord = {
          id: existingIdx >= 0 ? next[existingIdx].id : `att-${Date.now()}-${rec.student_id}`,
          student_id: rec.student_id,
          course_id: resolvedCourseId,
          date: payload.date,
          status: rec.status,
          course_code: courseObj?.code || 'PHYS101',
          course_title: courseObj?.title || 'Course',
          student_name: st?.full_name || 'Student',
          student_group: st?.group_name || 'CS-2401',
        };
        if (existingIdx >= 0) {
          next[existingIdx] = item;
        } else {
          next.unshift(item);
        }
      }
      OfflineStorage.saveSnapshot({ attendance: next });
      return next;
    });

    if (!isOfflineMode) {
      try {
        await ApiService.saveAttendance({
          course_id: resolvedCourseId,
          date: payload.date,
          records: payload.records,
        });
      } catch {
        // Saved locally
      }
    }
  };

  const publishTeacherTask = async (payload: {
    course_id?: string;
    course_code?: string;
    group_name: string;
    title: string;
    description?: string;
    due_date: string;
    category?: AssessmentCategory;
    weight?: string;
  }) => {
    const courseObj = courses.find(
      (c) => c.id === payload.course_id || c.code === payload.course_code
    );
    const shortDue = payload.due_date.split(',')[0].replace(/^Due\s+/i, '');
    const optimistic: Assignment = {
      id: `asg-${Date.now()}`,
      title: payload.title.trim(),
      description: payload.description || '',
      category: payload.category || 'assignment',
      courseCode: courseObj?.code || payload.course_code || 'PHYS101',
      courseName: courseObj?.title || 'Physics & Laboratory',
      groupName: payload.group_name || 'CS-2401',
      dueDate: `Due ${shortDue}`,
      dueFormatted: payload.due_date,
      daysLeft: 3,
      status: 'todo',
      weight: payload.weight || '15%',
      hasPersonalNote: Boolean(payload.description),
      personalNote: payload.description,
    };

    setAssignments((prev) => {
      const next = [optimistic, ...prev];
      OfflineStorage.saveSnapshot({ assignments: next });
      return next;
    });

    pushLocalAnnouncement({
      title: `New Deadline: ${optimistic.title}`,
      courseCode: optimistic.courseCode,
      description: `${optimistic.category} (${optimistic.weight}) due ${optimistic.dueFormatted} for ${optimistic.groupName}.`,
      type: 'deadline',
    });

    if (!isOfflineMode) {
      try {
        const created = await ApiService.createAssignment({
          course_id: courseObj?.id,
          course_code: optimistic.courseCode,
          group_name: optimistic.groupName || 'CS-2401',
          title: optimistic.title,
          description: optimistic.description,
          due_date: optimistic.dueFormatted,
          category: optimistic.category,
          weight: optimistic.weight,
        });
        setAssignments((prev) =>
          prev.map((a) => (a.id === optimistic.id ? created : a))
        );
        ApiService.getAnnouncements().then(setAnnouncements).catch(() => {});
      } catch {
        // Already added optimistically
      }
    }
  };

  const updateTeacherTask = async (
    id: string,
    payload: {
      title?: string;
      description?: string;
      due_date?: string;
      category?: AssessmentCategory;
      weight?: string;
      group_name?: string;
      course_id?: string;
      course_code?: string;
    }
  ): Promise<void> => {
    const courseObj = courses.find(
      (c) => c.id === payload.course_id || c.code === payload.course_code
    );

    setAssignments((prev) => {
      const next = prev.map((a) => {
        if (a.id !== id) return a;
        const dueFormatted = payload.due_date !== undefined ? payload.due_date : a.dueFormatted;
        const shortDue = dueFormatted.split(',')[0].replace(/^Due\s+/i, '');
        return {
          ...a,
          title: payload.title !== undefined ? payload.title.trim() : a.title,
          description: payload.description !== undefined ? payload.description : a.description,
          dueFormatted,
          dueDate: `Due ${shortDue}`,
          category: payload.category !== undefined ? payload.category : a.category,
          weight: payload.weight !== undefined ? payload.weight : a.weight,
          groupName: payload.group_name !== undefined ? payload.group_name : a.groupName,
          courseId: courseObj?.id || payload.course_id || a.courseId,
          courseCode: courseObj?.code || payload.course_code || a.courseCode,
          courseName: courseObj?.title || a.courseName,
        };
      });
      OfflineStorage.saveSnapshot({ assignments: next });
      return next;
    });

    if (!isOfflineMode) {
      try {
        const updated = await ApiService.updateAssignment(id, {
          title: payload.title,
          description: payload.description,
          due_date: payload.due_date,
          category: payload.category,
          weight: payload.weight,
          group_name: payload.group_name,
          course_id: courseObj?.id || payload.course_id,
        });
        setAssignments((prev) => prev.map((a) => (a.id === id ? updated : a)));
      } catch {
        // Optimistic update kept
      }
    }
  };

  const createRoomBooking = async (payload: {
    roomNumber: string;
    buildingName: string;
    date: string;
    timeSlot: string;
    purpose: string;
  }) => {
    const optimistic: RoomBooking = {
      id: `bk-${Date.now()}`,
      userId: currentUser?.id || null,
      userName: currentUser?.full_name || CURRENT_STUDENT.fullName,
      userRole: userRole,
      roomNumber: payload.roomNumber,
      buildingName: payload.buildingName,
      date: payload.date,
      timeSlot: payload.timeSlot,
      purpose: payload.purpose,
      status: userRole === 'teacher' ? 'confirmed' : 'pending',
      createdAt: new Date().toISOString(),
    };

    setRoomBookings((prev) => {
      const next = [optimistic, ...prev];
      OfflineStorage.saveSnapshot({ bookings: next });
      return next;
    });

    if (!isOfflineMode) {
      try {
        const created = await ApiService.createBooking({
          room_number: payload.roomNumber,
          building_name: payload.buildingName,
          date: payload.date,
          time_slot: payload.timeSlot,
          purpose: payload.purpose,
          user_name: optimistic.userName,
          user_role: userRole,
        });
        setRoomBookings((prev) =>
          prev.map((b) => (b.id === optimistic.id ? created : b))
        );
      } catch {
        // Saved locally
      }
    }
  };

  const updateRoomBookingStatus = async (
    id: string,
    status: 'confirmed' | 'pending' | 'rejected'
  ) => {
    setRoomBookings((prev) => {
      const next = prev.map((b) => (b.id === id ? { ...b, status } : b));
      OfflineStorage.saveSnapshot({ bookings: next });
      return next;
    });

    if (!isOfflineMode) {
      try {
        await ApiService.updateBookingStatus(id, status);
      } catch {
        // Saved locally
      }
    }
  };

  // Announcements, Student Life Events, LMS Middleware Sync, AI Academic Advisor
  const markAnnouncementRead = async (id: string, unread = false) => {
    setAnnouncements((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, unread } : a));
      OfflineStorage.saveSnapshot({ announcements: next });
      return next;
    });
    if (!isOfflineMode) {
      ApiService.markAnnouncementRead(id, unread).catch(() => {});
    }
  };

  const markAllAnnouncementsRead = async () => {
    setAnnouncements((prev) => {
      const next = prev.map((a) => ({ ...a, unread: false }));
      OfflineStorage.saveSnapshot({ announcements: next });
      return next;
    });
    if (!isOfflineMode) {
      ApiService.markAllAnnouncementsRead().catch(() => {});
    }
  };

  const createCustomAnnouncement = async (payload: {
    title: string;
    description: string;
    courseCode?: string;
    room?: string;
    type?: Announcement['type'];
  }) => {
    pushLocalAnnouncement(payload);
    if (!isOfflineMode) {
      try {
        await ApiService.createAnnouncement({
          title: payload.title,
          description: payload.description,
          course_code: payload.courseCode,
          room: payload.room,
          type: payload.type,
        });
      } catch {
        // Saved optimistically
      }
    }
  };

  const toggleEventRegistration = async (id: string) => {
    setStudentLifeEvents((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, registered: !e.registered } : e));
      OfflineStorage.saveSnapshot({ studentLifeEvents: next });
      return next;
    });
    if (!isOfflineMode) {
      try {
        const updated = await ApiService.toggleStudentLifeRegistration(id);
        setStudentLifeEvents((prev) => prev.map((e) => (e.id === id ? updated : e)));
      } catch {
        // Optimistic toggle kept
      }
    }
  };

  const createStudentLifeEvent = async (payload: {
    title: string;
    organizer: string;
    category: StudentLifeEvent['category'];
    date: string;
    location: string;
    room?: string;
    prizeOrPerks?: string;
    isSponsored?: boolean;
    description: string;
  }) => {
    const optimistic: StudentLifeEvent = {
      id: `evt-${Date.now()}`,
      title: payload.title.trim(),
      organizer: payload.organizer.trim(),
      category: payload.category,
      date: payload.date,
      location: payload.location,
      room: payload.room || 'ATRIUM',
      prizeOrPerks: payload.prizeOrPerks,
      isSponsored: Boolean(payload.isSponsored),
      registered: false,
      description: payload.description,
    };
    setStudentLifeEvents((prev) => {
      const next = [optimistic, ...prev];
      OfflineStorage.saveSnapshot({ studentLifeEvents: next });
      return next;
    });
    pushLocalAnnouncement({
      title: `New Campus Event: ${optimistic.title}`,
      room: optimistic.room,
      description: `${optimistic.organizer} • ${optimistic.date} at ${optimistic.location}.`,
      type: 'admin',
    });
    if (!isOfflineMode) {
      try {
        const created = await ApiService.createStudentLifeEvent({
          title: optimistic.title,
          organizer: optimistic.organizer,
          category: optimistic.category,
          date: optimistic.date,
          location: optimistic.location,
          room: optimistic.room,
          prize_or_perks: optimistic.prizeOrPerks,
          is_sponsored: optimistic.isSponsored,
          description: optimistic.description,
        });
        setStudentLifeEvents((prev) => prev.map((e) => (e.id === optimistic.id ? created : e)));
      } catch {
        // Optimistic item kept
      }
    }
  };

  const syncLmsProvider = async (provider = 'all') => {
    setLmsIntegrations((prev) =>
      prev.map((item) =>
        provider === 'all' || item.id === provider ? { ...item, status: 'syncing' } : item
      )
    );
    if (!isOfflineMode) {
      try {
        const updated = await ApiService.syncIntegration(provider);
        setLmsIntegrations(updated);
        return;
      } catch {
        // Fall through to local snapshot sync timestamp
      }
    }
    const now = new Date().toISOString();
    setLmsIntegrations((prev) =>
      prev.map((item) =>
        provider === 'all' || item.id === provider
          ? {
              ...item,
              status: 'connected',
              lastSyncedAt: now,
              syncedCourses: courses.length,
              syncedGrades: grades.length,
              syncedStudents: studentsList.length,
            }
          : item
      )
    );
  };

  const askAI = async (
    prompt: string
  ): Promise<{
    reply: string;
    recommendedRoom: string | null;
    recommendedTab: string | null;
    provider: string;
  }> => {
    if (!isOfflineMode) {
      try {
        const result = await ApiService.askAIAdvisor({
          prompt,
          userId: currentUser?.id,
          groupName: currentUser?.group_name ?? undefined,
        });
        setAiQuota(result.quota);
        return {
          reply: result.reply,
          recommendedRoom: result.recommendedRoom,
          recommendedTab: result.recommendedTab,
          provider: result.provider,
        };
      } catch {
        // Fall back to on-device contextual AI computation
      }
    }

    const q = prompt.toLowerCase();
    const liveGpa = computeDynamicGpa(grades, courses);
    const standardThreshold = 2.33;
    const increasedThreshold = 3.66;
    const margin = Number((liveGpa - standardThreshold).toFixed(2));
    const todoTasks = assignments.filter((a) => a.status === 'todo');
    const nextClass = scheduleItems[0];
    const explicitRoom = prompt.match(/C1\.\d\.\d{3}/i)?.[0]?.toUpperCase();

    let reply = '';
    let recommendedRoom: string | null = null;
    let recommendedTab: string | null = 'dashboard';

    if (/where|room|map|floor|301|320|136|246|105|library|atrium/.test(q) && !/next|class/.test(q)) {
      const target =
        explicitRoom ||
        (q.includes('136') || q.includes('105')
          ? 'C1.2.136'
          : q.includes('246')
            ? 'C1.3.246'
            : q.includes('library')
              ? 'LIBRARY'
              : 'C1.1.320');
      reply = `Room ${target} is ready on your interactive AITU Campus Map. Tap "Open Map to ${target}" below to zoom directly onto the room and highlight it.`;
      recommendedRoom = target;
      recommendedTab = 'map';
    } else if (/next|schedule|class|lecture|today/.test(q)) {
      const room = nextClass?.room || 'C1.1.320';
      reply = nextClass
        ? `Your next class is ${nextClass.courseName} (${nextClass.courseCode}) on ${nextClass.day}, ${nextClass.startTime}–${nextClass.endTime} in Room ${room}.`
        : 'No classes are currently scheduled for today.';
      recommendedRoom = nextClass ? room : null;
      recommendedTab = 'map';
    } else if (/gpa|scholarship|grade|exam|final|score|calculate/.test(q)) {
      const lowestGrade = [...grades].sort((a, b) => Number(a.score) - Number(b.score))[0];
      const lowScore = lowestGrade ? Number(lowestGrade.score) : 85;
      const neededFinal = Math.max(50, Math.min(100, Math.ceil((90 - lowScore * 0.6) / 0.4)));
      const tierText =
        liveGpa >= increasedThreshold
          ? `Increased Scholarship (GPA >= ${increasedThreshold.toFixed(2)})`
          : liveGpa >= standardThreshold
            ? `Standard Scholarship Retained (+${margin.toFixed(2)} above ${standardThreshold.toFixed(2)}; ${increasedThreshold.toFixed(2)} for Increased)`
            : `At Risk (${Math.abs(margin).toFixed(2)} below ${standardThreshold.toFixed(2)} Standard Scholarship threshold)`;
      reply = `Live GPA: ${liveGpa.toFixed(2)} — ${tierText}. Lowest grade: ${lowestGrade?.course_code || 'PHYS101'} (${lowScore}%). Scoring ${neededFinal}%+ on the Final strengthens your scholarship standing.`;
      recommendedTab = 'grades';
    } else if (/due|deadline|assignment|task|todo/.test(q)) {
      const summary = todoTasks
        .slice(0, 3)
        .map((t, idx) => `${idx + 1}. ${t.title} (${t.courseCode}, ${t.weight}) — ${t.dueDate}`)
        .join('\n');
      reply =
        todoTasks.length > 0
          ? `You have ${todoTasks.length} pending deadline(s):\n${summary}`
          : 'You have 0 pending assignments right now.';
      recommendedTab = 'assignments';
    } else {
      const room = nextClass?.room || 'C1.1.320';
      reply = `UniCampus AI Summary:\n• Live GPA: ${liveGpa.toFixed(2)} (Standard >= 2.33, Increased >= 3.66)\n• Next Class: ${
        nextClass ? `${nextClass.courseCode} ${nextClass.day} ${nextClass.startTime} in ${room}` : 'None'
      }\n• Pending Tasks: ${todoTasks.length}`;
      recommendedRoom = nextClass ? room : null;
    }

    const estTokens = Math.max(85, Math.min(420, Math.round((prompt.length + reply.length) / 3) + 55));
    setAiQuota((prev) => ({
      ...prev,
      usedTokens: prev.usedTokens + estTokens,
      queriesCount: prev.queriesCount + 1,
    }));

    return {
      reply,
      recommendedRoom,
      recommendedTab,
      provider: isOfflineMode ? 'unicampus-offline-advisor' : 'unicampus-contextual-fallback',
    };
  };

  // Synchronize student schedule & assignments relationally with enrolled courses and assigned teachers
  const synchronizedScheduleItems = useMemo(() => {
    const enrolledIds =
      userRole === 'student' && currentUser?.enrolled_course_ids?.length
        ? new Set(currentUser.enrolled_course_ids)
        : null;

    return scheduleItems
      .map((item) => {
        const matchedCourse = courses.find(
          (c) =>
            (item.courseId && c.id === item.courseId) ||
            c.code.toUpperCase() === item.courseCode.toUpperCase()
        );
        return matchedCourse
          ? {
              ...item,
              courseId: item.courseId || matchedCourse.id,
              professor: matchedCourse.teacher_name || item.professor,
            }
          : item;
      })
      .filter((item) => {
        if (userRole === 'teacher' && currentUser?.id) {
          const matchedCourse = courses.find(
            (c) =>
              (item.courseId && c.id === item.courseId) ||
              c.code.toUpperCase() === item.courseCode.toUpperCase()
          );
          return matchedCourse ? matchedCourse.teacher_id === currentUser.id : false;
        }
        if (userRole !== 'student') return true;
        if (
          currentUser?.group_name &&
          item.groupName &&
          item.groupName !== 'ALL' &&
          item.groupName !== currentUser.group_name
        ) {
          return false;
        }
        if (enrolledIds) {
          const matchedCourse = courses.find(
            (c) =>
              (item.courseId && c.id === item.courseId) ||
              c.code.toUpperCase() === item.courseCode.toUpperCase()
          );
          if (matchedCourse && !enrolledIds.has(matchedCourse.id)) {
            return false;
          }
        }
        return true;
      });
  }, [scheduleItems, courses, userRole, currentUser]);

  const synchronizedAssignments = useMemo(() => {
    const enrolledIds =
      userRole === 'student' && currentUser?.enrolled_course_ids?.length
        ? new Set(currentUser.enrolled_course_ids)
        : null;

    return assignments.filter((a) => {
      if (userRole === 'teacher' && currentUser?.id) {
        const matchedCourse = courses.find(
          (c) =>
            (a.courseId && c.id === a.courseId) ||
            c.code.toUpperCase() === a.courseCode.toUpperCase()
        );
        return matchedCourse ? matchedCourse.teacher_id === currentUser.id : false;
      }
      if (userRole !== 'student') return true;
      if (
        currentUser?.group_name &&
        a.groupName &&
        a.groupName !== 'ALL' &&
        a.groupName !== currentUser.group_name
      ) {
        return false;
      }
      if (enrolledIds) {
        const matchedCourse = courses.find(
          (c) =>
            (a.courseId && c.id === a.courseId) ||
            c.code.toUpperCase() === a.courseCode.toUpperCase()
        );
        if (matchedCourse && !enrolledIds.has(matchedCourse.id)) {
          return false;
        }
      }
      return true;
    });
  }, [assignments, courses, userRole, currentUser]);

  // Compute dynamic student profile object so existing components get real-time GPA & user info
  const studentProfile = useMemo(() => {
    const activeStudentId =
      currentUser?.role === 'student' ? currentUser.id : 'usr-student-1';
    const studentGrades = grades.filter(
      (g) => g.student_id === activeStudentId || g.student_email === currentUser?.email
    );
    const liveGpa = computeDynamicGpa(
      studentGrades.length > 0 ? studentGrades : grades,
      courses
    );
    const fullName = currentUser?.full_name || CURRENT_STUDENT.fullName;
    const firstName = fullName.split(' ')[0] || CURRENT_STUDENT.name;

    const scholarshipStatus =
      liveGpa >= 3.66
        ? 'Increased Scholarship (GPA >= 3.66)'
        : liveGpa >= 2.33
          ? 'Standard Scholarship Retained (GPA >= 2.33)'
          : 'At Risk (Below 2.33 Scholarship Threshold)';

    return {
      ...CURRENT_STUDENT,
      name: firstName,
      fullName,
      email: currentUser?.email || CURRENT_STUDENT.email,
      gpa: liveGpa,
      groupName: currentUser?.group_name || 'CS-2401',
      department: currentUser?.department || undefined,
      role: userRole,
      scholarshipStatus,
    };
  }, [currentUser, grades, courses, userRole]);

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        teacherActiveTab,
        setTeacherActiveTab,
        adminActiveTab,
        setAdminActiveTab,
        selectedRoomForNav,
        roomNavTimestamp,
        navigateToClassroom,
        clearRoomNavigation,
        viewMode,
        setViewMode,
        currentUser,
        userRole,
        isAuthModalOpen,
        setIsAuthModalOpen,
        loginWithCredentials,
        registerAccount,
        logout,
        isSyncing,
        isColdStarting,
        backendConnected,
        lastSyncedAt,
        refreshFromBackend,
        saveAllForOffline,
        isProfileOpen,
        setIsProfileOpen,
        isNotificationsOpen,
        setIsNotificationsOpen,
        isAIAssistantOpen,
        setIsAIAssistantOpen,
        isBookingOpen,
        setIsBookingOpen,
        preselectedBookingRoom,
        setPreselectedBookingRoom,
        openRoomBookingFor,
        isQuickActionsOpen,
        setIsQuickActionsOpen,
        isAddScheduleOpen,
        setIsAddScheduleOpen,
        scheduleItems: synchronizedScheduleItems,
        selectedWeekOffset,
        setSelectedWeekOffset,
        addScheduleItem,
        importTeacherSchedule,
        updateScheduleClass,
        removeScheduleItem,
        clearAllSchedule,
        resetDefaultSchedule,
        saveScheduleBackup,
        restoreSavedSchedule,
        addHomeworkForCourse,
        removeAssignment,
        assignments: synchronizedAssignments,
        assignmentFilter,
        setAssignmentFilter,
        selectedCourseFilter,
        setSelectedCourseFilter,
        toggleAssignmentStatus,
        addPersonalNote,
        courses,
        teachersList,
        studentsList,
        grades,
        attendance,
        roomBookings,
        createSubject,
        updateSubject,
        deleteSubject,
        createTeacherAccount,
        submitTeacherGrade,
        submitTeacherAttendance,
        publishTeacherTask,
        updateTeacherTask,
        createRoomBooking,
        updateRoomBookingStatus,
        isOfflineMode,
        setIsOfflineMode,
        announcements,
        markAnnouncementRead,
        markAllAnnouncementsRead,
        createCustomAnnouncement,
        studentLifeEvents,
        toggleEventRegistration,
        createStudentLifeEvent,
        lmsIntegrations,
        syncLmsProvider,
        aiQuota,
        askAI,
        student: studentProfile,
        unreadAnnouncementsCount,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
