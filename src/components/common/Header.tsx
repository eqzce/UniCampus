import React from 'react';
import { Bell, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showGreeting?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const { unreadAnnouncementsCount, setIsNotificationsOpen, setIsProfileOpen } = useApp();

  return (
    <header className="bg-[#18458b] text-white pt-4 pb-4 px-4 rounded-b-[28px] shadow-md relative z-10 transition-all">
      {/* Top Bar with Profile Button (Left), Title (Center), and Notification Bell (Right) */}
      <div className="flex items-center justify-between relative">
        {/* Profile Button - Request 7: Top Left in all tabs */}
        <button
          onClick={() => setIsProfileOpen(true)}
          className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 border border-white/20 flex items-center justify-center text-white transition-all shadow-2xs group"
          title="Student Profile"
          aria-label="Open student profile"
        >
          <User className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
        </button>
        
        {/* Centered Title */}
        <h1 className="text-[17px] font-bold tracking-wider text-center uppercase text-white/95 truncate px-2">
          {title}
        </h1>

        {/* Notifications Bell */}
        <button
          onClick={() => setIsNotificationsOpen(true)}
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
      </div>

      {subtitle && (
        <p className="text-blue-100/80 text-xs text-center mt-1">
          {subtitle}
        </p>
      )}
    </header>
  );
};
