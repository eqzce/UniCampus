import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { MobileFrame } from './components/common/MobileFrame';
import { AllScreensView } from './components/presentation/AllScreensView';
import { DashboardScreen } from './components/dashboard/DashboardScreen';
import { ScheduleScreen } from './components/schedule/ScheduleScreen';
import { GradesScreen } from './components/grades/GradesScreen';
import { CampusMapScreen } from './components/map/CampusMapScreen';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { BottomNav } from './components/common/BottomNav';
import { TeacherBottomNav } from './components/teacher/TeacherBottomNav';
import { AdminBottomNav } from './components/admin/AdminBottomNav';
import { AIAssistantModal } from './components/ai/AIAssistantModal';
import { RoomBookingModal } from './components/booking/RoomBookingModal';
import { NotificationsModal } from './components/notifications/NotificationsModal';
import { ProfileModal } from './components/profile/ProfileModal';
import { AddScheduleModal } from './components/schedule/AddScheduleModal';
import { AuthModal } from './components/auth/AuthModal';
import {
  Smartphone,
  LayoutGrid,
  Maximize2,
  Bot,
  DoorClosed,
  Bell,
  GraduationCap,
  CalendarPlus,
  Briefcase,
  ShieldCheck,
  LogIn,
  Loader2,
  Download,
} from 'lucide-react';
import './App.css';

