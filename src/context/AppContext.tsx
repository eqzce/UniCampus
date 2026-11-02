import React, { createContext, useContext, useState, useEffect } from 'react';
import type { TabType, Assignment, AssignmentStatus, ScheduleItem } from '../types';
import { ASSIGNMENTS_LIST, CURRENT_STUDENT, RECENT_ANNOUNCEMENTS, WEEKLY_SCHEDULE } from '../data/mockData';

export type ViewLayoutMode = 'phone' | 'all-screens' | 'fullscreen';

const STORAGE_KEY_SCHEDULE = 'unicampus_schedule_v1';
const STORAGE_KEY_ASSIGNMENTS = 'unicampus_assignments_v1';

interface AppContextType {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  selectedRoomForNav: string | null;
  roomNavTimestamp: number;
  navigateToClassroom: (room: string) => void;
  clearRoomNavigation: () => void;

  // View presentation mode
  viewMode: ViewLayoutMode;
  setViewMode: (mode: ViewLayoutMode) => void;

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

  // Data states
  assignments: Assignment[];
  assignmentFilter: 'all' | AssignmentStatus;
  setAssignmentFilter: (filter: 'all' | AssignmentStatus) => void;
  selectedCourseFilter: string; // 'all' or course code e.g. 'PHYS101'
  setSelectedCourseFilter: (code: string) => void;
  toggleAssignmentStatus: (id: string) => void;
  addPersonalNote: (id: string, note: string) => void;

  // Offline status
  isOfflineMode: boolean;
  setIsOfflineMode: (offline: boolean) => void;

  // Student info
  student: typeof CURRENT_STUDENT;
  unreadAnnouncementsCount: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    return (['dashboard', 'schedule', 'grades', 'assignments', 'map'] as TabType[]).includes(tab as TabType)
      ? (tab as TabType)
      : 'dashboard';
  });
  const [selectedRoomForNav, setSelectedRoomForNav] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get('room')
  );
  const [roomNavTimestamp, setRoomNavTimestamp] = useState<number>(0);
  const [viewMode, setViewMode] = useState<ViewLayoutMode>(
    () => (new URLSearchParams(window.location.search).get('view') as ViewLayoutMode) || 'phone'
  );

  const [isProfileOpen, setIsProfileOpen] = useState(
    () => new URLSearchParams(window.location.search).get('profile') === '1'
  );
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [isAddScheduleOpen, setIsAddScheduleOpen] = useState(false);

  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SCHEDULE);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return WEEKLY_SCHEDULE;
  });

  const [assignments, setAssignments] = useState<Assignment[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ASSIGNMENTS);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return ASSIGNMENTS_LIST;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SCHEDULE, JSON.stringify(scheduleItems));
    } catch {
      // ignore storage errors
    }
  }, [scheduleItems]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ASSIGNMENTS, JSON.stringify(assignments));
    } catch {
      // ignore storage errors
    }
  }, [assignments]);

  const [assignmentFilter, setAssignmentFilter] = useState<'all' | AssignmentStatus>('all');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  const unreadAnnouncementsCount = RECENT_ANNOUNCEMENTS.filter((a) => a.unread).length;

  const navigateToClassroom = (room: string) => {
    setSelectedRoomForNav(room);
    setRoomNavTimestamp(Date.now());
    setActiveTab('map');
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
      dueDate: dueDate.startsWith('Due ') ? dueDate : `Due ${dueDate}`,
      dueFormatted: `${dueDate}, 23:59`,
      daysLeft,
      status: 'todo',
      weight: '10%',
      hasPersonalNote: false,
    };

    setAssignments((prev) => [newAssignment, ...prev]);
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

  const removeScheduleItem = (id: string) => {
    setScheduleItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearAllSchedule = () => {
    setScheduleItems([]);
  };

  const resetDefaultSchedule = () => {
    setScheduleItems(WEEKLY_SCHEDULE);
  };

  const removeAssignment = (id: string) => {
    setAssignments((prev) => prev.filter((item) => item.id !== id));
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

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        selectedRoomForNav,
        roomNavTimestamp,
        navigateToClassroom,
        clearRoomNavigation,
        viewMode,
        setViewMode,
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
        isOfflineMode,
        setIsOfflineMode,
        student: CURRENT_STUDENT,
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
