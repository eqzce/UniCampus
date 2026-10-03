import React, { useState, useMemo } from 'react';
import { Header } from '../common/Header';
import { FloatingActionButton } from '../common/FloatingActionButton';
import { useApp } from '../../context/AppContext';
import { WEEKLY_SCHEDULE } from '../../data/mockData';
import type { ScheduleItem, AssessmentCategory } from '../../types';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  MapPin,
  X,
  ChevronUp,
  ChevronDown,
  Clock,
  BookOpen,
} from 'lucide-react';

const HOURS = ['09:00', '10:00', '11:00', '12:00', '1:00', '2:00', '3:00', '4:00'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;

export const ScheduleScreen: React.FC = () => {
  const { navigateToClassroom, assignments } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Requirement: Appears ONLY when clicked, initially null (unless specified in query for direct test)
  const [selectedClass, setSelectedClass] = useState<ScheduleItem | null>(() => {
    const classId = new URLSearchParams(window.location.search).get('class');
    if (classId) return WEEKLY_SCHEDULE.find((it) => it.id === classId) || null;
    return null;
  });
  
  // Requirement: Collapsible & Closeable
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return new URLSearchParams(window.location.search).get('collapsed') === '1';
  });

  // Filter schedule based on search query
  const filteredSchedule = WEEKLY_SCHEDULE.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.courseName.toLowerCase().includes(query) ||
      item.courseCode.toLowerCase().includes(query) ||
      item.professor.toLowerCase().includes(query) ||
      item.room.toLowerCase().includes(query)
    );
  });

  // Find course-specific deadlines (assignment, quiz, midterm, session)
  const classDeadlines = useMemo(() => {
    if (!selectedClass) return [];
    const baseCode = selectedClass.courseCode.split('-')[0].toLowerCase();
    const courseName = selectedClass.courseName.toLowerCase();

    return assignments.filter((asg) => {
      const asgCode = asg.courseCode.toLowerCase();
      const asgName = asg.courseName.toLowerCase();
      return (
        asgCode.includes(baseCode) ||
        baseCode.includes(asgCode) ||
        asgName.includes(courseName) ||
        courseName.includes(asgName)
      );
    });
  }, [selectedClass, assignments]);

  // Nearest deadline for collapsed view
  const nearestDeadline = useMemo(() => {
    if (classDeadlines.length === 0) return null;
    return [...classDeadlines].sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999))[0];
  }, [classDeadlines]);

  // Color mapping matching image mockup palette
  const getColorClasses = (color: ScheduleItem['color']) => {
    switch (color) {
      case 'orange':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'blue':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'purple':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'green':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'pink':
        return 'bg-rose-100 text-rose-900 border-rose-300';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-900 border-yellow-300';
      default:
        return 'bg-slate-100 text-slate-900 border-slate-300';
    }
  };

  const getCategoryBadge = (category: AssessmentCategory = 'assignment') => {
    switch (category) {
      case 'assignment':
        return { label: 'Assignment', classes: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'quiz':
        return { label: 'Quiz', classes: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'midterm':
        return { label: 'Midterm', classes: 'bg-amber-50 text-amber-800 border-amber-300 font-bold' };
      case 'final':
        return { label: 'Final Exam', classes: 'bg-rose-50 text-rose-700 border-rose-200 font-bold' };
      default:
        return { label: 'Deadline', classes: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  const handleClassClick = (item: ScheduleItem) => {
    setSelectedClass(item);
    setIsCollapsed(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f6fa] relative overflow-hidden select-none">
      {/* Header */}
      <Header title="SCHEDULE" />

      {/* Main Content Area: Timetable Grid */}
      <div className={`flex-1 overflow-y-auto px-3.5 py-3 space-y-3 ${selectedClass ? (isCollapsed ? 'pb-20' : 'pb-80') : 'pb-20'}`}>
        
        {/* Search bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by course or professor"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200/80 rounded-full pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#18458b]/20 shadow-2xs transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Week Navigator */}
        <div className="bg-white rounded-xl py-2 px-3 flex items-center justify-between shadow-2xs border border-slate-100">
          <button className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-slate-800 tracking-wide">
            October 26 - 31
          </span>
          <button className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Timetable Grid Container */}
        <div className="bg-white rounded-2xl p-2.5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 overflow-x-auto relative">
          
          {/* Header Row: Days */}
          <div className="grid grid-cols-[40px_repeat(5,1fr)] text-center border-b border-slate-100 pb-2 mb-1">
            <div className="text-[10px] font-semibold text-slate-400"></div>
            {DAYS.map((day) => (
              <div key={day} className="text-[11px] font-bold text-slate-600">
                {day}
              </div>
            ))}
          </div>

          {/* Grid Rows: Hours */}
          <div className="relative">
            {HOURS.map((hour, rowIndex) => (
              <div
                key={hour}
                className="grid grid-cols-[40px_repeat(5,1fr)] min-h-[38px] border-b border-slate-50 last:border-b-0 items-start"
              >
                {/* Time Label */}
                <span className="text-[10px] text-slate-400 font-medium pt-0.5">
                  {hour}
                </span>

                {/* Day Columns */}
                {DAYS.map((day) => {
                  const itemsInSlot = filteredSchedule.filter(
                    (it) => it.day === day && it.timeRowIndex === rowIndex
                  );

                  return (
                    <div
                      key={day}
                      className="border-l border-slate-100/70 min-h-[38px] p-0.5 relative"
                    >
                      {itemsInSlot.map((item) => {
                        const isSelected = selectedClass?.id === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleClassClick(item)}
                            className={`w-full min-h-[46px] rounded-md p-1 text-left transition-all border flex flex-col justify-start ${getColorClasses(
                              item.color
                            )} ${
                              isSelected
                                ? 'ring-2 ring-[#18458b] shadow-sm font-semibold scale-[1.02] z-10'
                                : 'opacity-90 hover:opacity-100'
                            }`}
                          >
                            {/* Requirement: NO 'CURRENT CLASS' badge anywhere! */}
                            <div className="text-[9px] font-bold leading-tight truncate">
                              {item.startTime}
                            </div>
                            <div className="text-[9px] font-semibold leading-tight break-words">
                              {item.courseName}
                            </div>
                            {item.room && (
                              <div className="text-[8px] opacity-80 leading-none truncate mt-auto pt-0.5">
                                {item.room.replace('Room ', '')}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

        </div>

      </div>

      {/* Requirement: Docked to main interface (fixed bottom), collapsible and closeable! */}
      {selectedClass && (
        <div
          className={`absolute bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200/90 shadow-[0_-10px_25px_rgba(0,0,0,0.12)] rounded-t-3xl transition-all duration-200 animate-in slide-in-from-bottom flex flex-col ${
            isCollapsed ? 'max-h-[60px]' : 'max-h-[82%]'
          }`}
        >
          {/* Top Header Handle & Controls Bar */}
          <div
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="px-4 py-2.5 flex items-center justify-between cursor-pointer border-b border-slate-100 select-none bg-slate-50/70 rounded-t-3xl"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] font-bold tracking-wider uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full shrink-0">
                Selected Class
              </span>
              <span className="text-xs font-bold text-slate-800 truncate">
                {selectedClass.startTime} - {selectedClass.courseName}
              </span>
              {isCollapsed && nearestDeadline && (
                <span className="hidden sm:inline-block text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md truncate">
                  {nearestDeadline.title} ({nearestDeadline.daysLeft === 0 ? 'Today' : `${nearestDeadline.daysLeft}d`})
                </span>
              )}
            </div>

            {/* Action Buttons: Collapse/Expand and Close */}
            <div className="flex items-center gap-1 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors"
                title={isCollapsed ? 'Expand class details' : 'Collapse'}
                aria-label={isCollapsed ? 'Expand details' : 'Collapse details'}
              >
                {isCollapsed ? (
                  <ChevronUp className="w-4 h-4 stroke-[2.5]" />
                ) : (
                  <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                )}
              </button>

              <button
                onClick={() => setSelectedClass(null)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
                title="Close"
                aria-label="Close selected class"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Expanded Content Body */}
          {!isCollapsed && (
            <div className="p-4 overflow-y-auto space-y-3.5">
              
              {/* Classroom & Instructor Details */}
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 leading-tight">
                      {selectedClass.courseName}
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                      <span className="text-slate-400">Classroom:</span>
                      <span className="font-bold text-[#18458b] bg-white px-2 py-0.5 rounded-md border border-slate-200/70">
                        {selectedClass.room}
                      </span>
                      <span className="text-slate-500">({selectedClass.building})</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Instructor: <span className="font-medium text-slate-700">{selectedClass.professor}</span>
                    </p>
                  </div>

                  <span className="text-xs font-bold text-slate-700 bg-white px-2 py-1 rounded-lg border border-slate-200/70 shadow-2xs">
                    {selectedClass.day} · {selectedClass.startTime} - {selectedClass.endTime}
                  </span>
                </div>
              </div>

              {/* Requirement: Deadlines Information (assignment, quiz, midterm, session) */}
              <div>
                <div className="flex items-center justify-between mb-2 px-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>Course Deadlines ({classDeadlines.length})</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Assignments · Quizzes · Midterms · Finals
                  </span>
                </div>

                {classDeadlines.length > 0 ? (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
                    {classDeadlines.map((dl) => {
                      const cat = getCategoryBadge(dl.category);
                      return (
                        <div
                          key={dl.id}
                          className="flex items-center justify-between bg-white hover:bg-blue-50/40 rounded-xl p-2.5 border border-slate-200/80 shadow-2xs transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <span
                              className={`text-[9.5px] px-2 py-0.5 rounded-full border shrink-0 ${cat.classes}`}
                            >
                              {cat.label}
                            </span>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 text-xs truncate">
                                {dl.title}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {dl.dueFormatted || dl.dueDate}
                                {dl.weight && ` · Weight: ${dl.weight}`}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={`text-[11px] font-bold ${
                                dl.daysLeft === 0
                                  ? 'text-amber-600'
                                  : dl.daysLeft === 1
                                  ? 'text-emerald-600'
                                  : dl.daysLeft !== undefined && dl.daysLeft < 7
                                  ? 'text-blue-700'
                                  : 'text-slate-600'
                              }`}
                            >
                              {dl.daysLeft === 0
                                ? 'Today'
                                : dl.daysLeft === 1
                                ? 'Tomorrow'
                                : dl.daysLeft !== undefined
                                ? `${dl.daysLeft}d left`
                                : dl.dueDate}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100 text-xs text-slate-400">
                    <BookOpen className="w-4 h-4 mx-auto mb-1 text-slate-300" />
                    No upcoming deadlines scheduled for this course
                  </div>
                )}
              </div>

              {/* Action Buttons: Show on Map */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                <button
                  onClick={() => navigateToClassroom(selectedClass.room)}
                  className="w-full bg-[#18458b] hover:bg-[#14366d] active:scale-98 text-white text-xs font-bold py-2.5 px-6 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all"
                >
                  <MapPin className="w-4 h-4 text-sky-300" />
                  <span>Show on Map</span>
                </button>
              </div>

            </div>
          )}
        </div>
      )}

      {/* Floating Action Button (hidden when selected class sheet is active to avoid overlap) */}
      {!selectedClass && <FloatingActionButton />}
    </div>
  );
};
