import React, { createContext, useContext, useState } from 'react';
import type { TabType, Assignment, AssignmentStatus } from '../types';
import { ASSIGNMENTS_LIST, CURRENT_STUDENT, RECENT_ANNOUNCEMENTS } from '../data/mockData';

export type ViewLayoutMode = 'phone' | 'all-screens' | 'fullscreen';

interface AppContextType {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  selectedRoomForNav: string | null;
  navigateToClassroom: (room: string) => void;
  clearRoomNavigation: () => void;

  // View presentation mode
  viewMode: ViewLayoutMode;
  setViewMode: (mode: ViewLayoutMode) => void;

  // Modals
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
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedRoomForNav, setSelectedRoomForNav] = useState<string | null>('Room 301');
  const [viewMode, setViewMode] = useState<ViewLayoutMode>('phone');

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);

  const [assignments, setAssignments] = useState<Assignment[]>(ASSIGNMENTS_LIST);
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | AssignmentStatus>('all');
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  const unreadAnnouncementsCount = RECENT_ANNOUNCEMENTS.filter((a) => a.unread).length;

  const navigateToClassroom = (room: string) => {
    setSelectedRoomForNav(room);
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
        navigateToClassroom,
        clearRoomNavigation,
        viewMode,
        setViewMode,
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
