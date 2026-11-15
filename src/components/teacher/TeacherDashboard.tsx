import React, { useState, useMemo, useEffect } from 'react';
import { Header } from '../common/Header';
import { useApp } from '../../context/AppContext';
import { CampusMapScreen } from '../map/CampusMapScreen';
import { getWeekSummaryInfo, getTodayIsoDate, formatRelativeDue } from '../../utils/dateUtils';
import type {
  AssessmentCategory,
  AttendanceStatusType,
  ScheduleItem,
  TeacherTabType,
} from '../../types';
import {
  CalendarPlus,
  DoorOpen,
  CheckCircle2,
  Clock,
  XCircle,
  MessageSquare,
  Send,
  Plus,
  Trash2,
  MapPin,
  Users,
  Award,
  Sparkles,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Upload,
  X,
} from 'lucide-react';

const GRADE_CATEGORIES = ['Assignment', 'Midterm 1', 'Midterm 2', 'Final'] as const;
const STUDENT_GROUPS = ['ALL', 'CS-2401', 'SE-2402', 'IT-2403'] as const;
const SCHEDULE_DAYS: ScheduleItem['day'][] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const SCHEDULE_TIME_SLOTS = [
  { start: '09:00', end: '10:00', row: 0 },
  { start: '10:00', end: '11:00', row: 1 },
  { start: '11:00', end: '12:00', row: 2 },
  { start: '12:00', end: '13:00', row: 3 },
  { start: '1:00', end: '2:00', row: 4 },
  { start: '2:00', end: '3:00', row: 5 },
  { start: '3:00', end: '4:00', row: 6 },
  { start: '4:00', end: '5:00', row: 7 },
];
const SCHEDULE_ROOMS = [
  { room: 'C1.1.320', building: 'AITU Block C1.1' },
  { room: 'C1.2.136', building: 'AITU Block C1.2' },
  { room: 'C1.3.246', building: 'AITU Block C1.3' },
  { room: 'C1.1.140', building: 'AITU Block C1.1' },
  { room: 'C1.2.246', building: 'AITU Block C1.2' },
];

