import React from 'react';
import { Header } from '../common/Header';
import { FloatingActionButton } from '../common/FloatingActionButton';
import { useApp } from '../../context/AppContext';
import { TODAY_CLASSES, UPCOMING_DEADLINES_SUMMARY, RECENT_ANNOUNCEMENTS } from '../../data/mockData';
import { MapPin, ArrowRight, Sparkles } from 'lucide-react';

export const DashboardScreen: React.FC = () => {
  const { navigateToClassroom, setActiveTab, setIsAIAssistantOpen, isOfflineMode } = useApp();

  return (
    <div className="flex flex-col h-full bg-[#f4f6fa] relative overflow-hidden select-none">
      {/* Header */}
      <Header title="DASHBOARD" />

      {/* Scrollable Content Container */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5 pb-20">
        
        {/* Offline & AI Quick Banner */}
        <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100/70 rounded-xl px-3 py-2 text-xs text-blue-900">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{isOfflineMode ? 'Offline Mode Active' : 'Synced with University Portal'}</span>
          </div>
          <button
            onClick={() => setIsAIAssistantOpen(true)}
            className="flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 bg-white/80 px-2 py-1 rounded-md shadow-2xs hover:bg-white"
          >
            <Sparkles className="w-3 h-3 text-amber-500" />
            AI Advising
          </button>
        </div>

        {/* 1. Today's Schedule Card */}
        <div className="bg-white rounded-2xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-bold text-slate-800">
              Today's Schedule
            </h3>
            <button
              onClick={() => setActiveTab('schedule')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
            >
              Full week <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {TODAY_CLASSES.map((cls, idx) => (
              <div
                key={idx}
                className={`relative rounded-xl p-3 transition-all ${
                  cls.isCurrent
                    ? 'bg-emerald-50/70 border-l-4 border-[#10b981] shadow-2xs'
                    : 'bg-slate-50/80 hover:bg-slate-100/80'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">
                        {cls.time.split(' - ')[0]} - {cls.title}
                      </span>
                      {cls.isCurrent && (
                        <span className="bg-[#10b981] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => navigateToClassroom(cls.room)}
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 mt-1 font-medium group"
                      title="Show classroom on campus map"
                    >
                      <MapPin className="w-3 h-3 text-blue-500 group-hover:scale-110 transition-transform" />
                      <span className="group-hover:underline">{cls.room} ({cls.building})</span>
                    </button>
                  </div>

                  <button
                    onClick={() => navigateToClassroom(cls.room)}
                    className="text-[11px] font-semibold text-[#18458b] bg-white border border-blue-100 px-2.5 py-1.5 rounded-lg shadow-2xs hover:bg-blue-50 transition-all self-center"
                  >
                    Map
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Upcoming Deadlines Card */}
        <div className="bg-white rounded-2xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-bold text-slate-800">
              Upcoming Deadlines
            </h3>
            <button
              onClick={() => setActiveTab('assignments')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {UPCOMING_DEADLINES_SUMMARY.map((item) => (
              <div
                key={item.id}
                onClick={() => setActiveTab('assignments')}
                className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50 last:border-b-0 cursor-pointer hover:bg-slate-50/60 rounded px-1 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  ></span>
                  <span className="font-medium text-slate-700">{item.title}</span>
                </div>
                <span className="text-slate-500 font-semibold text-[11px]">
                  {item.dueText}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Recent Announcements Card */}
        <div className="bg-white rounded-2xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-bold text-slate-800">
              Recent Announcements
            </h3>
          </div>

          <div className="space-y-2">
            {RECENT_ANNOUNCEMENTS.map((announcement) => (
              <div
                key={announcement.id}
                className="flex items-start gap-2.5 text-xs py-1.5 text-slate-700"
              >
                <span className="w-2 h-2 rounded-full bg-slate-400 mt-1.5 flex-shrink-0"></span>
                <div>
                  <p className="font-medium">{announcement.title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                    {announcement.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Floating Action Button (+) */}
      <FloatingActionButton />
    </div>
  );
};
