import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { MobileFrame } from './components/common/MobileFrame';
import { AllScreensView } from './components/presentation/AllScreensView';
import { DashboardScreen } from './components/dashboard/DashboardScreen';
import { ScheduleScreen } from './components/schedule/ScheduleScreen';
import { GradesScreen } from './components/grades/GradesScreen';
import { CampusMapScreen } from './components/map/CampusMapScreen';
import { BottomNav } from './components/common/BottomNav';
import { AIAssistantModal } from './components/ai/AIAssistantModal';
import { RoomBookingModal } from './components/booking/RoomBookingModal';
import { NotificationsModal } from './components/notifications/NotificationsModal';
import { ProfileModal } from './components/profile/ProfileModal';
import {
  Smartphone,
  LayoutGrid,
  Maximize2,
  Bot,
  DoorClosed,
  Bell,
  GraduationCap,
} from 'lucide-react';
import './App.css';

const MainContent: React.FC = () => {
  const {
    viewMode,
    setViewMode,
    activeTab,
    setIsAIAssistantOpen,
    setIsBookingOpen,
    setIsNotificationsOpen,
    unreadAnnouncementsCount,
    student,
  } = useApp();

  const renderFullscreenContent = () => {
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

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Application Bar for development & presentation */}
      <header className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-50">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#18458b] to-blue-500 flex items-center justify-center shadow-md">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              UniCampus
              <span className="text-[10px] bg-blue-900/60 text-blue-300 border border-blue-700/50 px-1.5 py-0.5 rounded-full font-medium">
                Prototype Template
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              Student: {student.fullName} ({student.major})
            </p>
          </div>
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

        {/* Quick Launch Shortcuts */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAIAssistantOpen(true)}
            className="flex items-center gap-1.5 text-xs bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 px-3 py-1.5 rounded-xl font-medium transition-all"
          >
            <Bot className="w-3.5 h-3.5 text-indigo-300" />
            <span>AI Advisor</span>
          </button>

          <button
            onClick={() => setIsBookingOpen(true)}
            className="flex items-center gap-1.5 text-xs bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 px-3 py-1.5 rounded-xl font-medium transition-all"
          >
            <DoorClosed className="w-3.5 h-3.5 text-blue-300" />
            <span>Book Room</span>
          </button>

          <button
            onClick={() => setIsNotificationsOpen(true)}
            className="relative flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-xl font-medium transition-all"
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
            <BottomNav />
          </div>
        )}
      </main>

      {/* Modals & Dialogs */}
      <ProfileModal />
      <AIAssistantModal />
      <RoomBookingModal />
      <NotificationsModal />
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
