import React, { useState } from 'react';
import { Header } from '../common/Header';
import { FloatingActionButton } from '../common/FloatingActionButton';
import { useApp } from '../../context/AppContext';
import type { Assignment, AssignmentStatus } from '../../types';
import { MoreVertical, CheckCircle2, Circle, ChevronDown, Plus, FileEdit } from 'lucide-react';

export const AssignmentsScreen: React.FC = () => {
  const { assignments, assignmentFilter, setAssignmentFilter, toggleAssignmentStatus, addPersonalNote } = useApp();
  const [activeNoteModalFor, setActiveNoteModalFor] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [sortBy, setSortBy] = useState<'deadline' | 'course'>('deadline');

  const filterTabs: { id: 'all' | AssignmentStatus; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'todo', label: 'To-Do' },
    { id: 'submitted', label: 'Submitted' },
    { id: 'graded', label: 'Graded' },
  ];

  // Filter assignments
  const filteredAssignments = assignments
    .filter((asg) => {
      if (assignmentFilter === 'all') return true;
      return asg.status === assignmentFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'deadline') {
        return (a.daysLeft || 99) - (b.daysLeft || 99);
      }
      return a.courseCode.localeCompare(b.courseCode);
    });

  const handleOpenNoteModal = (asg: Assignment) => {
    setActiveNoteModalFor(asg.id);
    setNoteInput(asg.personalNote || '');
  };

  const handleSaveNote = () => {
    if (activeNoteModalFor) {
      addPersonalNote(activeNoteModalFor, noteInput);
      setActiveNoteModalFor(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f6fa] relative overflow-hidden select-none">
      {/* Header */}
      <Header title="ASSIGNMENTS" />

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 pb-20">
        
        {/* Pill filter tabs */}
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

        {/* Action Bar: Add Personal Note & Sort */}
        <div className="flex items-center justify-between text-xs px-1">
          <button
            onClick={() => {
              const first = assignments[0];
              if (first) handleOpenNoteModal(first);
            }}
            className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 active:scale-95 transition-transform"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Personal Note</span>
          </button>

          <button
            onClick={() => setSortBy((prev) => (prev === 'deadline' ? 'course' : 'deadline'))}
            className="flex items-center gap-1 text-slate-500 font-medium cursor-pointer hover:text-slate-800"
          >
            <span>Sort by {sortBy === 'deadline' ? 'Deadline' : 'Course'}</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 2-Column Grid matching the mockup */}
        <div className="grid grid-cols-2 gap-3">
          {filteredAssignments.map((asg) => {
            const isCompleted = asg.status === 'submitted' || asg.status === 'graded';

            return (
              <div
                key={asg.id}
                className="bg-white rounded-2xl p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow relative group"
              >
                {/* Top: Title & Options Menu */}
                <div className="flex items-start justify-between gap-1 mb-1">
                  <h4 className="text-[13px] font-bold text-slate-900 leading-snug line-clamp-2">
                    {asg.title}
                  </h4>
                  <button className="text-slate-400 hover:text-slate-600 p-0.5 -mr-1 -mt-0.5">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>

                {/* Course Name / Code */}
                <p className="text-[11px] text-slate-500 font-medium mb-2 truncate">
                  {asg.courseCode}
                </p>

                {/* Personal Note Tag or Add Button */}
                <div className="mb-3">
                  {asg.personalNote ? (
                    <div
                      onClick={() => handleOpenNoteModal(asg)}
                      className="bg-amber-50 border border-amber-200/80 rounded-md p-1.5 text-[10px] text-amber-900 flex items-start gap-1 cursor-pointer hover:bg-amber-100/70 transition-colors"
                      title="Click to edit personal note"
                    >
                      <FileEdit className="w-3 h-3 text-amber-600 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2 font-medium">{asg.personalNote}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleOpenNoteModal(asg)}
                      className="text-[10px] text-slate-400 hover:text-blue-600 border border-slate-200 rounded-md px-2 py-0.5 font-medium transition-colors"
                    >
                      Add Personal Note
                    </button>
                  )}
                </div>

                {/* Bottom Row: Due date and status toggle circle */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-50 mt-auto">
                  <span className="text-xs font-semibold text-slate-600">
                    {asg.dueDate}
                  </span>

                  <button
                    onClick={() => toggleAssignmentStatus(asg.id)}
                    className="focus:outline-none transition-transform active:scale-90"
                    title={isCompleted ? 'Mark as to-do' : 'Mark as submitted'}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-[#10b981] fill-emerald-500 text-white" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300 hover:text-emerald-500 stroke-[2]" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state if filtered results are 0 */}
        {filteredAssignments.length === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 mt-4">
            <p className="text-sm font-semibold text-slate-700">No assignments found</p>
            <p className="text-xs text-slate-400 mt-1">Switch filter to view other tasks</p>
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
              placeholder="e.g. Remember to check references, ask professor about section 2..."
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

      {/* Floating Action Button */}
      <FloatingActionButton />
    </div>
  );
};
