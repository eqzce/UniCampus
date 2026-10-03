import React from 'react';
import { DashboardScreen } from '../dashboard/DashboardScreen';
import { ScheduleScreen } from '../schedule/ScheduleScreen';
import { GradesScreen } from '../grades/GradesScreen';
import { CampusMapScreen } from '../map/CampusMapScreen';
import { BottomNav } from '../common/BottomNav';

export const AllScreensView: React.FC = () => {
  return (
    <div className="w-full min-h-screen bg-[#eaeff5] py-8 px-4 flex flex-col items-center">
      {/* Top Title from Screenshot */}
      <h1 className="text-xl md:text-2xl font-bold text-slate-800 mb-8 tracking-tight text-center">
        UniCampus: Unified University Application
      </h1>

      {/* 2x2 Grid of Phone Frames matching Gemini_Generated_Image_mxxi7lmxxi7lmxxi (1) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl w-full justify-items-center">
        
        {/* Screen 1: DASHBOARD */}
        <div className="w-[340px] h-[680px] bg-white rounded-[40px] shadow-[0_20px_50px_rgba(24,69,139,0.15)] border-8 border-slate-900/90 overflow-hidden flex flex-col relative ring-1 ring-slate-900/10">
          {/* Speaker / Camera Notch */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-900 rounded-full z-40"></div>
          
          <div className="flex-1 overflow-hidden flex flex-col pt-3">
            <DashboardScreen />
          </div>
          <BottomNav forcedTab="dashboard" />
          <div className="h-4 bg-white flex items-center justify-center">
            <div className="w-28 h-1 bg-slate-300 rounded-full"></div>
          </div>
        </div>

        {/* Screen 2: SCHEDULE */}
        <div className="w-[340px] h-[680px] bg-white rounded-[40px] shadow-[0_20px_50px_rgba(24,69,139,0.15)] border-8 border-slate-900/90 overflow-hidden flex flex-col relative ring-1 ring-slate-900/10">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-900 rounded-full z-40"></div>
          
          <div className="flex-1 overflow-hidden flex flex-col pt-3">
            <ScheduleScreen />
          </div>
          <BottomNav forcedTab="schedule" />
          <div className="h-4 bg-white flex items-center justify-center">
            <div className="w-28 h-1 bg-slate-300 rounded-full"></div>
          </div>
        </div>

        {/* Screen 3: GRADES */}
        <div className="w-[340px] h-[680px] bg-white rounded-[40px] shadow-[0_20px_50px_rgba(24,69,139,0.15)] border-8 border-slate-900/90 overflow-hidden flex flex-col relative ring-1 ring-slate-900/10">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-900 rounded-full z-40"></div>
          
          <div className="flex-1 overflow-hidden flex flex-col pt-3">
            <GradesScreen />
          </div>
          <BottomNav forcedTab="grades" />
          <div className="h-4 bg-white flex items-center justify-center">
            <div className="w-28 h-1 bg-slate-300 rounded-full"></div>
          </div>
        </div>

        {/* Screen 4: MAP */}
        <div className="w-[340px] h-[680px] bg-white rounded-[40px] shadow-[0_20px_50px_rgba(24,69,139,0.15)] border-8 border-slate-900/90 overflow-hidden flex flex-col relative ring-1 ring-slate-900/10">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-900 rounded-full z-40"></div>
          
          <div className="flex-1 overflow-hidden flex flex-col pt-3">
            <CampusMapScreen />
          </div>
          <BottomNav forcedTab="map" />
          <div className="h-4 bg-white flex items-center justify-center">
            <div className="w-28 h-1 bg-slate-300 rounded-full"></div>
          </div>
        </div>

      </div>
    </div>
  );
};
