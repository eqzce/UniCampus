import React, { useState, useMemo } from 'react';
import { Header } from '../common/Header';
import { FloatingActionButton } from '../common/FloatingActionButton';
import { useApp } from '../../context/AppContext';
import type { ScheduleItem, AssessmentCategory } from '../../types';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  ChevronUp,
  ChevronDown,
  Clock,
  ArrowRight,
  BookOpen,
  Plus,
  Trash2,
  RotateCcw,
} from 'lucide-react';

const HOURS = ['09:00', '10:00', '11:00', '12:00', '1:00', '2:00', '3:00', '4:00'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;

export const ScheduleScreen: React.FC = () => {
  const {
    navigateToClassroom,
    assignments,
    scheduleItems,
    setIsAddScheduleOpen,
    addHomeworkForCourse,
    removeScheduleItem,
    clearAllSchedule,
    resetDefaultSchedule,
    setActiveTab,
    setSelectedCourseFilter,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  
  // Requirement: Appears ONLY when clicked, initially null (supports ?class= for testing)
  const [selectedClass, setSelectedClass] = useState<ScheduleItem | null>(() => {
    const classId = new URLSearchParams(window.location.search).get('class');
    if (classId) return scheduleItems.find((it) => it.id === classId) || null;
    return null;
  });
  
  // Requirement: Collapsible & Closeable
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return new URLSearchParams(window.location.search).get('collapsed') === '1';
  });

  // State to toggle additional deadlines ("Show more")
  const [showMoreDeadlines, setShowMoreDeadlines] = useState(false);

  // Quick inline homework input inside selected class sheet
  const [isAddingHwInline, setIsAddingHwInline] = useState(false);
  const [inlineHwTitle, setInlineHwTitle] = useState('');

  // Filter schedule based on search query
  const filteredSchedule = scheduleItems.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.courseName.toLowerCase().includes(query) ||
      item.courseCode.toLowerCase().includes(query) ||
      item.professor.toLowerCase().includes(query) ||
      item.room.toLowerCase().includes(query)
    );
  });

  // Find course-specific deadlines sorted by urgency
  const classDeadlines = useMemo(() => {
    if (!selectedClass) return [];
    const baseCode = selectedClass.courseCode.split('-')[0].toLowerCase();
    const courseName = selectedClass.courseName.toLowerCase();

    return assignments
      .filter((asg) => {
        const asgCode = asg.courseCode.toLowerCase();
        const asgName = asg.courseName.toLowerCase();
        return (
          asgCode.includes(baseCode) ||
          baseCode.includes(asgCode) ||
          asgName.includes(courseName) ||
          courseName.includes(asgName)
        );
      })
      .sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999));
  }, [selectedClass, assignments]);

  // Primary deadline (today's / nearest deadline)
  const primaryDeadline = classDeadlines[0] || null;
  const additionalDeadlines = classDeadlines.slice(1);

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
    setShowMoreDeadlines(false);
    setIsAddingHwInline(false);
    setInlineHwTitle('');
  };

  const handleDeleteClass = (id: string) => {
    removeScheduleItem(id);
    if (selectedClass?.id === id) {
      setSelectedClass(null);
    }
  };

  const handleSaveInlineHomework = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !inlineHwTitle.trim()) return;
    addHomeworkForCourse(
      selectedClass.courseName,
      selectedClass.courseCode.split('-')[0],
      inlineHwTitle.trim(),
      'Tomorrow',
      1
    );
    setInlineHwTitle('');
    setIsAddingHwInline(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f6fa] relative overflow-hidden select-none">
      {/* Header */}
      <Header title="SCHEDULE" />

      {/* Main Content Area: Timetable Grid */}
      <div
        className={`flex-1 overflow-y-auto px-3.5 py-3 space-y-2.5 ${
          selectedClass ? (isCollapsed ? 'pb-20' : 'pb-60') : 'pb-20'
        }`}
      >
        {/* Search bar + Add Class Button (single + icon) */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search course, room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200/80 rounded-full pl-9 pr-7 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#18458b]/20 shadow-2xs transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setIsAddScheduleOpen(true)}
            className="flex items-center gap-1.5 bg-[#18458b] hover:bg-[#14366d] active:scale-95 text-white text-xs font-bold px-3.5 py-2 rounded-full shadow-sm transition-all shrink-0 cursor-pointer"
            title="Add custom course, classroom & homework"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Class</span>
          </button>
        </div>

        {/* Week Navigator + Clear/Reset Schedule controls */}
        <div className="bg-white rounded-xl py-2 px-3 flex items-center justify-between shadow-2xs border border-slate-100">
          <div className="flex items-center gap-1">
            <button className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-800 tracking-wide">
              October 26 - 31
            </span>
            <button className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {scheduleItems.length > 0 ? (
            <button
              onClick={() => {
                setSelectedClass(null);
                clearAllSchedule();
              }}
              className="text-[10.5px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/80 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              title="Remove all default classes to build your own schedule"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear All</span>
            </button>
          ) : (
            <button
              onClick={resetDefaultSchedule}
              className="text-[10.5px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/80 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              title="Restore default template schedule"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restore Defaults</span>
            </button>
          )}
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
                      className="border-l border-slate-100/70 min-h-[38px] p-0.5 relative flex flex-col gap-0.5"
                    >
                      {itemsInSlot.map((item) => {
                        const isSelected = selectedClass?.id === item.id;
                        return (
                          <div
                            key={item.id}
                            onClick={() => handleClassClick(item)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') handleClassClick(item);
                            }}
                            className={`group relative w-full min-h-[46px] rounded-md p-1 text-left transition-all border flex flex-col justify-start cursor-pointer ${getColorClasses(
                              item.color
                            )} ${
                              isSelected
                                ? 'ring-2 ring-[#18458b] shadow-sm font-semibold scale-[1.02] z-10'
                                : 'opacity-90 hover:opacity-100'
                            }`}
                          >
                            {/* Quick Delete button on class tile */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClass(item.id);
                              }}
                              title="Remove class from schedule"
                              className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-black/10 hover:bg-rose-500 hover:text-white text-current flex items-center justify-center opacity-70 hover:opacity-100 transition-all"
                            >
                              <X className="w-2.5 h-2.5 stroke-[2.5]" />
                            </button>

                            <div className="text-[9px] font-bold leading-tight truncate pr-3">
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
                          </div>
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

      {/* Requirement: Compact, non-overloaded docked panel */}
      {selectedClass && (
        <div
          className={`absolute bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200/90 shadow-[0_-10px_25px_rgba(0,0,0,0.12)] rounded-t-3xl transition-all duration-200 animate-in slide-in-from-bottom flex flex-col ${
            isCollapsed ? 'max-h-[56px]' : 'max-h-[78%]'
          }`}
        >
          {/* Top Header Bar */}
          <div
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="px-4 py-2.5 flex items-center justify-between cursor-pointer border-b border-slate-100 select-none bg-slate-50/70 rounded-t-3xl"
          >
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-sm font-bold text-slate-900 truncate">
                {selectedClass.courseName}
              </h3>
              {isCollapsed && primaryDeadline && (
                <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md truncate ml-1">
                  {primaryDeadline.title} ({primaryDeadline.daysLeft === 0 ? 'Today' : `${primaryDeadline.daysLeft}d`})
                </span>
              )}
            </div>

            {/* Action Buttons: Delete ANY class (default or custom), Collapse/Expand and Close */}
            <div className="flex items-center gap-1 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => handleDeleteClass(selectedClass.id)}
                className="px-2 h-7 rounded-lg text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 flex items-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer"
                title="Remove this class from schedule"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>

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

          {/* Clean, Non-overloaded Content Body */}
          {!isCollapsed && (
            <div className="p-3.5 overflow-y-auto space-y-3">
              
              {/* Classroom & Instructor Row */}
              <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                {/* Clickable Blue Classroom Button with Arrow redirecting to Map */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-slate-400 font-medium">Classroom:</span>
                  <button
                    onClick={() => navigateToClassroom(selectedClass.room)}
                    className="inline-flex items-center gap-1 bg-[#18458b] hover:bg-[#14366d] active:scale-95 text-white font-bold text-xs px-2.5 py-1 rounded-lg shadow-xs transition-all cursor-pointer group"
                    title="Open on map"
                  >
                    <span>{selectedClass.room}</span>
                    <ArrowRight className="w-3.5 h-3.5 stroke-[2.5] group-hover:translate-x-0.5 transition-transform" />
                  </button>
                  <span className="text-slate-500 font-normal">({selectedClass.building || 'Main Campus'})</span>
                </div>

                <div className="text-[11px] text-slate-500">
                  Instructor: <span className="font-medium text-slate-700">{selectedClass.professor}</span>
                </div>
              </div>

              {/* Deadlines / Homework Section + 'Add Homework' button */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>Homework / Deadlines</span>
                  </div>
                  <button
                    onClick={() => setIsAddingHwInline(!isAddingHwInline)}
                    className="text-[11px] font-bold text-[#18458b] hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-lg cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Homework</span>
                  </button>
                </div>

                {isAddingHwInline && (
                  <form onSubmit={handleSaveInlineHomework} className="mb-2 flex items-center gap-1.5">
                    <input
                      type="text"
                      value={inlineHwTitle}
                      onChange={(e) => setInlineHwTitle(e.target.value)}
                      placeholder="Enter homework task..."
                      className="flex-1 text-xs border border-blue-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#18458b]/20"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="bg-[#18458b] text-white text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-blue-800 shrink-0"
                    >
                      Save
                    </button>
                  </form>
                )}

                {primaryDeadline ? (
                  <div className="space-y-2">
                    {/* Primary deadline card */}
                    <div className="flex items-center justify-between bg-slate-50 hover:bg-blue-50/40 rounded-xl p-2.5 border border-slate-200/80 transition-colors">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span
                          className={`text-[9.5px] px-2 py-0.5 rounded-full border shrink-0 ${
                            getCategoryBadge(primaryDeadline.category).classes
                          }`}
                        >
                          {getCategoryBadge(primaryDeadline.category).label}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-xs truncate">
                            {primaryDeadline.title}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {primaryDeadline.dueFormatted || primaryDeadline.dueDate}
                            {primaryDeadline.weight && ` · Weight: ${primaryDeadline.weight}`}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`text-[11px] font-bold ${
                            primaryDeadline.daysLeft === 0
                              ? 'text-amber-600'
                              : primaryDeadline.daysLeft === 1
                              ? 'text-emerald-600'
                              : 'text-blue-700'
                          }`}
                        >
                          {primaryDeadline.daysLeft === 0
                            ? 'Today'
                            : primaryDeadline.daysLeft === 1
                            ? 'Tomorrow'
                            : `${primaryDeadline.daysLeft}d left`}
                        </span>
                      </div>
                    </div>

                    {/* Show more toggle button */}
                    {additionalDeadlines.length > 0 && !showMoreDeadlines && (
                      <button
                        onClick={() => setShowMoreDeadlines(true)}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 py-0.5 cursor-pointer transition-colors"
                      >
                        <span>Show more ({additionalDeadlines.length} more)</span>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Expanded additional deadlines */}
                    {showMoreDeadlines && (
                      <div className="space-y-1.5 pt-1 animate-in fade-in duration-150">
                        {additionalDeadlines.map((dl) => {
                          const cat = getCategoryBadge(dl.category);
                          return (
                            <div
                              key={dl.id}
                              className="flex items-center justify-between bg-white rounded-xl p-2 border border-slate-200/70 shadow-2xs text-xs"
                            >
                              <div className="flex items-center gap-1.5 min-w-0 pr-2">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full border shrink-0 ${cat.classes}`}>
                                  {cat.label}
                                </span>
                                <span className="font-medium text-slate-800 text-[11px] truncate">
                                  {dl.title}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-semibold shrink-0">
                                {dl.dueDate}
                              </span>
                            </div>
                          );
                        })}

                        <div className="flex items-center justify-between pt-1">
                          <button
                            onClick={() => setShowMoreDeadlines(false)}
                            className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-0.5 cursor-pointer"
                          >
                            <span>Show less</span>
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setActiveTab('grades');
                              setSelectedCourseFilter(selectedClass.courseCode.split('-')[0]);
                            }}
                            className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 cursor-pointer"
                          >
                            <span>Open in Grades →</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-xl p-2.5 text-center border border-slate-100 text-xs text-slate-400">
                    <BookOpen className="w-3.5 h-3.5 mx-auto mb-1 text-slate-300" />
                    No upcoming deadlines — click "Add Homework" above
                  </div>
                )}
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
