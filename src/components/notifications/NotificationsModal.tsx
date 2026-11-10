import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { RECENT_ANNOUNCEMENTS } from '../../data/mockData';
import {
  Bell,
  X,
  Calendar,
  Award,
  Download,
  MapPin,
  CheckCircle2,
  GraduationCap,
} from 'lucide-react';

export const NotificationsModal: React.FC = () => {
  const {
    isNotificationsOpen,
    setIsNotificationsOpen,
    navigateToClassroom,
    isOfflineMode,
    setIsOfflineMode,
    saveAllForOffline,
    scheduleItems,
    grades,
    lastSyncedAt,
  } = useApp();

  const [justCached, setJustCached] = useState(false);

  if (!isNotificationsOpen) return null;

  const handleSaveOfflineBundle = () => {
    saveAllForOffline();
    setJustCached(true);
    setTimeout(() => setJustCached(false), 2500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-5 border border-slate-100 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Notifications & Offline Mode</h3>
              <p className="text-[10px] text-slate-400">Offline cache for Schedule, Map & Grades</p>
            </div>
          </div>
          <button
            onClick={() => setIsNotificationsOpen(false)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Enhanced Offline Cache Box (Schedule, Map & Grades) */}
        <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-3.5 mb-3 text-xs text-blue-950 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-bold flex items-center gap-1.5 text-[#18458b]">
                <Download className="w-3.5 h-3.5 text-blue-700" />
                Offline Access (Schedule, Map & Grades)
              </div>
              <p className="text-[10px] text-blue-800/80 mt-0.5">
                {isOfflineMode
                  ? 'Offline Mode is ACTIVE — using saved device data'
                  : 'Save full data snapshot for offline access without internet'}
              </p>
            </div>

            <button
              onClick={() => setIsOfflineMode(!isOfflineMode)}
              className={`text-[10.5px] font-bold px-2.5 py-1 rounded-lg transition-all shrink-0 cursor-pointer ${
                isOfflineMode
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {isOfflineMode ? 'Offline ON' : 'Go Offline'}
            </button>
          </div>

          {/* Cached Data Counters */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <div className="bg-white/90 rounded-xl p-2 border border-blue-100 text-center">
              <Calendar className="w-3.5 h-3.5 text-[#18458b] mx-auto mb-0.5" />
              <div className="text-[11px] font-black text-slate-900">{scheduleItems.length}</div>
              <div className="text-[9px] text-slate-500 font-semibold">Schedule</div>
            </div>
            <div className="bg-white/90 rounded-xl p-2 border border-blue-100 text-center">
              <GraduationCap className="w-3.5 h-3.5 text-emerald-600 mx-auto mb-0.5" />
              <div className="text-[11px] font-black text-slate-900">{grades.length}</div>
              <div className="text-[9px] text-slate-500 font-semibold">Grades & GPA</div>
            </div>
            <div className="bg-white/90 rounded-xl p-2 border border-blue-100 text-center">
              <MapPin className="w-3.5 h-3.5 text-amber-600 mx-auto mb-0.5" />
              <div className="text-[11px] font-black text-slate-900">3 Floors</div>
              <div className="text-[9px] text-slate-500 font-semibold">Campus Map</div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-blue-700/80">
              {lastSyncedAt
                ? `Saved: ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Ready to save'}
            </span>
            <button
              onClick={handleSaveOfflineBundle}
              className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-[#18458b] hover:bg-blue-900 text-white shadow-xs flex items-center gap-1 cursor-pointer"
            >
              {justCached ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Saved Schedule, Map & Grades!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Save Data for Offline</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Notifications list */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {RECENT_ANNOUNCEMENTS.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {item.type === 'scholarship' ? (
                    <Award className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  ) : (
                    <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  )}
                  <h4 className="text-xs font-bold text-slate-800">{item.title}</h4>
                </div>
                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                  {item.timestamp}
                </span>
              </div>

              <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
                {item.description}
              </p>

              {item.courseCode === 'CS101' && (
                <button
                  onClick={() => {
                    setIsNotificationsOpen(false);
                    navigateToClassroom('C1.1.320');
                  }}
                  className="mt-2 text-[10px] font-bold text-blue-700 hover:text-blue-900 bg-white border border-blue-200 px-2 py-1 rounded-md flex items-center gap-1 shadow-2xs"
                >
                  <MapPin className="w-3 h-3 text-blue-600" />
                  Show C1.1.320 on Map
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Close Button */}
        <div className="pt-3 border-t border-slate-100 mt-2">
          <button
            onClick={() => setIsNotificationsOpen(false)}
            className="w-full text-xs font-semibold py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            Dismiss All
          </button>
        </div>

      </div>
    </div>
  );
};
