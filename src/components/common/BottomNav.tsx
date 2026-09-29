import React from 'react';
import { Gauge, Calendar, ClipboardCheck, MapPin } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { TabType } from '../../types';

interface BottomNavProps {
  forcedTab?: TabType;
  onTabChange?: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ forcedTab, onTabChange }) => {
  const { activeTab, setActiveTab } = useApp();
  const currentTab = forcedTab || activeTab;

  const handleSelect = (tab: TabType) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setActiveTab(tab);
    }
  };

  const navItems = [
    {
      id: 'dashboard' as TabType,
      label: 'Dashboard',
      icon: Gauge,
    },
    {
      id: 'schedule' as TabType,
      label: 'Schedule',
      icon: Calendar,
    },
    {
      id: 'assignments' as TabType,
      label: 'Assignments',
      icon: ClipboardCheck,
    },
    {
      id: 'map' as TabType,
      label: 'Map',
      icon: MapPin,
    },
  ];

  return (
    <nav className="bg-white border-t border-slate-100 py-2 px-3 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] z-20">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
                isActive
                  ? 'text-[#18458b] font-semibold scale-105'
                  : 'text-slate-400 hover:text-slate-600 font-normal'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'stroke-[2.4]' : 'stroke-[1.8]'
                  }`}
                />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#18458b] rounded-full"></span>
                )}
              </div>
              <span className="text-[11px] mt-1 tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
