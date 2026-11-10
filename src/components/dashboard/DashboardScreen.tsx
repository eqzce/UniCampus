import React, { useMemo, useState } from 'react';
import { Header } from '../common/Header';
import { FloatingActionButton } from '../common/FloatingActionButton';
import { useApp } from '../../context/AppContext';
import { RECENT_ANNOUNCEMENTS } from '../../data/mockData';
import {
  MapPin,
  ArrowRight,
  Sparkles,
  Award,
  UserCheck,
  Download,
  CheckCircle2,
  Eye,
} from 'lucide-react';

export const DashboardScreen: React.FC = () => {
  const {
    navigateToClassroom,
    setActiveTab,
    setIsAIAssistantOpen,
    isOfflineMode,
    saveAllForOffline,
    scheduleItems,
    assignments,
    student,
    attendance,
    grades,
  } = useApp();

  const [offlineSavedBanner, setOfflineSavedBanner] = useState(false);

  // Derive Today's Schedule directly from scheduleItems so deleting/adding classes updates Dashboard too
  const todayClassesList = useMemo(() => {
    const customFirst = [
      ...scheduleItems.filter((s) => s.id.startsWith('sched-custom-')),
      ...scheduleItems.filter((s) => !s.id.startsWith('sched-custom-')),
    ];
    return customFirst.slice(0, 4);
  }, [scheduleItems]);

  // Derive Upcoming Deadlines directly from active assignments
  const upcomingDeadlinesList = useMemo(() => {
    return assignments
      .filter((a) => a.status === 'todo')
      .sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999))
      .slice(0, 4)
      .map((a) => ({
        id: a.id,
        title: a.title,
        dueText:
          a.daysLeft === 0
            ? 'Today'
            : a.daysLeft === 1
            ? 'Tomorrow'
            : `${a.daysLeft ?? 2} Days Left`,
        color: a.daysLeft !== undefined && a.daysLeft <= 1 ? '#10b981' : '#ef4444',
      }));
  }, [assignments]);

  // Compute live Attendance percentage from backend attendance records
  const attendanceStats = useMemo(() => {
    if (!attendance || attendance.length === 0) {
      return { rate: 95, present: 18, late: 1, absent: 0 };
    }
    const present = attendance.filter((a) => a.status === 'present').length;
    const late = attendance.filter((a) => a.status === 'late').length;
    const absent = attendance.filter((a) => a.status === 'absent').length;
    const total = attendance.length;
    const rate = Math.round(((present + late * 0.5) / total) * 100);
    return { rate, present, late, absent };
  }, [attendance]);

  const handleQuickSaveOffline = () => {
    saveAllForOffline();
    setOfflineSavedBanner(true);
    setTimeout(() => setOfflineSavedBanner(false), 2500);
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f6fa] relative overflow-hidden select-none">
      {/* Header */}
      <Header title="DASHBOARD" />

      {/* Scrollable Content Container */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5 pb-20">
        
        {/* Offline & AI Quick Banner */}
        <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100/70 rounded-xl px-3 py-2 text-xs text-blue-900">
          <div className="flex items-center gap-1.5 font-medium">
            <span
              className={`w-2 h-2 rounded-full animate-pulse ${
                isOfflineMode ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
            ></span>
            <span>
              {isOfflineMode
                ? 'Offline Mode (Schedule, Map & Grades Saved)'
                : 'Synced with University Portal'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleQuickSaveOffline}
              title="Save Schedule, Map & Grades for Offline Access"
              className="flex items-center gap-1 text-[10.5px] font-semibold text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200/80 px-2 py-1 rounded-md transition-colors cursor-pointer"
            >
              {offlineSavedBanner ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Download className="w-3 h-3 text-emerald-700" />
                  <span>Offline</span>
                </>
              )}
            </button>
            <button
              onClick={() => setIsAIAssistantOpen(true)}
              className="flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 bg-white/80 px-2 py-1 rounded-md shadow-2xs hover:bg-white cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              AI Advising
            </button>
          </div>
        </div>

        {/* Live Student GPA, Attendance & Latest Feedback Summary Strip */}
        <div className="grid grid-cols-2 gap-2.5">
          <div
            onClick={() => setActiveTab('grades')}
            className="bg-white rounded-2xl p-3 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 flex items-center justify-between cursor-pointer hover:border-blue-200 transition-colors"
          >
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Dynamic GPA
              </span>
              <span className="text-base font-black text-slate-900">
                {student.gpa.toFixed(2)}
                <span className="text-[10px] font-normal text-slate-400"> / 4.00</span>
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold block">
                {grades.length} Graded Items
              </span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>

          <div
            onClick={() => setActiveTab('grades')}
            className="bg-white rounded-2xl p-3 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 flex items-center justify-between cursor-pointer hover:border-blue-200 transition-colors"
          >
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Attendance
              </span>
              <span className="text-base font-black text-slate-900">{attendanceStats.rate}%</span>
              <span className="text-[10px] text-slate-500 font-medium block">
                {attendanceStats.present}P · {attendanceStats.late}L · {attendanceStats.absent}A
              </span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* 1. Today's Schedule Card (Read-Only for Student) */}
        <div className="bg-white rounded-2xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-bold text-slate-800">
                Today's Schedule
              </h3>
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Eye className="w-2.5 h-2.5" />
                <span>View Only</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('schedule')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 cursor-pointer"
              >
                Full week <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {todayClassesList.length > 0 ? (
            <div className="space-y-2.5">
              {todayClassesList.map((cls) => (
                <div
                  key={cls.id}
                  className={`relative rounded-xl p-3 transition-all ${
                    cls.isCurrent
                      ? 'bg-emerald-50/70 border-l-4 border-[#10b981] shadow-2xs'
                      : 'bg-slate-50/80 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-800">
                          {cls.startTime} - {cls.courseName}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200/70">
                          {cls.day}
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

                    <div className="flex items-center gap-1.5 self-center shrink-0">
                      <button
                        onClick={() => navigateToClassroom(cls.room)}
                        className="text-[11px] font-semibold text-[#18458b] bg-white border border-blue-100 px-2.5 py-1.5 rounded-lg shadow-2xs hover:bg-blue-50 transition-all cursor-pointer"
                      >
                        Map
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-400">
              No classes scheduled for your group yet.
            </div>
          )}
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
            {upcomingDeadlinesList.map((item) => (
              <div
                key={item.id}
                onClick={() => setActiveTab('assignments')}
                className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50 last:border-b-0 cursor-pointer hover:bg-slate-50/60 rounded px-1 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  ></span>
                  <span className="font-medium text-slate-700 truncate">{item.title}</span>
                </div>
                <span className="text-slate-500 font-semibold text-[11px] shrink-0">
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
