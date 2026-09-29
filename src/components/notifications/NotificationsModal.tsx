import React from 'react';
import { useApp } from '../../context/AppContext';
import { RECENT_ANNOUNCEMENTS } from '../../data/mockData';
import { Bell, X, Calendar, Award, Download, MapPin } from 'lucide-react';

export const NotificationsModal: React.FC = () => {
  const {
    isNotificationsOpen,
    setIsNotificationsOpen,
    navigateToClassroom,
    isOfflineMode,
    setIsOfflineMode,
  } = useApp();

  if (!isNotificationsOpen) return null;

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
              <h3 className="text-sm font-bold text-slate-900">Notifications & Alerts</h3>
              <p className="text-[10px] text-slate-400">Schedule changes & academic alerts</p>
            </div>
          </div>
          <button
            onClick={() => setIsNotificationsOpen(false)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Offline Cache Box (as requested in Assignment 3 CustDev) */}
        <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-3 mb-3 text-xs text-blue-900 flex items-center justify-between">
          <div>
            <div className="font-bold flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-blue-700" />
              Offline Schedule & Map
            </div>
            <p className="text-[10px] text-blue-700/80 mt-0.5">
              {isOfflineMode ? 'Saved for offline use' : 'Ready to cache on device'}
            </p>
          </div>

          <button
            onClick={() => setIsOfflineMode(!isOfflineMode)}
            className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all ${
              isOfflineMode
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-[#18458b] text-white hover:bg-blue-800'
            }`}
          >
            {isOfflineMode ? 'Cached ✓' : 'Cache Now'}
          </button>
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
                    navigateToClassroom('Room 301');
                  }}
                  className="mt-2 text-[10px] font-bold text-blue-700 hover:text-blue-900 bg-white border border-blue-200 px-2 py-1 rounded-md flex items-center gap-1 shadow-2xs"
                >
                  <MapPin className="w-3 h-3 text-blue-600" />
                  Show Room 301 on Map
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
