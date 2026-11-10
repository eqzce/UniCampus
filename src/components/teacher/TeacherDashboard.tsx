import React, { useState, useMemo } from 'react';
import { Header } from '../common/Header';
import { useApp } from '../../context/AppContext';
import { CampusMapScreen } from '../map/CampusMapScreen';
import type { AssessmentCategory, AttendanceStatusType, TeacherTabType } from '../../types';
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
} from 'lucide-react';

const GRADE_CATEGORIES = ['Assignment', 'Midterm 1', 'Midterm 2', 'Final'] as const;
const STUDENT_GROUPS = ['ALL', 'CS-2401', 'SE-2402'] as const;

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
    submitTeacherGrade,
    submitTeacherAttendance,
    publishTeacherTask,
    removeAssignment,
    updateRoomBookingStatus,
    setIsBookingOpen,
    setIsAddScheduleOpen,
    navigateToClassroom,
    isOfflineMode,
    switchDemoRole,
  } = useApp();

  const activeTab = forcedTab || teacherActiveTab;

  // Shared filter states
  const [selectedCourseCode, setSelectedCourseCode] = useState<string>(
    courses[0]?.code || 'PHYS101'
  );
  const [selectedGroup, setSelectedGroup] = useState<string>('CS-2401');

  // Gradebook modal/inline editor state
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [gradeCategory, setGradeCategory] = useState<string>('Assignment');
  const [gradeScore, setGradeScore] = useState<string>('95');
  const [gradeFeedback, setGradeFeedback] = useState<string>('');
  const [gradeToast, setGradeToast] = useState<string | null>(null);

  // Attendance state
  const [attendanceDate, setAttendanceDate] = useState<string>('2026-10-28');
  const [attendanceDraft, setAttendanceDraft] = useState<Record<string, AttendanceStatusType>>({});
  const [attendanceToast, setAttendanceToast] = useState<string | null>(null);

  // Task / Deadline creator state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState<AssessmentCategory>('assignment');
  const [taskGroup, setTaskGroup] = useState('CS-2401');
  const [taskDueDate, setTaskDueDate] = useState('Nov 06, 23:59');
  const [taskWeight, setTaskWeight] = useState('15%');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskToast, setTaskToast] = useState<string | null>(null);

  const selectedCourseObj = useMemo(
    () => courses.find((c) => c.code === selectedCourseCode) || courses[0],
    [courses, selectedCourseCode]
  );

  const filteredStudents = useMemo(() => {
    // Deduplicate by full_name so Arystan's two demo emails show cleanly
    const seenNames = new Set<string>();
    return studentsList.filter((st) => {
      if (selectedGroup !== 'ALL' && st.group_name !== selectedGroup) return false;
      if (seenNames.has(st.full_name)) return false;
      seenNames.add(st.full_name);
      return true;
    });
  }, [studentsList, selectedGroup]);

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
    await publishTeacherTask({
      course_id: selectedCourseObj?.id,
      course_code: selectedCourseCode,
      group_name: taskGroup,
      title: taskTitle.trim(),
      description: taskDescription.trim(),
      due_date: taskDueDate.trim() || 'Nov 06, 23:59',
      category: taskCategory,
      weight: taskWeight,
    });
    setTaskToast(`Published "${taskTitle.trim()}" to ${taskGroup}`);
    setTaskTitle('');
    setTaskDescription('');
    setTimeout(() => setTaskToast(null), 3000);
  };

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'gradebook':
        return 'TEACHER GRADEBOOK';
      case 'attendance':
        return 'ATTENDANCE TRACKER';
      case 'tasks':
        return 'DEADLINE CREATOR';
      case 'schedule':
        return 'ROOMS & SCHEDULE';
      default:
        return 'TEACHER PORTAL';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f6fa] relative overflow-hidden select-none">
      <Header
        title={getHeaderTitle()}
        subtitle={`${currentUser?.full_name || 'Dr. Yersultan M.'} · Faculty Portal`}
      />

      <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3 pb-20">
        {/* Top Teacher Status & Role Switch Banner */}
        <div className="flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/70 rounded-xl px-3 py-2 text-xs text-emerald-950">
          <div className="flex items-center gap-1.5 font-semibold truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <span className="truncate">
              {isOfflineMode ? 'Offline Faculty Mode' : 'Live Synced with Student App'}
            </span>
          </div>
          <button
            onClick={() => switchDemoRole('student')}
            className="text-[10.5px] font-bold text-[#18458b] bg-white hover:bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs shrink-0 cursor-pointer"
            title="Preview how changes appear in the Student interface"
          >
            View as Student →
          </button>
        </div>

        {/* Course & Student Group Filter Bar (used in Gradebook & Attendance) */}
        {(activeTab === 'gradebook' || activeTab === 'attendance' || activeTab === 'tasks') && (
          <div className="bg-white rounded-2xl p-3 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 space-y-2.5">
            {/* Course Selector Chips */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Select Course
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                {courses.map((c) => {
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
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#18458b] flex items-center justify-center">
                  <CalendarPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Publish Homework / Exam Deadline
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Immediately syncs to Student Upcoming Deadlines & Grades
                  </p>
                </div>
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
                <span>Publish Deadline to {taskGroup}</span>
              </button>
            </form>

            {/* Published Deadlines List */}
            <div className="bg-white rounded-2xl p-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 space-y-2">
              <h4 className="text-xs font-bold text-slate-800">
                Active Course Deadlines ({assignments.length})
              </h4>
              {assignments.slice(0, 8).map((asg) => (
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
                  <button
                    onClick={() => removeAssignment(asg.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                    title="Delete deadline"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
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

            {/* Teaching Schedule */}
            <div className="bg-white rounded-2xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900">Teaching Schedule</h3>
                <button
                  onClick={() => setIsAddScheduleOpen(true)}
                  className="text-[11px] font-bold text-[#18458b] bg-blue-50 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Lecture</span>
                </button>
              </div>

              <div className="space-y-2">
                {scheduleItems.map((cls) => (
                  <div
                    key={cls.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">
                          {cls.day} {cls.startTime} · {cls.courseName}
                        </span>
                        <span className="text-[10px] font-semibold bg-white px-1.5 py-0.2 rounded border border-slate-200 text-slate-600">
                          {cls.groupName || 'CS-2401'}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-500 mt-0.5">
                        {cls.room} ({cls.building}) · {cls.professor}
                      </p>
                    </div>

                    <button
                      onClick={() => navigateToClassroom(cls.room)}
                      className="text-[10.5px] font-bold text-[#18458b] bg-white border border-blue-200 px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <MapPin className="w-3 h-3 text-blue-600" />
                      <span>Map</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
