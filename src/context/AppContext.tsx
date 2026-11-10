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
} from '../types';
import { ASSIGNMENTS_LIST, CURRENT_STUDENT, RECENT_ANNOUNCEMENTS, WEEKLY_SCHEDULE } from '../data/mockData';
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
  }) => Promise<AuthUser>;
  switchDemoRole: (role: UserRole) => Promise<void>;
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
  isQuickActionsOpen: boolean;
  setIsQuickActionsOpen: (open: boolean) => void;
  isAddScheduleOpen: boolean;
  setIsAddScheduleOpen: (open: boolean) => void;

  // Schedule state & actions
  scheduleItems: ScheduleItem[];
  addScheduleItem: (
    item: Omit<ScheduleItem, 'id'>,
    homework?: { title: string; dueDate?: string; daysLeft?: number }
  ) => ScheduleItem;
  updateScheduleClass: (id: string, payload: Partial<Omit<ScheduleItem, 'id'>>) => Promise<void>;
  removeScheduleItem: (id: string) => void;
  clearAllSchedule: () => void;
  resetDefaultSchedule: () => void;
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

  // Student info (dynamically enriched with live user & GPA)
  student: typeof CURRENT_STUDENT & { groupName?: string; role?: UserRole; department?: string };
  unreadAnnouncementsCount: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_DEMO_STUDENT: AuthUser = {
  id: 'usr-student-1',
  email: 'student@unicampus.kz',
  full_name: 'Arystan Seitkaliyev',
  role: 'student',
  group_name: 'CS-2401',
  gpa: 3.78,
};

const DEFAULT_DEMO_TEACHER: AuthUser = {
  id: 'usr-teacher-1',
  email: 'teacher@unicampus.kz',
  full_name: 'Dr. Yersultan M.',
  role: 'teacher',
  department: 'Department of Physics & Intelligent Systems',
};

