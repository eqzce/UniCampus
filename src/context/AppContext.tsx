import React, { createContext, useContext, useState } from 'react';
import type { TabType, Assignment, AssignmentStatus } from '../types';
import { ASSIGNMENTS_LIST, CURRENT_STUDENT, RECENT_ANNOUNCEMENTS } from '../data/mockData';

export type ViewLayoutMode = 'phone' | 'all-screens' | 'fullscreen';

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

  const [assignments, setAssignments] = useState<Assignment[]>(ASSIGNMENTS_LIST);
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
