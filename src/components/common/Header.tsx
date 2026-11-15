import React, { useState } from 'react';
import {
  Bell,
  User,
  LayoutGrid,
  Bot,
  DoorClosed,
  RefreshCw,
  HardDriveDownload,
  CalendarPlus,
  LogIn,
  Check,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showGreeting?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  const {
    userRole,
    unreadAnnouncementsCount,
    setIsNotificationsOpen,
    setIsProfileOpen,
    setIsAIAssistantOpen,
    setIsBookingOpen,
    setIsAddScheduleOpen,
    setIsAuthModalOpen,
    saveAllForOffline,
    isOfflineMode,
  } = useApp();

  const [menuOpen, setMenuOpen] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSaveOffline = () => {
    saveAllForOffline();
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      setMenuOpen(false);
    }, 900);
  };

  return (
    <header className="bg-[#18458b] text-white pt-4 pb-4 px-4 rounded-b-[28px] shadow-md relative z-30 transition-all">
      {/* Top Bar with Profile Button (Left), Title (Center), Additional Functions & Notification Bell (Right) */}
      <div className="flex items-center justify-between relative">
        {/* Profile Button */}
        <button
          onClick={() => {
            setMenuOpen(false);
            setIsProfileOpen(true);
          }}
          className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 border border-white/20 flex items-center justify-center text-white transition-all shadow-2xs group flex-shrink-0"
          title="Account Profile"
          aria-label="Open profile"
        >
          <User className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
        </button>

        {/* Centered Title */}
        <h1 className="text-[17px] font-bold tracking-wider text-center uppercase text-white/95 truncate px-2">
          {title}
        </h1>

        {/* Right Controls: Additional Functions + Notifications */}
        <div className="flex items-center gap-1 relative flex-shrink-0">
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all text-white/95 ${
              menuOpen ? 'bg-white/25 ring-2 ring-white/40' : 'hover:bg-white/15 active:scale-95'
            }`}
            title="Additional Functions"
            aria-label="Additional Functions"
            aria-expanded={menuOpen}
          >
            <LayoutGrid className="w-4.5 h-4.5 stroke-[2]" />
          </button>

          <button
            onClick={() => {
              setMenuOpen(false);
              setIsNotificationsOpen(true);
            }}
            className="relative w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/15 active:scale-95 transition-all text-white/90"
            title="Notifications"
            aria-label="Open notifications"
          >
            <Bell className="w-5 h-5 stroke-[2]" />
            {unreadAnnouncementsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#10b981] text-white text-[11px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                {unreadAnnouncementsCount}
              </span>
            )}
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
              />
              <div
                role="menu"
                aria-label="Additional Functions Menu"
                className="absolute right-0 top-10 w-56 bg-white text-slate-800 rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Quick Tools
                  </span>
                  {isOfflineMode && (
                    <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">
                      Offline
                    </span>
                  )}
                </div>

                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setIsAIAssistantOpen(true);
                  }}
                  className="w-full px-3 py-2 flex items-center gap-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-pointer"
                >
                  <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3.5 h-3.5" />
                  </span>
                  <span>Ask AI Assistant</span>
                </button>

                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setIsBookingOpen(true);
                  }}
                  className="w-full px-3 py-2 flex items-center gap-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer"
                >
                  <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                    <DoorClosed className="w-3.5 h-3.5" />
                  </span>
                  <span>Book Study Room</span>
                </button>

                <button
                  role="menuitem"
                  onClick={handleSaveOffline}
                  className="w-full px-3 py-2 flex items-center gap-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer"
                >
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                    {savedNotice ? <Check className="w-3.5 h-3.5" /> : <HardDriveDownload className="w-3.5 h-3.5" />}
                  </span>
                  <span>{savedNotice ? 'Saved for Offline' : 'Save Data for Offline'}</span>
                </button>

                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setIsNotificationsOpen(true);
                  }}
                  className="w-full px-3 py-2 flex items-center gap-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </span>
                  <span>Offline Sync & Alerts</span>
                </button>

                {(userRole === 'teacher' || userRole === 'admin') && (
                  <button
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setIsAddScheduleOpen(true);
                    }}
                    className="w-full px-3 py-2 flex items-center gap-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer"
                  >
                    <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                      <CalendarPlus className="w-3.5 h-3.5" />
                    </span>
                    <span>Add Class Session</span>
                  </button>
                )}

                <div className="my-1 border-t border-slate-100" />

                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setIsAuthModalOpen(true);
                  }}
                  className="w-full px-3 py-2 flex items-center gap-2.5 text-left text-xs font-semibold text-[#18458b] hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  <span className="w-6 h-6 rounded-lg bg-blue-100 text-[#18458b] flex items-center justify-center flex-shrink-0">
                    <LogIn className="w-3.5 h-3.5" />
                  </span>
                  <span>Switch Account / Sign In</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