const DEFAULT_DEMO_ADMIN: AuthUser = {
  id: 'usr-admin-1',
  email: 'admin@unicampus.kz',
  full_name: 'Aidar K. (System Admin)',
  role: 'admin',
  department: 'Academic Affairs & Registry',
};

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
  const [teachersList, setTeachersList] = useState<AuthUser[]>([
    DEFAULT_DEMO_TEACHER,
    {
      id: 'usr-teacher-2',
      email: 'danial@unicampus.kz',
      full_name: 'Prof. Danial R.',
      role: 'teacher',
      department: 'Department of Computer Science & Mathematics',
    },
  ]);
  const [studentsList, setStudentsList] = useState<AuthUser[]>([
    DEFAULT_DEMO_STUDENT,
    { id: 'usr-student-2', email: 'alisher@unicampus.kz', full_name: 'Alisher Nurlanov', role: 'student', group_name: 'CS-2401', gpa: 3.25 },
    { id: 'usr-student-3', email: 'dana@unicampus.kz', full_name: 'Dana Suleimenova', role: 'student', group_name: 'CS-2401', gpa: 3.92 },
    { id: 'usr-student-4', email: 'madina@unicampus.kz', full_name: 'Madina Karimova', role: 'student', group_name: 'SE-2402', gpa: 3.67 },
    { id: 'usr-student-5', email: 'timur@unicampus.kz', full_name: 'Timur Bekzhanov', role: 'student', group_name: 'SE-2402', gpa: 2.85 },
  ]);
  const [grades, setGrades] = useState<GradeRecord[]>(cachedSnapshot.grades || DEFAULT_OFFLINE_GRADES);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(
    cachedSnapshot.attendance || DEFAULT_OFFLINE_ATTENDANCE
  );
  const [roomBookings, setRoomBookings] = useState<RoomBooking[]>(cachedSnapshot.bookings || []);

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
    });
    setLastSyncedAt(snap.lastSyncedAt);
    setIsOfflineMode(true);
  }, [scheduleItems, grades, courses, attendance, assignments, roomBookings, setIsOfflineMode]);

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
      // Offline / Demo fallback if local backend isn't running yet
      const lower = email.trim().toLowerCase();
      if (lower.includes('admin') && (password === 'admin123' || password === 'password123')) {
        const demoAdmin: AuthUser = {
          ...DEFAULT_DEMO_ADMIN,
          email: lower,
        };
        setStoredAuth('offline-demo-token-admin', demoAdmin);
        setCurrentUser(demoAdmin);
        return demoAdmin;
      }
      if (
        (lower.includes('teacher') || lower.includes('yersultan') || lower.includes('danial')) &&
        (password === 'teacher123' || password === 'password123')
      ) {
        const demoTeacher: AuthUser = {
          ...DEFAULT_DEMO_TEACHER,
          email: lower,
          full_name: lower.includes('danial') ? 'Prof. Danial R.' : 'Dr. Yersultan M.',
        };
        setStoredAuth('offline-demo-token-teacher', demoTeacher);
        setCurrentUser(demoTeacher);
        return demoTeacher;
      }
      if (password === 'student123' || password === 'password123') {
        const demoStudent: AuthUser = {
          ...DEFAULT_DEMO_STUDENT,
          email: lower,
        };
        setStoredAuth('offline-demo-token-student', demoStudent);
        setCurrentUser(demoStudent);
        return demoStudent;
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
  }): Promise<AuthUser> => {
    try {
      const { user } = await ApiService.register(payload);
      setCurrentUser(user);
      setBackendConnected(true);
      await refreshFromBackend();
      return user;
    } catch {
      // Offline fallback registration
      const fallbackUser: AuthUser = {
        id: `usr-${payload.role}-${Date.now()}`,
        email: payload.email.trim().toLowerCase(),
        full_name: payload.full_name.trim(),
        role: payload.role,
        group_name: payload.role === 'student' ? payload.group_name || 'CS-2401' : null,
        department: payload.role !== 'student' ? payload.department || 'Computer Science' : null,
        gpa: 3.78,
      };
      setStoredAuth(`offline-token-${Date.now()}`, fallbackUser);
      setCurrentUser(fallbackUser);
      if (payload.role === 'student') {
        setStudentsList((prev) => [...prev, fallbackUser]);
      } else if (payload.role === 'teacher') {
        setTeachersList((prev) => [...prev, fallbackUser]);
      }
      return fallbackUser;
    }
  };

  const switchDemoRole = async (role: UserRole) => {
    const creds =
      role === 'admin'
        ? { email: 'admin@unicampus.kz', pass: 'admin123', fallback: DEFAULT_DEMO_ADMIN }
        : role === 'teacher'
        ? { email: 'teacher@unicampus.kz', pass: 'teacher123', fallback: DEFAULT_DEMO_TEACHER }
        : { email: 'student@unicampus.kz', pass: 'student123', fallback: DEFAULT_DEMO_STUDENT };
    try {
      await loginWithCredentials(creds.email, creds.pass);
    } catch {
      setStoredAuth(`demo-token-${role}`, creds.fallback);
      setCurrentUser(creds.fallback);
    }
  };

  const logout = () => {
    setStoredAuth(null, null);
    setCurrentUser(DEFAULT_DEMO_STUDENT);
    setIsAuthModalOpen(true);
  };

  const [assignmentFilter, setAssignmentFilter] = useState<'all' | AssignmentStatus>('all');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');

  const unreadAnnouncementsCount = RECENT_ANNOUNCEMENTS.filter((a) => a.unread).length;

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

    if (!isOfflineMode) {
      ApiService.createScheduleItem(item).catch(() => {});
    }

    if (homework && homework.title.trim()) {
      addHomeworkForCourse(
        created.courseName,
        created.courseCode,
        homework.title,
        homework.dueDate || 'Oct 28',
        homework.daysLeft ?? 2
      );
    }

    return created;
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

    if (!isOfflineMode) {
      try {
        const updated = await ApiService.updateScheduleItem(id, payload);
        setScheduleItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
      } catch {
        // Optimistic update already saved
      }
    }
  };

  const removeScheduleItem = (id: string) => {
    setScheduleItems((prev) => prev.filter((item) => item.id !== id));
    if (!isOfflineMode) {
      ApiService.deleteScheduleItem(id).catch(() => {});
    }
  };

  const clearAllSchedule = () => {
    setScheduleItems([]);
  };

  const resetDefaultSchedule = () => {
    setScheduleItems(WEEKLY_SCHEDULE);
  };

  const removeAssignment = (id: string) => {
    setAssignments((prev) => prev.filter((item) => item.id !== id));
    if (!isOfflineMode) {
      ApiService.deleteAssignment(id).catch(() => {});
    }
  };

  const toggleAssignmentStatus = (id: string) => {
    setAssignments((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextStatus: AssignmentStatus = item.status === 'todo' ? 'submitted' : 'todo';
          return { ...item, status: nextStatus };
        }
        return item;
      })
    );
  };

  const addPersonalNote = (id: string, note: string) => {
    setAssignments((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, hasPersonalNote: true, personalNote: note };
        }
        return item;
      })
    );
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
      } catch {
        // Already added optimistically
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

    return {
      ...CURRENT_STUDENT,
      name: firstName,
      fullName,
      email: currentUser?.email || CURRENT_STUDENT.email,
      gpa: liveGpa,
      groupName: currentUser?.group_name || 'CS-2401',
      department: currentUser?.department || undefined,
      role: userRole,
      scholarshipStatus:
        liveGpa >= 3.5
          ? 'Active (State Academic Grant)'
          : 'Warning (Below 3.50 Scholarship Threshold)',
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
        switchDemoRole,
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
        isQuickActionsOpen,
        setIsQuickActionsOpen,
        isAddScheduleOpen,
        setIsAddScheduleOpen,
        scheduleItems,
        addScheduleItem,
        updateScheduleClass,
        removeScheduleItem,
        clearAllSchedule,
        resetDefaultSchedule,
        addHomeworkForCourse,
        removeAssignment,
        assignments,
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
        createRoomBooking,
        updateRoomBookingStatus,
        isOfflineMode,
        setIsOfflineMode,
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