interface TeacherDashboardProps {
  forcedTab?: TeacherTabType;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ forcedTab }) => {
  const {
    teacherActiveTab,
    currentUser,
    courses,
    studentsList,
    grades,
    attendance,
    assignments,
    scheduleItems,
    roomBookings,
    selectedWeekOffset,
    setSelectedWeekOffset,
    submitTeacherGrade,
    submitTeacherAttendance,
    publishTeacherTask,
    updateTeacherTask,
    removeAssignment,
    updateScheduleClass,
    importTeacherSchedule,
    removeScheduleItem,
    updateRoomBookingStatus,
    setIsBookingOpen,
    setIsAddScheduleOpen,
    navigateToClassroom,
    isOfflineMode,
  } = useApp();

  const activeTab = forcedTab || teacherActiveTab;

  const teacherCourses = useMemo(() => {
    if (currentUser?.role === 'teacher') {
      const owned = courses.filter((c) => c.teacher_id === currentUser.id);
      return owned.length > 0 ? owned : courses;
    }
    return courses;
  }, [courses, currentUser]);

  const assignedTeacherCourse = teacherCourses[0];

  // Shared filter states
  const [selectedCourseCode, setSelectedCourseCode] = useState<string>(
    assignedTeacherCourse?.code || 'PHYS101'
  );
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');

  useEffect(() => {
    if (
      teacherCourses.length > 0 &&
      !teacherCourses.some((c) => c.code === selectedCourseCode)
    ) {
      setSelectedCourseCode(teacherCourses[0].code);
    }
  }, [teacherCourses, selectedCourseCode]);

  // Gradebook modal/inline editor state
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [gradeCategory, setGradeCategory] = useState<string>('Assignment');
  const [gradeScore, setGradeScore] = useState<string>('95');
  const [gradeFeedback, setGradeFeedback] = useState<string>('');
  const [gradeToast, setGradeToast] = useState<string | null>(null);

  // Attendance state
  const [attendanceDate, setAttendanceDate] = useState<string>(() => getTodayIsoDate());
  const [attendanceDraft, setAttendanceDraft] = useState<Record<string, AttendanceStatusType>>({});
  const [attendanceToast, setAttendanceToast] = useState<string | null>(null);

  // Task / Deadline creator & editor state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState<AssessmentCategory>('assignment');
  const [taskGroup, setTaskGroup] = useState('ALL');
  const [taskDueDate, setTaskDueDate] = useState(() => formatRelativeDue(3).dueFormatted);
  const [taskWeight, setTaskWeight] = useState('15%');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskToast, setTaskToast] = useState<string | null>(null);

  // Schedule calendar selection, inline editor & import state
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [editCourseName, setEditCourseName] = useState('');
  const [editCourseCode, setEditCourseCode] = useState('');
  const [editDay, setEditDay] = useState<ScheduleItem['day']>('Mon');
  const [editStartTime, setEditStartTime] = useState('10:00');
  const [editRoom, setEditRoom] = useState('C1.1.320');
  const [editGroupName, setEditGroupName] = useState('CS-2401');
  const [editWeekStart, setEditWeekStart] = useState('recurring');
  const [scheduleToast, setScheduleToast] = useState<string | null>(null);
  const [isImportScheduleOpen, setIsImportScheduleOpen] = useState(false);
  const [importCsvText, setImportCsvText] = useState(
    'PHYS101,Wed,14:00,C1.1.320\nPHYS101,Fri,15:00,C1.1.140'
  );
  const [importScope, setImportScope] = useState<'week' | 'recurring'>('week');

  const weekSummary = useMemo(() => getWeekSummaryInfo(selectedWeekOffset), [selectedWeekOffset]);

  const selectedCourseObj = useMemo(
    () => teacherCourses.find((c) => c.code === selectedCourseCode) || teacherCourses[0],
    [teacherCourses, selectedCourseCode]
  );

  const filteredStudents = useMemo(() => {
    const seenNames = new Set<string>();
    return studentsList.filter((st) => {
      if (selectedGroup !== 'ALL' && st.group_name !== selectedGroup) return false;
      if (
        selectedCourseObj &&
        st.enrolled_course_ids &&
        st.enrolled_course_ids.length > 0 &&
        !st.enrolled_course_ids.includes(selectedCourseObj.id)
      ) {
        return false;
      }
      if (seenNames.has(st.full_name)) return false;
      seenNames.add(st.full_name);
      return true;
    });
  }, [studentsList, selectedGroup, selectedCourseObj]);

  if (activeTab === 'map') {
    return <CampusMapScreen />;
  }

  const handleOpenGradeEditor = (studentId: string, category = 'Assignment') => {
    setEditingStudentId(studentId);
    setGradeCategory(category);
    const existing = grades.find(
      (g) =>
        g.student_id === studentId &&
        (g.course_code === selectedCourseCode || g.course_id === selectedCourseObj?.id) &&
        g.category === category
    );
    setGradeScore(existing ? String(existing.score) : '90');
    setGradeFeedback(existing?.feedback || '');
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudentId || !selectedCourseObj) return;
    const numeric = Math.max(0, Math.min(100, Number(gradeScore) || 0));

    await submitTeacherGrade({
      student_id: editingStudentId,
      course_id: selectedCourseObj.id,
      category: gradeCategory,
      score: numeric,
      feedback: gradeFeedback.trim(),
    });

    const stName = studentsList.find((s) => s.id === editingStudentId)?.full_name || 'Student';
    setGradeToast(`Saved ${numeric}/100 (${gradeCategory}) for ${stName}`);
    setEditingStudentId(null);
    setTimeout(() => setGradeToast(null), 3000);
  };

  const getStudentAttendanceStatus = (studentId: string): AttendanceStatusType => {
    if (attendanceDraft[studentId]) return attendanceDraft[studentId];
    const existing = attendance.find(
      (a) =>
        a.student_id === studentId &&
        (a.course_code === selectedCourseCode || a.course_id === selectedCourseObj?.id) &&
        a.date === attendanceDate
    );
    return existing?.status || 'present';
  };

  const handleSetAttendance = (studentId: string, status: AttendanceStatusType) => {
    setAttendanceDraft((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleMarkAllPresent = () => {
    const next: Record<string, AttendanceStatusType> = {};
    filteredStudents.forEach((st) => {
      next[st.id] = 'present';
    });
    setAttendanceDraft(next);
  };

  const handleSaveAttendanceBatch = async () => {
    if (!selectedCourseObj) return;
    const records = filteredStudents.map((st) => ({
      student_id: st.id,
      status: getStudentAttendanceStatus(st.id),
    }));
    await submitTeacherAttendance({
      course_id: selectedCourseObj.id,
      date: attendanceDate,
      records,
    });
    setAttendanceToast(`Attendance saved for ${selectedCourseCode} (${attendanceDate})`);
    setTimeout(() => setAttendanceToast(null), 3000);
  };

  const handlePublishTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    if (editingTaskId) {
      await updateTeacherTask(editingTaskId, {
        course_id: selectedCourseObj?.id,
        course_code: selectedCourseCode,
        group_name: taskGroup,
        title: taskTitle.trim(),
        description: taskDescription.trim(),
        due_date: taskDueDate.trim() || formatRelativeDue(3).dueFormatted,
        category: taskCategory,
        weight: taskWeight,
      });
      setTaskToast(`Updated "${taskTitle.trim()}"`);
      setEditingTaskId(null);
    } else {
      await publishTeacherTask({
        course_id: selectedCourseObj?.id,
        course_code: selectedCourseCode,
        group_name: taskGroup,
        title: taskTitle.trim(),
        description: taskDescription.trim(),
        due_date: taskDueDate.trim() || formatRelativeDue(3).dueFormatted,
        category: taskCategory,
        weight: taskWeight,
      });
      setTaskToast(`Published "${taskTitle.trim()}" to ${taskGroup}`);
    }
    setTaskTitle('');
    setTaskDescription('');
    setTimeout(() => setTaskToast(null), 3000);
  };

  const handleImportCsvSchedule = async () => {
    const slotMap: Record<string, { start: string; end: string; row: number }> = {
      '09:00': { start: '09:00', end: '10:00', row: 0 },
      '10:00': { start: '10:00', end: '11:00', row: 1 },
      '11:00': { start: '11:00', end: '12:00', row: 2 },
      '12:00': { start: '12:00', end: '13:00', row: 3 },
      '13:00': { start: '1:00', end: '2:00', row: 4 },
      '1:00': { start: '1:00', end: '2:00', row: 4 },
      '14:00': { start: '2:00', end: '3:00', row: 5 },
      '2:00': { start: '2:00', end: '3:00', row: 5 },
      '15:00': { start: '3:00', end: '4:00', row: 6 },
      '3:00': { start: '3:00', end: '4:00', row: 6 },
      '16:00': { start: '4:00', end: '5:00', row: 7 },
      '4:00': { start: '4:00', end: '5:00', row: 7 },
    };

    const rows = importCsvText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const parsed: Array<Omit<ScheduleItem, 'id'>> = rows.map((row, idx) => {
      const [rawCode, rawDay, rawStart, rawRoom] = row.split(',').map((p) => p.trim());
      const matchedCourse = courses.find(
        (c) => c.code.toUpperCase() === (rawCode || selectedCourseCode).toUpperCase()
      );
      const dayVal = (SCHEDULE_DAYS.find((d) => d.toLowerCase() === (rawDay || '').toLowerCase()) ||
        'Mon') as ScheduleItem['day'];
      const slot = slotMap[rawStart || '10:00'] || slotMap['10:00'];
      const targetWeek = importScope === 'week' ? weekSummary.activeWeekIso : 'recurring';
      const palette: ScheduleItem['color'][] = ['blue', 'green', 'purple', 'orange', 'pink'];

      return {
        courseId: matchedCourse?.id || selectedCourseObj?.id,
        courseCode: matchedCourse?.code || rawCode || selectedCourseCode,
        courseName: matchedCourse?.title || selectedCourseObj?.title || rawCode || 'Course',
        professor: matchedCourse?.teacher_name || currentUser?.full_name || 'Faculty',
        day: dayVal,
        startTime: slot.start,
        endTime: slot.end,
        timeRowIndex: slot.row,
        durationHours: 1,
        room: rawRoom || 'C1.1.320',
        building: 'Main Campus',
        groupName: 'CS-2401',
        weekStart: targetWeek,
        color: palette[idx % palette.length],
      };
    });

    if (parsed.length === 0) return;
    await importTeacherSchedule(
      parsed,
      importScope === 'week' ? weekSummary.activeWeekIso : undefined
    );
    setScheduleToast(
      `Imported ${parsed.length} class sessions (${importScope === 'week' ? weekSummary.activeWeekIso : 'Recurring'})`
    );
    setIsImportScheduleOpen(false);
    setTimeout(() => setScheduleToast(null), 3000);
  };

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'gradebook':
        return 'GRADES';
      case 'attendance':
        return 'ATTENDANCE';
      case 'tasks':
        return 'TASKS';
      case 'schedule':
        return 'SCHEDULE';
      default:
        return 'TEACHER';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f6fa] relative overflow-hidden select-none">
      <Header title={getHeaderTitle()} />

      <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3 pb-20">
        {/* Top Teacher Sync Status Banner */}
        <div className="flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/70 rounded-xl px-3 py-2 text-xs text-emerald-950">
          <div className="flex items-center gap-1.5 font-semibold truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <span className="truncate">
              {isOfflineMode ? 'Offline Mode' : 'Live Synced'}
            </span>
          </div>
          {selectedCourseObj && (
            <span className="text-[10.5px] font-bold text-emerald-800 bg-white/90 px-2.5 py-0.5 rounded-lg border border-emerald-200 shrink-0">
              {selectedCourseObj.code}
            </span>
          )}
        </div>

        {/* Course & Student Group Filter Bar (used in Gradebook, Attendance & Tasks) */}
        {(activeTab === 'gradebook' || activeTab === 'attendance' || activeTab === 'tasks') && (
          <div className="bg-white rounded-2xl p-3 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 space-y-2.5">
            {/* Course Selector Chips */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Course
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                {teacherCourses.map((c) => {
                  const active = c.code === selectedCourseCode;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCourseCode(c.code)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                        active
                          ? 'bg-[#18458b] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {c.code} · {c.title.split(' ')[0]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Group Selector Chips */}
            {activeTab !== 'tasks' && (
              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <span className="text-[10.5px] font-bold text-slate-500 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-[#18458b]" />
                  <span>Student Group:</span>
                </span>
                <div className="flex items-center gap-1">
                  {STUDENT_GROUPS.map((grp) => (
                    <button
                      key={grp}
                      onClick={() => setSelectedGroup(grp)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        selectedGroup === grp
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {grp === 'ALL' ? 'All Groups' : grp}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 1: INTERACTIVE GRADEBOOK                                      */}
        {/* ================================================================= */}
        {activeTab === 'gradebook' && (
          <div className="space-y-2.5">
            {gradeToast && (
              <div className="bg-emerald-600 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-md flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{gradeToast}</span>
              </div>
            )}

            {filteredStudents.map((st) => {
              const studentCourseGrades = grades.filter(
                (g) =>
                  (g.student_id === st.id || g.student_name === st.full_name) &&
                  (g.course_code === selectedCourseCode || g.course_id === selectedCourseObj?.id)
              );

              const avgScore =
                studentCourseGrades.length > 0
                  ? Math.round(
                      studentCourseGrades.reduce((sum, g) => sum + Number(g.score), 0) /
                        studentCourseGrades.length
                    )
                  : null;

              const isEditingThis = editingStudentId === st.id;

              return (
                <div
                  key={st.id}
                  className="bg-white rounded-2xl p-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 space-y-2.5"
                >
                  {/* Student Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-slate-900">{st.full_name}</h4>
                        <span className="text-[10px] font-bold bg-blue-50 text-[#18458b] px-2 py-0.5 rounded-full border border-blue-200/60">
                          {st.group_name || 'CS-2401'}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-400">{st.email}</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {avgScore !== null && (
                        <div className="text-right mr-1">
                          <span className="text-[10px] text-slate-400 block leading-none">
                            Course Avg
                          </span>
                          <span className="text-xs font-black text-emerald-600">{avgScore}%</span>
                        </div>
                      )}
                      <button
                        onClick={() =>
                          isEditingThis
                            ? setEditingStudentId(null)
                            : handleOpenGradeEditor(st.id, 'Assignment')
                        }
                        className="text-[11px] font-bold bg-[#18458b] hover:bg-blue-800 text-white px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>{isEditingThis ? 'Close' : '+ Grade'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Category Score Pills */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {GRADE_CATEGORIES.map((cat) => {
                      const found = studentCourseGrades.find((g) => g.category === cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => handleOpenGradeEditor(st.id, cat)}
                          className={`p-1.5 rounded-xl border text-center transition-all cursor-pointer ${
                            found
                              ? 'bg-emerald-50/70 border-emerald-200 hover:bg-emerald-100/70'
                              : 'bg-slate-50 border-slate-200/70 hover:bg-blue-50/50'
                          }`}
                          title="Click to input or edit grade"
                        >
                          <div className="text-[9px] font-semibold text-slate-500 truncate">
                            {cat}
                          </div>
                          <div
                            className={`text-xs font-extrabold mt-0.5 ${
                              found ? 'text-emerald-700' : 'text-slate-400'
                            }`}
                          >
                            {found ? `${found.score}%` : '—'}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Latest Teacher Feedback Preview */}
                  {studentCourseGrades.some((g) => g.feedback) && !isEditingThis && (
                    <div className="bg-slate-50 rounded-xl p-2 border border-slate-100 text-[11px] text-slate-600 flex items-start gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-700">
                          {studentCourseGrades.find((g) => g.feedback)?.category}:{' '}
                        </span>
                        <span>{studentCourseGrades.find((g) => g.feedback)?.feedback}</span>
                      </div>
                    </div>
                  )}

                  {/* Inline Grade & Feedback Editor */}
                  {isEditingThis && (
                    <form
                      onSubmit={handleSaveGrade}
                      className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-3 space-y-2.5 animate-in fade-in duration-150"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#18458b]">
                          Grade & Feedback for {st.full_name} ({selectedCourseCode})
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                            Assessment Category
                          </label>
                          <select
                            value={gradeCategory}
                            onChange={(e) => {
                              const newCat = e.target.value;
                              setGradeCategory(newCat);
                              const ex = studentCourseGrades.find((g) => g.category === newCat);
                              if (ex) {
                                setGradeScore(String(ex.score));
                                setGradeFeedback(ex.feedback || '');
                              }
                            }}
                            className="w-full text-xs border border-blue-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-800"
                          >
                            {GRADE_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                            Score (0 - 100)
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            required
                            value={gradeScore}
                            onChange={(e) => setGradeScore(e.target.value)}
                            className="w-full text-xs font-bold border border-blue-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-900"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          Teacher Feedback (Synced to Student App)
                        </label>
                        <textarea
                          rows={2}
                          value={gradeFeedback}
                          onChange={(e) => setGradeFeedback(e.target.value)}
                          placeholder="Write constructive feedback for the student..."
                          className="w-full text-xs border border-blue-200 rounded-xl p-2 bg-white text-slate-800 focus:outline-none"
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingStudentId(null)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white text-slate-600 border border-slate-200"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-[#18458b] hover:bg-blue-900 text-white flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                          <span>Save Grade</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: ATTENDANCE TRACKER                                         */}
        {/* ================================================================= */}
        {activeTab === 'attendance' && (
          <div className="space-y-3">
            {attendanceToast && (
              <div className="bg-emerald-600 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-md flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{attendanceToast}</span>
              </div>
            )}

            {/* Date Picker + Bulk Action */}
            <div className="bg-white rounded-2xl p-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 flex items-center justify-between gap-2 flex-wrap">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase">
                  Class Date
                </label>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => {
                    setAttendanceDate(e.target.value);
                    setAttendanceDraft({});
                  }}
                  className="text-xs font-bold text-slate-800 border border-slate-200 rounded-xl px-2.5 py-1.5 mt-0.5 bg-slate-50"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleMarkAllPresent}
                  className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-xl cursor-pointer"
                >
                  All Present
                </button>
                <button
                  type="button"
                  onClick={handleSaveAttendanceBatch}
                  className="text-[11px] font-bold text-white bg-[#18458b] hover:bg-blue-900 px-3 py-1.5 rounded-xl shadow-xs cursor-pointer"
                >
                  Save Attendance
                </button>
              </div>
            </div>

            {/* Student Attendance Rows */}
            <div className="space-y-2">
              {filteredStudents.map((st) => {
                const status = getStudentAttendanceStatus(st.id);
                return (
                  <div
                    key={st.id}
                    className="bg-white rounded-2xl p-3 shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-slate-100 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{st.full_name}</h4>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Group: {st.group_name || 'CS-2401'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSetAttendance(st.id, 'present')}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          status === 'present'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Present</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSetAttendance(st.id, 'late')}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          status === 'late'
                            ? 'bg-amber-500 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        <span>Late</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSetAttendance(st.id, 'absent')}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          status === 'absent'
                            ? 'bg-rose-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        <XCircle className="w-3 h-3" />
                        <span>Absent</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: TASK / DEADLINE CREATOR                                    */}
        {/* ================================================================= */}
        {activeTab === 'tasks' && (
          <div className="space-y-3">
            {taskToast && (
              <div className="bg-emerald-600 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-md flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{taskToast}</span>
              </div>
            )}

            {/* Create New Task Form */}
            <form
              onSubmit={handlePublishTask}
              className="bg-white rounded-2xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#18458b] flex items-center justify-center">
                    <CalendarPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">
                      {editingTaskId ? 'Edit Homework / Exam Deadline' : 'Publish Homework / Exam Deadline'}
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Immediately syncs to enrolled Student Tasks & Deadlines
                    </p>
                  </div>
                </div>
                {editingTaskId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTaskId(null);
                      setTaskTitle('');
                      setTaskDescription('');
                    }}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Task Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Lab 4: Electromagnetic Induction Report"
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/70 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Target Group
                  </label>
                  <select
                    value={taskGroup}
                    onChange={(e) => setTaskGroup(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-xl px-2 py-2 bg-slate-50"
                  >
                    <option value="CS-2401">CS-2401</option>
                    <option value="SE-2402">SE-2402</option>
                    <option value="IT-2403">IT-2403</option>
                    <option value="ALL">All Groups</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Category
                  </label>
                  <select
                    value={taskCategory}
                    onChange={(e) => setTaskCategory(e.target.value as AssessmentCategory)}
                    className="w-full text-xs border border-slate-200 rounded-xl px-2 py-2 bg-slate-50"
                  >
                    <option value="assignment">Assignment</option>
                    <option value="quiz">Quiz</option>
                    <option value="midterm">Midterm</option>
                    <option value="final">Final Exam</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Weight
                  </label>
                  <select
                    value={taskWeight}
                    onChange={(e) => setTaskWeight(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-xl px-2 py-2 bg-slate-50"
                  >
                    <option value="5%">5%</option>
                    <option value="10%">10%</option>
                    <option value="15%">15%</option>
                    <option value="30%">30%</option>
                    <option value="40%">40%</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Due Date & Time
                </label>
                <input
                  type="text"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  placeholder="e.g. Nov 06, 23:59"
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/70 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Instructions / Description
                </label>
                <textarea
                  rows={2}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Submission guidelines, required formulas or repo link..."
                  className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-slate-50/70 focus:bg-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#18458b] hover:bg-blue-900 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {editingTaskId ? 'Save Homework Changes' : `Publish Deadline to ${taskGroup}`}
                </span>
              </button>
            </form>

            {/* Published Deadlines List */}
            <div className="bg-white rounded-2xl p-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 space-y-2">
              <h4 className="text-xs font-bold text-slate-800">
                Active Course Deadlines ({assignments.length})
              </h4>
              {assignments.map((asg) => (
                <div
                  key={asg.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[#18458b] text-[10px]">
                        {asg.courseCode}
                      </span>
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded font-semibold">
                        {asg.groupName || 'CS-2401'}
                      </span>
                    </div>
                    <p className="font-bold text-slate-800 truncate mt-0.5">{asg.title}</p>
                    <p className="text-[10px] text-slate-400">{asg.dueFormatted || asg.dueDate}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTaskId(asg.id);
                        setTaskTitle(asg.title);
                        setTaskCategory(asg.category || 'assignment');
                        setTaskGroup(asg.groupName || 'CS-2401');
                        setTaskDueDate(asg.dueFormatted || asg.dueDate);
                        setTaskWeight(asg.weight || '15%');
                        setTaskDescription(asg.description || '');
                        if (asg.courseCode) setSelectedCourseCode(asg.courseCode);
                      }}
                      className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer"
                      title={`Edit ${asg.title}`}
                      aria-label={`Edit ${asg.title}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (editingTaskId === asg.id) setEditingTaskId(null);
                        removeAssignment(asg.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                      title={`Delete ${asg.title}`}
                      aria-label={`Delete ${asg.title}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: SCHEDULE & ROOM MANAGEMENT                                 */}
        {/* ================================================================= */}
        {activeTab === 'schedule' && (
          <div className="space-y-3">
            {/* Room Reservations & Approval Management */}
            <div className="bg-white rounded-2xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DoorOpen className="w-4 h-4 text-[#18458b]" />
                  <h3 className="text-xs font-bold text-slate-900">
                    Campus Room Bookings ({roomBookings.length})
                  </h3>
                </div>
                <button
                  onClick={() => setIsBookingOpen(true)}
                  className="text-[11px] font-bold bg-[#18458b] text-white px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Book Room</span>
                </button>
              </div>

              <div className="space-y-2">
                {roomBookings.map((bk) => (
                  <div
                    key={bk.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-900">
                          {bk.roomNumber} ({bk.buildingName})
                        </span>
                        <p className="text-[10.5px] text-slate-500">
                          {bk.date} · {bk.timeSlot} · By {bk.userName || 'Student'}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          bk.status === 'confirmed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : bk.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {bk.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600">{bk.purpose}</p>

                    {bk.status === 'pending' && (
                      <div className="flex items-center justify-end gap-1.5 pt-1">
                        <button
                          onClick={() => updateRoomBookingStatus(bk.id, 'rejected')}
                          className="text-[10.5px] font-bold px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => updateRoomBookingStatus(bk.id, 'confirmed')}
                          className="text-[10.5px] font-bold px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                        >
                          Approve Booking
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Teaching Schedule Management (Week Scroll, Import, Edit, Add & Delete Classes) */}
            <div className="bg-white rounded-2xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 space-y-2.5">
              {scheduleToast && (
                <div className="bg-emerald-600 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-md flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{scheduleToast}</span>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Manage University Schedule ({scheduleItems.length} Total Classes)
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Scroll weeks, import classes, edit time/room or delete — syncs to enrolled students
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsImportScheduleOpen((prev) => !prev)}
                    className="text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Import Schedule</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddScheduleOpen(true)}
                    className="text-[11px] font-bold bg-[#18458b] hover:bg-blue-800 text-white px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Class</span>
                  </button>
                </div>
              </div>

              {/* Scrollable Week Navigator for Teacher */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Teacher previous week"
                    onClick={() => setSelectedWeekOffset((prev) => prev - 1)}
                    className="w-7 h-7 rounded-full hover:bg-white flex items-center justify-center text-slate-600 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-slate-800 px-1">
                    {weekSummary.rangeLabel}
                  </span>
                  <button
                    type="button"
                    aria-label="Teacher next week"
                    onClick={() => setSelectedWeekOffset((prev) => prev + 1)}
                    className="w-7 h-7 rounded-full hover:bg-white flex items-center justify-center text-slate-600 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-slate-500">
                    Week {weekSummary.activeWeekIso}
                  </span>
                  {selectedWeekOffset !== 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedWeekOffset(0)}
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-[#18458b] cursor-pointer"
                    >
                      Today
                    </button>
                  )}
                </div>
              </div>

              {/* Bulk Import Panel */}
              {isImportScheduleOpen && (
                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#18458b]">
                      Batch Import Timetable (CSV: COURSE,Day,Time,Room)
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setImportScope('week')}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer ${
                          importScope === 'week'
                            ? 'bg-[#18458b] text-white'
                            : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                      >
                        Week {weekSummary.activeWeekIso}
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportScope('recurring')}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer ${
                          importScope === 'recurring'
                            ? 'bg-[#18458b] text-white'
                            : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                      >
                        Recurring
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={3}
                    value={importCsvText}
                    onChange={(e) => setImportCsvText(e.target.value)}
                    className="w-full text-[11px] font-mono border border-blue-200 rounded-xl p-2 bg-white focus:outline-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsImportScheduleOpen(false)}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-white text-slate-600 border border-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleImportCsvSchedule}
                      className="text-[11px] font-bold px-3 py-1 rounded-lg bg-[#18458b] text-white cursor-pointer"
                    >
                      Import Classes Now
                    </button>
                  </div>
                </div>
              )}

              {(() => {
                const weekSchedule = scheduleItems.filter(
                  (cls) =>
                    !cls.weekStart ||
                    cls.weekStart === 'recurring' ||
                    cls.weekStart === weekSummary.activeWeekIso
                );
                const selectedCls =
                  weekSchedule.find((c) => c.id === selectedScheduleId) || null;
                const getCellColor = (color: ScheduleItem['color']) => {
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
                  <div className="space-y-3">
                    {/* Calendar Grid matching Student Schedule */}
                    <div className="bg-slate-50/40 rounded-xl p-2 border border-slate-200/80 overflow-x-auto">
                      <div className="grid grid-cols-[40px_repeat(5,1fr)] text-center border-b border-slate-200/80 pb-1.5 mb-1">
                        <div className="text-[10px] font-semibold text-slate-400"></div>
                        {SCHEDULE_DAYS.map((day, idx) => (
                          <div key={day} className="text-[11px] font-bold text-slate-700">
                            {day}{' '}
                            <span className="text-[9.5px] font-semibold text-slate-400">
                              {weekSummary.days[idx]?.date}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div>
                        {SCHEDULE_TIME_SLOTS.map((slot) => (
                          <div
                            key={slot.start}
                            className="grid grid-cols-[40px_repeat(5,1fr)] min-h-[38px] border-b border-slate-100 last:border-b-0 items-start"
                          >
                            <span className="text-[10px] text-slate-400 font-medium pt-0.5">
                              {slot.start}
                            </span>
                            {SCHEDULE_DAYS.map((day) => {
                              const itemsInSlot = weekSchedule.filter(
                                (it) => it.day === day && it.timeRowIndex === slot.row
                              );
                              return (
                                <div
                                  key={day}
                                  className="border-l border-slate-200/60 min-h-[38px] p-0.5 flex flex-col gap-0.5"
                                >
                                  {itemsInSlot.map((cls) => {
                                    const isSelected = selectedScheduleId === cls.id;
                                    return (
                                      <button
                                        key={cls.id}
                                        type="button"
                                        onClick={() => {
                                          if (isSelected) {
                                            setSelectedScheduleId(null);
                                            setEditingScheduleId(null);
                                          } else {
                                            setSelectedScheduleId(cls.id);
                                            setEditingScheduleId(null);
                                          }
                                        }}
                                        className={`w-full min-h-[44px] rounded-md p-1 text-left border flex flex-col justify-start transition-all cursor-pointer ${getCellColor(
                                          cls.color
                                        )} ${
                                          isSelected
                                            ? 'ring-2 ring-[#18458b] shadow-sm font-semibold'
                                            : 'opacity-90 hover:opacity-100'
                                        }`}
                                      >
                                        <span className="text-[9px] font-bold leading-tight truncate">
                                          {cls.courseCode} · {cls.groupName || 'CS-2401'}
                                        </span>
                                        <span className="text-[9px] font-semibold leading-tight break-words">
                                          {cls.courseName}
                                        </span>
                                        <span className="text-[8px] opacity-80 leading-none truncate mt-auto pt-0.5">
                                          {cls.room}
                                        </span>
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

                    {/* Selected Class Drawer: Details, Edit Form, Map & Delete */}
                    {selectedCls && (
                      <div className="p-3 rounded-xl bg-slate-50 border border-blue-200 space-y-2.5 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900">
                                {selectedCls.day} {selectedCls.startTime} · {selectedCls.courseName}
                              </span>
                              <span className="text-[10px] font-semibold bg-white px-1.5 py-0.2 rounded border border-slate-200 text-slate-600">
                                {selectedCls.groupName || 'CS-2401'}
                              </span>
                            </div>
                            <p className="text-[10.5px] text-slate-500 mt-0.5">
                              {selectedCls.room} ({selectedCls.building})
                            </p>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                if (editingScheduleId === selectedCls.id) {
                                  setEditingScheduleId(null);
                                } else {
                                  setEditingScheduleId(selectedCls.id);
                                  setEditCourseName(selectedCls.courseName);
                                  setEditCourseCode(selectedCls.courseCode);
                                  setEditDay(selectedCls.day);
                                  setEditStartTime(selectedCls.startTime);
                                  setEditRoom(selectedCls.room);
                                  setEditGroupName(selectedCls.groupName || 'CS-2401');
                                  setEditWeekStart(selectedCls.weekStart || 'recurring');
                                }
                              }}
                              className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>{editingScheduleId === selectedCls.id ? 'Close' : 'Edit'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => navigateToClassroom(selectedCls.room)}
                              className="text-[10.5px] font-bold text-[#18458b] bg-white border border-blue-200 px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
                            >
                              <MapPin className="w-3 h-3 text-blue-600" />
                              <span>Map</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                removeScheduleItem(selectedCls.id);
                                setSelectedScheduleId(null);
                                setEditingScheduleId(null);
                                setScheduleToast(`Removed "${selectedCls.courseName}"`);
                                setTimeout(() => setScheduleToast(null), 2500);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                              aria-label="Delete class"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedScheduleId(null);
                                setEditingScheduleId(null);
                              }}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                              aria-label="Close class details"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {editingScheduleId === selectedCls.id && (
                          <form
                            onSubmit={async (e) => {
                              e.preventDefault();
                              const slot =
                                SCHEDULE_TIME_SLOTS.find((s) => s.start === editStartTime) ||
                                SCHEDULE_TIME_SLOTS[1];
                              const roomObj =
                                SCHEDULE_ROOMS.find((r) => r.room === editRoom) ||
                                SCHEDULE_ROOMS[0];
                              await updateScheduleClass(selectedCls.id, {
                                courseName: editCourseName.trim() || selectedCls.courseName,
                                courseCode: editCourseCode.trim() || selectedCls.courseCode,
                                day: editDay,
                                startTime: slot.start,
                                endTime: slot.end,
                                timeRowIndex: slot.row,
                                room: roomObj.room,
                                building: roomObj.building,
                                groupName: editGroupName,
                                weekStart: editWeekStart,
                              });
                              setEditingScheduleId(null);
                              setScheduleToast(
                                `Updated "${editCourseName}" → ${editDay} ${slot.start} (${roomObj.room})`
                              );
                              setTimeout(() => setScheduleToast(null), 3000);
                            }}
                            className="bg-white border border-blue-200 rounded-xl p-2.5 space-y-2"
                          >
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                  Subject
                                </label>
                                <select
                                  value={editCourseName}
                                  onChange={(e) => {
                                    const selectedTitle = e.target.value;
                                    setEditCourseName(selectedTitle);
                                    const matched = teacherCourses.find(
                                      (c) => c.title === selectedTitle
                                    );
                                    if (matched) setEditCourseCode(matched.code);
                                  }}
                                  className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50"
                                >
                                  {teacherCourses.map((c) => (
                                    <option key={c.id} value={c.title}>
                                      {c.code} · {c.title}
                                    </option>
                                  ))}
                                  {!teacherCourses.some((c) => c.title === editCourseName) && (
                                    <option value={editCourseName}>{editCourseName}</option>
                                  )}
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                  Group
                                </label>
                                <select
                                  value={editGroupName}
                                  onChange={(e) => setEditGroupName(e.target.value)}
                                  className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50"
                                >
                                  <option value="CS-2401">CS-2401</option>
                                  <option value="SE-2402">SE-2402</option>
                                  <option value="IT-2403">IT-2403</option>
                                  <option value="ALL">ALL</option>
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                  Repeat
                                </label>
                                <select
                                  value={editWeekStart}
                                  onChange={(e) => setEditWeekStart(e.target.value)}
                                  className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50"
                                >
                                  <option value="recurring">Every Week</option>
                                  <option value={weekSummary.activeWeekIso}>
                                    Week {weekSummary.activeWeekIso}
                                  </option>
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                  Day
                                </label>
                                <select
                                  value={editDay}
                                  onChange={(e) =>
                                    setEditDay(e.target.value as ScheduleItem['day'])
                                  }
                                  className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50"
                                >
                                  {SCHEDULE_DAYS.map((d) => (
                                    <option key={d} value={d}>
                                      {d}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                  Time
                                </label>
                                <select
                                  value={editStartTime}
                                  onChange={(e) => setEditStartTime(e.target.value)}
                                  className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50"
                                >
                                  {SCHEDULE_TIME_SLOTS.map((s) => (
                                    <option key={s.start} value={s.start}>
                                      {s.start} - {s.end}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                  Room
                                </label>
                                <select
                                  value={editRoom}
                                  onChange={(e) => setEditRoom(e.target.value)}
                                  className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50"
                                >
                                  {SCHEDULE_ROOMS.map((r) => (
                                    <option key={r.room} value={r.room}>
                                      {r.room}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="flex justify-end gap-1.5 pt-1">
                              <button
                                type="button"
                                onClick={() => setEditingScheduleId(null)}
                                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="text-[11px] font-bold px-3 py-1 rounded-lg bg-[#18458b] text-white cursor-pointer"
                              >
                                Save
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
