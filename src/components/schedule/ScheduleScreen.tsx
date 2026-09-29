import React, { useState } from 'react';
import { Header } from '../common/Header';
import { FloatingActionButton } from '../common/FloatingActionButton';
import { useApp } from '../../context/AppContext';
import { WEEKLY_SCHEDULE } from '../../data/mockData';
import type { ScheduleItem } from '../../types';
import { Search, ChevronLeft, ChevronRight, MapPin, X } from 'lucide-react';

const HOURS = ['09:00', '10:00', '11:00', '12:00', '1:00', '2:00', '3:00', '4:00'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;

export const ScheduleScreen: React.FC = () => {
  const { navigateToClassroom } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<ScheduleItem | null>(() => {
    return WEEKLY_SCHEDULE.find((item) => item.isCurrent) || WEEKLY_SCHEDULE[0];
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

  return (
    <div className="flex flex-col h-full bg-[#f4f6fa] relative overflow-hidden select-none">
      {/* Header */}
      <Header title="SCHEDULE" />

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3 pb-20">
        
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
                            onClick={() => setSelectedClass(item)}
                            className={`w-full rounded-md p-1 text-left transition-all border ${getColorClasses(
                              item.color
                            )} ${
                              isSelected
                                ? 'ring-2 ring-[#18458b] shadow-sm font-semibold scale-[1.02] z-10'
                                : 'opacity-90 hover:opacity-100'
                            }`}
                            style={{
                              minHeight: `${item.durationHours * 34}px`,
                            }}
                          >
                            {item.isCurrent && (
                              <div className="text-[8px] font-black text-emerald-700 uppercase tracking-tighter mb-0.5 leading-none">
                                Current Class
                              </div>
                            )}
                            <div className="text-[9px] font-bold leading-tight truncate">
                              {item.startTime}
                            </div>
                            <div className="text-[9px] font-semibold leading-tight truncate">
                              {item.courseName}
                            </div>
                            {item.room && (
                              <div className="text-[8px] opacity-80 leading-none truncate mt-0.5">
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

        {/* Selected Class Popover Card (matching the image mockup!) */}
        {selectedClass && (
          <div className="bg-white rounded-2xl p-4 shadow-md border border-blue-100/80 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mb-1">
                  {selectedClass.isCurrent ? 'Current Class' : 'Selected Class'}
                </span>
                <h4 className="text-sm font-bold text-slate-900">
                  {selectedClass.startTime} - {selectedClass.courseName}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Classroom: <span className="font-semibold text-slate-700">{selectedClass.room}</span> ({selectedClass.building})
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Instructor: {selectedClass.professor}
                </p>
              </div>

              <button
                onClick={() => setSelectedClass(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => navigateToClassroom(selectedClass.room)}
                className="w-full sm:w-auto bg-[#18458b] hover:bg-[#14366d] active:scale-98 text-white text-xs font-bold py-2.5 px-6 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all"
              >
                <MapPin className="w-4 h-4 text-sky-300" />
                <span>Show on Map</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Floating Action Button */}
      <FloatingActionButton />
    </div>
  );
};
