import React from 'react';
import { BookOpenCheck, UserCheck, CalendarPlus, DoorOpen, MapPin } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { TeacherTabType } from '../../types';

interface TeacherBottomNavProps {
  forcedTab?: TeacherTabType;
  onTabChange?: (tab: TeacherTabType) => void;
}

export const TeacherBottomNav: React.FC<TeacherBottomNavProps> = ({ forcedTab, onTabChange }) => {
  const { teacherActiveTab, setTeacherActiveTab } = useApp();
  const currentTab = forcedTab || teacherActiveTab;

  const handleSelect = (tab: TeacherTabType) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setTeacherActiveTab(tab);
    }
  };

  const navItems: { id: TeacherTabType; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'gradebook', label: 'Gradebook', icon: BookOpenCheck },
    { id: 'attendance', label: 'Attendance', icon: UserCheck },
    { id: 'tasks', label: 'Tasks', icon: CalendarPlus },
    { id: 'schedule', label: 'Rooms & Sched', icon: DoorOpen },
    { id: 'map', label: 'Map', icon: MapPin },
  ];

  return (
    <nav className="bg-white border-t border-slate-100 py-2 px-2 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] z-20">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
                isActive
                  ? 'text-[#18458b] font-semibold scale-105'
                  : 'text-slate-400 hover:text-slate-600 font-normal'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
              <span className="text-[10px] mt-1 tracking-tight truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
