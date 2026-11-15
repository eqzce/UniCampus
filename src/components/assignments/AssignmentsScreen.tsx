import React, { useMemo, useState } from 'react';
import { Header } from '../common/Header';
import { useApp } from '../../context/AppContext';
import { COURSES_LIST } from '../../data/mockData';
import type { Assignment, AssignmentStatus, AssessmentCategory } from '../../types';
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  FileEdit,
  Clock,
  Sparkles,
} from 'lucide-react';

export const AssignmentsScreen: React.FC = () => {
  const {
    assignments,
    assignmentFilter,
    setAssignmentFilter,
    selectedCourseFilter,
    setSelectedCourseFilter,
    toggleAssignmentStatus,
    addPersonalNote,
    courses,
    currentUser,
  } = useApp();

  const [activeNoteModalFor, setActiveNoteModalFor] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [sortBy, setSortBy] = useState<'deadline' | 'course' | 'type' | 'status'>('deadline');

  const allCourses = useMemo(() => {
    const map = new Map(COURSES_LIST.map((c) => [c.code, c]));
    for (const c of courses) {
      if (!map.has(c.code)) {
        map.set(c.code, {
          code: c.code,
          name: c.title,
          shortName: c.title.slice(0, 14),
        });
      }
    }
    const base = Array.from(map.values());
    if (currentUser?.role === 'student' && currentUser.enrolled_course_ids?.length) {
      const enrolledCodes = new Set(
        courses
          .filter((c) => currentUser.enrolled_course_ids?.includes(c.id))
          .map((c) => c.code)
      );
      if (enrolledCodes.size > 0) {
        return base.filter((c) => enrolledCodes.has(c.code));
      }
    }
    for (const asg of assignments) {
      if (!map.has(asg.courseCode)) {
        base.push({
          code: asg.courseCode,
          name: asg.courseName,
          shortName: asg.courseName.slice(0, 14),
        });
      }
    }
    return base;
  }, [courses, assignments, currentUser]);

  const filterTabs: { id: 'all' | AssignmentStatus; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'todo', label: 'To-Do' },
    { id: 'submitted', label: 'Submitted' },
    { id: 'graded', label: 'Graded' },
  ];

  const getCategoryBadge = (category: AssessmentCategory = 'assignment') => {
    switch (category) {
      case 'assignment':
        return {
          label: 'Assignment',
          classes: 'bg-blue-50 text-blue-700 border-blue-200/80',
        };
      case 'quiz':
        return {
          label: 'Quiz',
          classes: 'bg-purple-50 text-purple-700 border-purple-200/80',
        };
      case 'midterm':
        return {
          label: 'Midterm',
          classes: 'bg-amber-50 text-amber-800 border-amber-300/80 font-bold',
        };
      case 'final':
        return {
          label: 'Final Exam',
          classes: 'bg-rose-50 text-rose-700 border-rose-200/80 font-bold',
        };
      default:
        return {
          label: 'Task',
          classes: 'bg-slate-50 text-slate-700 border-slate-200',
        };
    }
  };

  const filteredAssessments = assignments
    .filter((item) => {
      if (selectedCourseFilter !== 'all' && item.courseCode !== selectedCourseFilter) {
        return false;
      }
      if (assignmentFilter === 'all') return true;
      return item.status === assignmentFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'deadline') {
        return (a.daysLeft ?? 999) - (b.daysLeft ?? 999);
      }
      if (sortBy === 'course') {
        return a.courseCode.localeCompare(b.courseCode);
      }
      if (sortBy === 'status') {
        const order: Record<string, number> = { todo: 0, submitted: 1, graded: 2 };
        return (order[a.status] ?? 9) - (order[b.status] ?? 9);
      }
      return (a.category ?? '').localeCompare(b.category ?? '');
    });

  const handleOpenNoteModal = (item: Assignment) => {
    setActiveNoteModalFor(item.id);
    setNoteInput(item.personalNote || '');
  };

  const handleSaveNote = () => {
    if (activeNoteModalFor) {
      addPersonalNote(activeNoteModalFor, noteInput);
      setActiveNoteModalFor(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f6fa] relative overflow-hidden select-none">
      <Header title="TASKS" />

      <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3 pb-20">
        {/* Course Selector Chips */}
        <div>
          <div className="flex items-center justify-between mb-1.5 px-0.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Filter by Course
            </span>
            {selectedCourseFilter !== 'all' && (
              <button
                onClick={() => setSelectedCourseFilter('all')}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
              >
                Clear filter
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCourseFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                selectedCourseFilter === 'all'
                  ? 'bg-[#18458b] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <span>All Courses</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  selectedCourseFilter === 'all'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {assignments.length}
              </span>
            </button>

            {allCourses.map((course) => {
              const isSelected = selectedCourseFilter === course.code;
              const count = assignments.filter((a) => a.courseCode === course.code).length;

              return (
                <button
                  key={course.code}
                  onClick={() => setSelectedCourseFilter(course.code)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                    isSelected
                      ? 'bg-[#18458b] text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                  }`}
                >
                  <span>{course.shortName}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Status Filter Tabs (All, To-Do, Submitted, Graded) */}
        <div className="bg-slate-200/70 p-1 rounded-full flex items-center justify-between">
          {filterTabs.map((tab) => {
            const isActive = assignmentFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setAssignmentFilter(tab.id)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-full transition-all text-center ${
                  isActive
                    ? 'bg-[#18458b] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Action Bar: Expanded Task Sort Dropdown */}
        <div className="bg-white rounded-xl border border-slate-200/80 px-3 py-2 flex items-center justify-between gap-3 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
            Sort Tasks
          </span>
          <div className="relative flex-1">
            <select
              aria-label="Sort tasks by"
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as 'deadline' | 'course' | 'type' | 'status')
              }
              className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 pr-8 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#18458b]/20 cursor-pointer"
            >
              <option value="deadline">Sort by Deadline (Soonest first)</option>
              <option value="course">Sort by Course (A–Z)</option>
              <option value="type">Sort by Type (Assignment / Quiz / Exam)</option>
              <option value="status">Sort by Status (To-Do first)</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* 2-Column Tasks Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {filteredAssessments.map((asg) => {
            const isCompleted = asg.status === 'submitted' || asg.status === 'graded';
            const catBadge = getCategoryBadge(asg.category);

            return (
              <div
                key={asg.id}
                className="bg-white rounded-2xl p-3 shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow relative group"
              >
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className={`text-[9.5px] px-2 py-0.5 rounded-full border ${catBadge.classes}`}>
                    {catBadge.label}
                  </span>
                  <span
                    className={`text-[9px] font-bold uppercase ${
                      asg.status === 'graded'
                        ? 'text-emerald-600'
                        : asg.status === 'submitted'
                          ? 'text-blue-600'
                          : 'text-amber-600'
                    }`}
                  >
                    {asg.status}
                  </span>
                </div>

                <h4 className="text-[12.5px] font-bold text-slate-900 leading-snug line-clamp-2 mb-1">
                  {asg.title}
                </h4>

                <p className="text-[10.5px] text-slate-500 font-medium mb-2 truncate">
                  {asg.courseCode} · {asg.courseName}
                </p>

                <div className="mb-2 flex items-center gap-1 bg-slate-50 rounded-lg p-1.5 border border-slate-100">
                  <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                  <div className="text-[10px] leading-tight text-slate-600 truncate">
                    {asg.daysLeft !== undefined ? (
                      asg.daysLeft === 0 ? (
                        <span className="font-bold text-amber-600">Today</span>
                      ) : asg.daysLeft === 1 ? (
                        <span className="font-bold text-emerald-600">Tomorrow</span>
                      ) : (
                        <span className="font-bold text-slate-800">{asg.daysLeft} days left</span>
                      )
                    ) : (
                      <span>{asg.dueDate}</span>
                    )}
                  </div>
                </div>

                <div className="mb-2.5">
                  {asg.personalNote ? (
                    <div
                      onClick={() => handleOpenNoteModal(asg)}
                      className="bg-amber-50 border border-amber-200/80 rounded-md p-1.5 text-[9.5px] text-amber-900 flex items-start gap-1 cursor-pointer hover:bg-amber-100/70 transition-colors"
                      title="Click to edit personal note"
                    >
                      <FileEdit className="w-3 h-3 text-amber-600 mt-0.5 shrink-0" />
                      <span className="line-clamp-2 font-medium">{asg.personalNote}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleOpenNoteModal(asg)}
                      className="text-[9.5px] text-slate-400 hover:text-blue-600 border border-slate-200 rounded-md px-2 py-0.5 font-medium transition-colors"
                    >
                      Add Personal Note
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-auto">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-slate-700 leading-tight">
                      {asg.dueDate}
                    </span>
                    {asg.grade ? (
                      <span className="text-[9.5px] font-semibold text-emerald-600">
                        {asg.grade}
                      </span>
                    ) : asg.weight ? (
                      <span className="text-[9.5px] text-slate-400">Weight: {asg.weight}</span>
                    ) : null}
                  </div>

                  <button
                    onClick={() => toggleAssignmentStatus(asg.id)}
                    className="focus:outline-none transition-transform active:scale-90 cursor-pointer"
                    aria-label={isCompleted ? `Mark ${asg.title} as to-do` : `Mark ${asg.title} as submitted`}
                    title={isCompleted ? 'Mark as to-do' : 'Mark as submitted'}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-white fill-[#10b981]" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300 hover:text-emerald-500 stroke-[2]" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredAssessments.length === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 mt-4">
            <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No assessments found</p>
            <p className="text-xs text-slate-400 mt-1">
              {selectedCourseFilter !== 'all'
                ? 'Try selecting "All Courses" or a different status tab'
                : 'Switch filter to view other tasks'}
            </p>
          </div>
        )}
      </div>

      {/* Note Editing Modal */}
      {activeNoteModalFor && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <h4 className="text-sm font-bold text-slate-900 mb-2">Personal Study Note</h4>
            <textarea
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="e.g. Remember to check formulas, bring calculator..."
              className="w-full h-24 text-xs border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#18458b]/20"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setActiveNoteModalFor(null)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNote}
                className="text-xs font-semibold px-4 py-1.5 rounded-lg bg-[#18458b] text-white hover:bg-blue-800"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
