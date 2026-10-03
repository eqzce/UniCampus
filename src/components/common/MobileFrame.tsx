import React from 'react';
import { useApp } from '../../context/AppContext';
import { DashboardScreen } from '../dashboard/DashboardScreen';
import { ScheduleScreen } from '../schedule/ScheduleScreen';
import { GradesScreen } from '../grades/GradesScreen';
import { CampusMapScreen } from '../map/CampusMapScreen';
import { BottomNav } from './BottomNav';
import { Wifi, Battery, Signal } from 'lucide-react';

export const MobileFrame: React.FC = () => {
  const { activeTab } = useApp();

  const renderActiveScreen = () => {
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
    <div className="flex-1 flex items-center justify-center py-4 px-2 sm:px-6 w-full">
      {/* Smartphone Chassis Mockup */}
      <div className="w-full max-w-[380px] h-[780px] bg-slate-900 rounded-[48px] p-2.5 shadow-[0_25px_60px_rgba(0,0,0,0.35)] border-4 border-slate-700/60 relative flex flex-col ring-1 ring-white/10">
        
        {/* Dynamic Island / Notch */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-40 flex items-center justify-center gap-2">
          <div className="w-2.5 h-2.5 bg-slate-900 rounded-full border border-slate-700"></div>
          <div className="w-2 h-2 bg-blue-900/60 rounded-full"></div>
        </div>

        {/* Screen Bezel Content */}
        <div className="w-full h-full bg-white rounded-[38px] overflow-hidden flex flex-col relative">
          
          {/* Status Bar */}
          <div className="bg-[#18458b] text-white pt-2.5 px-6 pb-1 flex items-center justify-between text-[11px] font-semibold tracking-tight z-30 select-none">
            <span>9:41</span>
            <div className="flex items-center gap-1.5 opacity-90">
              <Signal className="w-3 h-3" />
              <Wifi className="w-3 h-3" />
              <Battery className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Active Screen View */}
          <div className="flex-1 overflow-hidden flex flex-col relative">
            {renderActiveScreen()}
          </div>

          {/* Bottom Navigation */}
          <BottomNav />

          {/* Home indicator bar */}
          <div className="h-4 bg-white flex items-center justify-center">
            <div className="w-32 h-1 bg-slate-300 rounded-full"></div>
          </div>
        </div>

      </div>
    </div>
  );
};
