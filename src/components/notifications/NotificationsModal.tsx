import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { Announcement } from '../../types';
import {
  Bell,
  X,
  Calendar,
  Award,
  Download,
  MapPin,
  CheckCircle2,
  GraduationCap,
  CheckCheck,
  Clock,
} from 'lucide-react';

type NotificationFilter = 'all' | 'unread' | Announcement['type'];

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
    announcements,
    unreadAnnouncementsCount,
    markAnnouncementRead,
    markAllAnnouncementsRead,
  } = useApp();

  const [justCached, setJustCached] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>('all');

  const filteredAnnouncements = useMemo(() => {
    if (filter === 'all') return announcements;
    if (filter === 'unread') return announcements.filter((a) => a.unread);
    return announcements.filter((a) => a.type === filter);
  }, [announcements, filter]);

  if (!isNotificationsOpen) return null;

  const handleSaveOfflineBundle = () => {
    saveAllForOffline();
    setJustCached(true);
    setTimeout(() => setJustCached(false), 2500);
  };

  const filterOptions: { id: NotificationFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: `Unread (${unreadAnnouncementsCount})` },
    { id: 'schedule_change', label: 'Schedule' },
    { id: 'deadline', label: 'Deadlines' },
    { id: 'scholarship', label: 'Scholarship' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-5 border border-slate-100 flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Notifications & Offline Mode</h3>
              <p className="text-[10px] text-slate-400">
                Live Alerts & Offline Snapshot ({unreadAnnouncementsCount} unread)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {unreadAnnouncementsCount > 0 && (
              <button
                onClick={() => markAllAnnouncementsRead()}
                className="text-[10px] font-bold text-[#18458b] hover:bg-blue-50 px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Read All</span>
              </button>
            )}
            <button
              onClick={() => setIsNotificationsOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1"
              aria-label="Close notifications"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
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
                ? `Saved: ${new Date(lastSyncedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`
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

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-1 no-scrollbar">
          {filterOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setFilter(opt.id)}
              className={`px-2.5 py-1 rounded-full text-[10.5px] font-semibold whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                filter === opt.id
                  ? 'bg-[#18458b] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Live Announcements List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {filteredAnnouncements.map((item) => {
            const targetRoom = item.room || (item.courseCode === 'CS101' ? 'C1.1.320' : null);
            return (
              <div
                key={item.id}
                onClick={() => item.unread && markAnnouncementRead(item.id, false)}
                className={`p-3 rounded-2xl border transition-colors cursor-pointer ${
                  item.unread
                    ? 'border-blue-200 bg-blue-50/40'
                    : 'border-slate-100 bg-slate-50/60 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {item.unread && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                    )}
                    {item.type === 'scholarship' ? (
                      <Award className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    ) : item.type === 'deadline' ? (
                      <Clock className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    ) : (
                      <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    )}
                    <h4 className="text-xs font-bold text-slate-800 truncate">{item.title}</h4>
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">
                    {item.timestamp}
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
                  {item.description}
                </p>

                <div className="mt-2 flex items-center justify-between gap-2">
                  {targetRoom ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAnnouncementRead(item.id, false);
                        setIsNotificationsOpen(false);
                        navigateToClassroom(targetRoom);
                      }}
                      className="text-[10px] font-bold text-blue-700 hover:text-blue-900 bg-white border border-blue-200 px-2 py-1 rounded-md flex items-center gap-1 shadow-2xs cursor-pointer"
                    >
                      <MapPin className="w-3 h-3 text-blue-600" />
                      Show {targetRoom} on Map
                    </button>
                  ) : (
                    <span className="text-[9.5px] uppercase font-bold text-slate-400">
                      {item.type.replace('_', ' ')}
                    </span>
                  )}

                  {item.unread && (
                    <span className="text-[9.5px] font-bold text-blue-600">Tap to mark read</span>
                  )}
                </div>
              </div>
            );
          })}

          {filteredAnnouncements.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-6">
              No notifications in this category.
            </p>
          )}
        </div>

        {/* Close Button */}
        <div className="pt-3 border-t border-slate-100 mt-2">
          <button
            onClick={() => setIsNotificationsOpen(false)}
            className="w-full text-xs font-semibold py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