const MainContent: React.FC = () => {
  const {
    viewMode,
    setViewMode,
    activeTab,
    userRole,
    currentUser,
    switchDemoRole,
    setIsAuthModalOpen,
    setIsAIAssistantOpen,
    setIsBookingOpen,
    setIsNotificationsOpen,
    setIsAddScheduleOpen,
    unreadAnnouncementsCount,
    student,
    isColdStarting,
    isOfflineMode,
    saveAllForOffline,
  } = useApp();

  // True ONLY inside the compiled Capacitor Android APK (keeps web preview intact on GitHub / browser)
  const isNativeApk = Boolean(
    typeof window !== 'undefined' &&
      (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()
  );

  const renderFullscreenContent = () => {
    if (userRole === 'admin') {
      return <AdminDashboard />;
    }
    if (userRole === 'teacher') {
      return <TeacherDashboard />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <DashboardScreen />;
      case 'schedule':
        return <ScheduleScreen />;
      case 'grades':
      case 'assignments':
        return <GradesScreen />;
      case 'map':
        return <CampusMapScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  if (isNativeApk) {
    return (
      <div className="h-dvh w-full bg-white text-slate-900 flex flex-col font-sans overflow-hidden select-none">
        {isColdStarting && (
          <div className="bg-amber-500 text-white text-[11px] font-bold px-3 py-1.5 flex items-center justify-center gap-2 z-50">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Waking up Render cloud server (up to 60s)...</span>
          </div>
        )}
        <div className="flex-1 overflow-hidden flex flex-col relative">
          {renderFullscreenContent()}
        </div>
        {userRole === 'admin' ? (
          <AdminBottomNav />
        ) : userRole === 'teacher' ? (
          <TeacherBottomNav />
        ) : (
          <BottomNav />
        )}
        <ProfileModal />
        <AuthModal />
        <AIAssistantModal />
        <RoomBookingModal />
        <NotificationsModal />
        <AddScheduleModal />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Render Cold-Start Banner */}
      {isColdStarting && (
        <div className="bg-amber-500/95 text-slate-950 text-xs font-bold px-4 py-2 flex items-center justify-center gap-2 z-50">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>
            Waking up Render PostgreSQL Cloud Server (Free Tier cold start — timeout set to 60s)...
          </span>
        </div>
      )}

      {/* Top Application Bar for development & presentation */}
      <header className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-50">
        
        {/* Brand + Active Role Info */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#18458b] to-blue-500 flex items-center justify-center shadow-md">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              UniCampus
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                  userRole === 'admin'
                    ? 'bg-purple-900/60 text-purple-300 border-purple-700/50'
                    : userRole === 'teacher'
                    ? 'bg-emerald-900/60 text-emerald-300 border-emerald-700/50'
                    : 'bg-blue-900/60 text-blue-300 border-blue-700/50'
                }`}
              >
                {userRole === 'admin'
                  ? 'Admin RBAC'
                  : userRole === 'teacher'
                  ? 'Teacher RBAC'
                  : 'Student RBAC'}
              </span>
              {isOfflineMode && (
                <span className="text-[10px] bg-amber-900/60 text-amber-300 border border-amber-700/50 px-1.5 py-0.5 rounded-full font-semibold">
                  Offline Cached
                </span>
              )}
            </h1>
            <p className="text-[11px] text-slate-400">
              {userRole === 'admin'
                ? `Admin: ${currentUser?.full_name || 'Aidar K.'}`
                : userRole === 'teacher'
                ? `Teacher: ${currentUser?.full_name || 'Dr. Yersultan M.'}`
                : `Student: ${student.fullName} (GPA: ${student.gpa.toFixed(2)})`}
            </p>
          </div>
        </div>

        {/* Role Switcher (Student / Teacher / Admin) + View Mode Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Student / Teacher / Admin Role Toggle */}
          <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
            <button
              onClick={() => switchDemoRole('student')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                userRole === 'student'
                  ? 'bg-[#18458b] text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Switch to Student Role Interface (View-Only Grades & Schedule)"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Student</span>
            </button>

            <button
              onClick={() => switchDemoRole('teacher')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                userRole === 'teacher'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Switch to Teacher Role Interface (Modify Schedule & Grade Students)"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Teacher</span>
            </button>

            <button
              onClick={() => switchDemoRole('admin')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                userRole === 'admin'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Switch to Admin Role Interface (Add Subjects, Bind Teachers & Full Access)"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
            <button
              onClick={() => setViewMode('phone')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'phone'
                  ? 'bg-[#18458b] text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Single interactive smartphone simulator"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Interactive Phone</span>
            </button>

            <button
              onClick={() => setViewMode('all-screens')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'all-screens'
                  ? 'bg-[#18458b] text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Display all 4 screens side by side as in the mockup"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>4-Screens Mockup</span>
            </button>

            <button
              onClick={() => setViewMode('fullscreen')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'fullscreen'
                  ? 'bg-[#18458b] text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Fullscreen Responsive View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Fullscreen</span>
            </button>
          </div>
        </div>

        {/* Quick Launch Shortcuts */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="flex items-center gap-1.5 text-xs bg-sky-600/30 hover:bg-sky-600/50 text-sky-300 border border-sky-500/40 px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In / Register</span>
          </button>

          <button
            onClick={saveAllForOffline}
            title="Save Schedule, Map & Grades for Offline Mode"
            className="flex items-center gap-1.5 text-xs bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save Offline</span>
          </button>

          {userRole !== 'student' && (
            <button
              onClick={() => setIsAddScheduleOpen(true)}
              className="flex items-center gap-1.5 text-xs bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer"
            >
              <CalendarPlus className="w-3.5 h-3.5 text-emerald-300" />
              <span>Add Class</span>
            </button>
          )}

          <button
            onClick={() => setIsAIAssistantOpen(true)}
            className="flex items-center gap-1.5 text-xs bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer"
          >
            <Bot className="w-3.5 h-3.5 text-indigo-300" />
            <span>AI Advisor</span>
          </button>

          <button
            onClick={() => setIsBookingOpen(true)}
            className="flex items-center gap-1.5 text-xs bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer"
          >
            <DoorClosed className="w-3.5 h-3.5 text-blue-300" />
            <span>Book Room</span>
          </button>

          <button
            onClick={() => setIsNotificationsOpen(true)}
            className="relative flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Alerts</span>
            {unreadAnnouncementsCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadAnnouncementsCount}
              </span>
            )}
          </button>
        </div>

      </header>

      {/* Main View Area */}
      <main className="flex-1 flex flex-col items-center justify-center overflow-auto bg-[#0b1329]">
        {viewMode === 'all-screens' && <AllScreensView />}

        {viewMode === 'phone' && <MobileFrame />}

        {viewMode === 'fullscreen' && (
          <div className="w-full max-w-2xl h-[92vh] my-auto bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-800 relative">
            <div className="flex-1 overflow-hidden flex flex-col">
              {renderFullscreenContent()}
            </div>
            {userRole === 'admin' ? (
              <AdminBottomNav />
            ) : userRole === 'teacher' ? (
              <TeacherBottomNav />
            ) : (
              <BottomNav />
            )}
          </div>
        )}
      </main>

      {/* Modals & Dialogs */}
      <ProfileModal />
      <AuthModal />
      <AIAssistantModal />
      <RoomBookingModal />
      <NotificationsModal />
      <AddScheduleModal />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
