import React from 'react';
import {
  BookOpen,
  CalendarClock,
  GraduationCap,
  UserCheck,
  ClipboardList,
  MapPin,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { AdminTabType } from '../../types';

interface AdminBottomNavProps {
  forcedTab?: AdminTabType;
}

export const AdminBottomNav: React.FC<AdminBottomNavProps> = ({ forcedTab }) => {
  const { adminActiveTab, setAdminActiveTab } = useApp();
  const currentTab = forcedTab || adminActiveTab;

  const navItems: { id: AdminTabType; label: string; icon: React.ReactNode }[] = [
    { id: 'courses', label: 'Subjects', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'schedule', label: 'Schedule', icon: <CalendarClock className="w-4 h-4" /> },
    { id: 'gradebook', label: 'Grades', icon: <GraduationCap className="w-4 h-4" /> },
    { id: 'attendance', label: 'Attend.', icon: <UserCheck className="w-4 h-4" /> },
    { id: 'tasks', label: 'Deadlines', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'map', label: 'Map', icon: <MapPin className="w-4 h-4" /> },
  ];

  return (
    <nav className="bg-white border-t border-slate-200/80 px-1.5 py-1.5 flex items-center justify-around z-20 shrink-0 select-none">
      {navItems.map((item) => {
        const isActive = currentTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => !forcedTab && setAdminActiveTab(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all duration-150 ${
              isActive
                ? 'text-purple-700 font-bold bg-purple-50/70'
                : 'text-slate-400 hover:text-slate-600 font-medium'
            }`}
          >
            <div className={`transition-transform duration-150 ${isActive ? 'scale-110' : ''}`}>
              {item.icon}
            </div>
            <span className="text-[9.5px] mt-0.5 tracking-tight">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
