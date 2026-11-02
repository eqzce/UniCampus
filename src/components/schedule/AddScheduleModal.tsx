import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { validateCampusRoom, VALID_CAMPUS_ROOMS } from '../map/buildings';
import type { ScheduleItem } from '../../types';
import {
  X,
  CalendarPlus,
  MapPin,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';

const DAYS: { id: ScheduleItem['day']; label: string }[] = [
  { id: 'Mon', label: 'Monday (Mon)' },
  { id: 'Tue', label: 'Tuesday (Tue)' },
  { id: 'Wed', label: 'Wednesday (Wed)' },
  { id: 'Thu', label: 'Thursday (Thu)' },
  { id: 'Fri', label: 'Friday (Fri)' },
];

const TIME_SLOTS: { label: string; startTime: string; endTime: string; rowIndex: number }[] = [
  { label: '09:00 - 10:00', startTime: '09:00', endTime: '10:00', rowIndex: 0 },
  { label: '10:00 - 11:00', startTime: '10:00', endTime: '11:00', rowIndex: 1 },
  { label: '11:00 - 12:00', startTime: '11:00', endTime: '12:00', rowIndex: 2 },
  { label: '12:00 - 13:00', startTime: '12:00', endTime: '13:00', rowIndex: 3 },
  { label: '13:00 - 14:00', startTime: '1:00', endTime: '2:00', rowIndex: 4 },
  { label: '14:00 - 15:00', startTime: '2:00', endTime: '3:00', rowIndex: 5 },
  { label: '15:00 - 16:00', startTime: '3:00', endTime: '4:00', rowIndex: 6 },
  { label: '16:00 - 17:00', startTime: '4:00', endTime: '5:00', rowIndex: 7 },
];

const COLORS: { id: ScheduleItem['color']; label: string; dot: string }[] = [
  { id: 'blue', label: 'Blue', dot: 'bg-blue-500' },
  { id: 'orange', label: 'Orange', dot: 'bg-amber-500' },
  { id: 'green', label: 'Green', dot: 'bg-emerald-500' },
  { id: 'purple', label: 'Purple', dot: 'bg-purple-500' },
  { id: 'pink', label: 'Pink', dot: 'bg-rose-500' },
  { id: 'yellow', label: 'Yellow', dot: 'bg-yellow-500' },
];

const DUE_OPTIONS: { label: string; dueDate: string; daysLeft: number }[] = [
  { label: 'Today', dueDate: 'Today', daysLeft: 0 },
  { label: 'Tomorrow', dueDate: 'Tomorrow', daysLeft: 1 },
  { label: 'In 3 Days', dueDate: 'Oct 29', daysLeft: 3 },
  { label: 'In 1 Week', dueDate: 'Nov 02', daysLeft: 7 },
];

export const AddScheduleModal: React.FC = () => {
  const { isAddScheduleOpen, setIsAddScheduleOpen, addScheduleItem, setActiveTab } = useApp();

  const [courseName, setCourseName] = useState('');
  const [roomInput, setRoomInput] = useState('');
  const [homeworkTitle, setHomeworkTitle] = useState('');
  const [dueOptionIndex, setDueOptionIndex] = useState(1);
  const [professor, setProfessor] = useState('');
  const [selectedDay, setSelectedDay] = useState<ScheduleItem['day']>('Mon');
  const [timeRowIndex, setTimeRowIndex] = useState<number>(1);
  const [selectedColor, setSelectedColor] = useState<ScheduleItem['color']>('blue');

  const [courseError, setCourseError] = useState<string | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);

  const liveRoomValidation = useMemo(() => {
    if (!roomInput.trim()) return null;
    return validateCampusRoom(roomInput);
  }, [roomInput]);

  const matchingSuggestions = useMemo(() => {
    const q = roomInput.trim().toUpperCase();
    if (!q) {
      return ['C1.1.320', 'C1.2.136', 'C1.3.246', 'C1.1.140', 'C1.2.246', 'C1.3.125'];
    }
    return VALID_CAMPUS_ROOMS.filter((r) => r.toUpperCase().includes(q)).slice(0, 6);
  }, [roomInput]);

  if (!isAddScheduleOpen) return null;

  const handleClose = () => {
    setIsAddScheduleOpen(false);
    setCourseError(null);
    setRoomError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCourseError(null);
    setRoomError(null);

    if (!courseName.trim()) {
      setCourseError('Please enter a course name.');
      return;
    }

    const validation = validateCampusRoom(roomInput);
    if (!validation.isValid || !validation.canonicalRoom) {
      setRoomError(
        validation.error ||
          'This classroom does not exist! Please enter an existing room.'
      );
      return;
    }

    const slot = TIME_SLOTS[timeRowIndex] || TIME_SLOTS[1];
    const dueOpt = DUE_OPTIONS[dueOptionIndex] || DUE_OPTIONS[1];
    const generatedCode =
      courseName
        .trim()
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, 6) || 'CRS101';

    addScheduleItem(
      {
        courseName: courseName.trim(),
        courseCode: generatedCode,
        professor: professor.trim() || 'Course Instructor',
        day: selectedDay,
        startTime: slot.startTime,
        endTime: slot.endTime,
        timeRowIndex: slot.rowIndex,
        durationHours: 1,
        room: validation.canonicalRoom,
        building: validation.buildingName || 'AITU Main Campus',
        color: selectedColor,
      },
      homeworkTitle.trim()
        ? {
            title: homeworkTitle.trim(),
            dueDate: dueOpt.dueDate,
            daysLeft: dueOpt.daysLeft,
          }
        : undefined
    );

    // Reset form & switch to Schedule tab so user sees their added class immediately
    setCourseName('');
    setRoomInput('');
    setHomeworkTitle('');
    setProfessor('');
    setCourseError(null);
    setRoomError(null);
    setIsAddScheduleOpen(false);
    setActiveTab('schedule');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-3">
      <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#18458b] to-blue-600 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <CalendarPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">Add to Schedule</h3>
              <p className="text-[11px] text-blue-100/80">
                Custom course, verified classroom & homework
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-3.5 text-slate-800">
          {/* 1. Course Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              1. Course Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={courseName}
              onChange={(e) => {
                setCourseName(e.target.value);
                if (courseError) setCourseError(null);
              }}
              placeholder="e.g. Databases, Linear Algebra, Algorithms..."
              className={`w-full text-xs rounded-xl px-3.5 py-2.5 border focus:outline-none focus:ring-2 transition-all ${
                courseError
                  ? 'border-rose-400 bg-rose-50/40 focus:ring-rose-500/20'
                  : 'border-slate-200 bg-slate-50/60 focus:bg-white focus:ring-[#18458b]/20'
              }`}
            />
            {courseError && (
              <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{courseError}</span>
              </p>
            )}
          </div>

          {/* 2. Classroom with real-time Map validation */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              2. Classroom (verified on campus map) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={roomInput}
                onChange={(e) => {
                  setRoomInput(e.target.value);
                  if (roomError) setRoomError(null);
                }}
                placeholder="e.g. C1.1.320, C1.2.136, C1.3.246"
                className={`w-full text-xs rounded-xl pl-9 pr-3.5 py-2.5 border focus:outline-none focus:ring-2 transition-all ${
                  roomError || (liveRoomValidation && !liveRoomValidation.isValid)
                    ? 'border-rose-400 bg-rose-50/50 text-rose-900 focus:ring-rose-500/20'
                    : liveRoomValidation?.isValid
                    ? 'border-emerald-400 bg-emerald-50/40 text-emerald-900 focus:ring-emerald-500/20'
                    : 'border-slate-200 bg-slate-50/60 focus:bg-white focus:ring-[#18458b]/20'
                }`}
              />
            </div>

            {/* Validation Status Message */}
            {(roomError || (liveRoomValidation && !liveRoomValidation.isValid)) && (
              <div className="mt-1.5 bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-[11px] text-rose-700 flex items-start gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">
                    {roomError || liveRoomValidation?.error}
                  </p>
                  <p className="text-[10.5px] text-rose-600/90 mt-0.5">
                    Please enter an existing room from the AITU map or tap one below:
                  </p>
                </div>
              </div>
            )}

            {liveRoomValidation?.isValid && !roomError && (
              <div className="mt-1.5 bg-emerald-50 border border-emerald-200 rounded-xl px-2.5 py-1.5 text-[11px] text-emerald-800 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  Verified room: <b>{liveRoomValidation.canonicalRoom}</b> ({liveRoomValidation.buildingName})
                </span>
              </div>
            )}

            {/* Quick suggestion chips */}
            <div className="mt-1.5 flex items-center gap-1 flex-wrap">
              <span className="text-[10px] text-slate-400 font-medium mr-0.5">Available:</span>
              {(liveRoomValidation && !liveRoomValidation.isValid
                ? liveRoomValidation.suggestions
                : matchingSuggestions
              ).map((sug) => (
                <button
                  type="button"
                  key={sug}
                  onClick={() => {
                    setRoomInput(sug);
                    setRoomError(null);
                  }}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-[#18458b] border border-slate-200/80 transition-colors"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Homework (Assignment) */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-3 space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-bold text-[#18458b]">
              <BookOpen className="w-3.5 h-3.5" />
              <span>3. Homework / Assignment (Optional)</span>
            </label>
            <input
              type="text"
              value={homeworkTitle}
              onChange={(e) => setHomeworkTitle(e.target.value)}
              placeholder="e.g. Solve Problem Set 1-5, Prepare Lab Report"
              className="w-full text-xs rounded-xl px-3 py-2 border border-blue-200/80 bg-white focus:outline-none focus:ring-2 focus:ring-[#18458b]/20"
            />
            {homeworkTitle.trim() && (
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <span className="text-[10.5px] text-slate-600 font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3 text-blue-600" />
                  Due Date:
                </span>
                <div className="flex items-center gap-1 flex-wrap">
                  {DUE_OPTIONS.map((opt, idx) => (
                    <button
                      type="button"
                      key={opt.label}
                      onClick={() => setDueOptionIndex(idx)}
                      className={`text-[10px] font-semibold px-2 py-1 rounded-lg transition-all ${
                        dueOptionIndex === idx
                          ? 'bg-[#18458b] text-white'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 4. Day & Time Slot */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Day of Week
              </label>
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value as ScheduleItem['day'])}
                className="w-full text-xs rounded-xl px-2.5 py-2 border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none"
              >
                {DAYS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Time Slot
              </label>
              <select
                value={timeRowIndex}
                onChange={(e) => setTimeRowIndex(Number(e.target.value))}
                className="w-full text-xs rounded-xl px-2.5 py-2 border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none"
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot.rowIndex} value={slot.rowIndex}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 5. Professor & Card Color */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-end">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Instructor (Optional)
              </label>
              <input
                type="text"
                value={professor}
                onChange={(e) => setProfessor(e.target.value)}
                placeholder="Professor name"
                className="w-full text-xs rounded-xl px-3 py-2 border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Card Color
              </label>
              <div className="flex items-center gap-1.5 py-1">
                {COLORS.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setSelectedColor(c.id)}
                    title={c.label}
                    className={`w-6 h-6 rounded-full ${c.dot} transition-transform ${
                      selectedColor === c.id
                        ? 'ring-2 ring-offset-2 ring-[#18458b] scale-110'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Submit & Cancel */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              className="text-xs font-semibold px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl bg-[#18458b] hover:bg-[#14366d] active:scale-95 text-white shadow-md transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Save to Schedule</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
