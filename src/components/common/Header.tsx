import React from 'react';
import { Bell } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showGreeting?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, showGreeting }) => {
  const { student, unreadAnnouncementsCount, setIsNotificationsOpen } = useApp();

  return (
    <header className="bg-[#18458b] text-white pt-4 pb-5 px-5 rounded-b-[28px] shadow-md relative z-10 transition-all">
      {/* Top Bar with Title and Notification Bell */}
      <div className="flex items-center justify-between relative mb-2">
        <div className="w-8"></div> {/* spacer for centering */}
        
        <h1 className="text-[17px] font-bold tracking-wider text-center uppercase text-white/95">
          {title}
        </h1>

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

      {/* Optional Greeting (as seen on Dashboard: "Welcome, Arystan!") */}
      {showGreeting && (
        <div className="mt-3 mb-1">
          <h2 className="text-xl font-bold tracking-tight text-white">
            Welcome, {student.name}!
          </h2>
          <p className="text-blue-100/75 text-xs">
            {student.major} • GPA: {student.gpa}
          </p>
        </div>
      )}

      {subtitle && !showGreeting && (
        <p className="text-blue-100/80 text-xs text-center mt-1">
          {subtitle}
        </p>
      )}
    </header>
  );
};
