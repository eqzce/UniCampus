import React, { useState } from 'react';
import { Header } from '../common/Header';
import { useApp } from '../../context/AppContext';
import { TeacherDashboard } from '../teacher/TeacherDashboard';
import { CampusMapScreen } from '../map/CampusMapScreen';
import type { AdminTabType } from '../../types';
import {
  BookOpen,
  UserPlus,
  Plus,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  Briefcase,
  GraduationCap,
  CalendarClock,
  Award,
  UserCheck,
  ClipboardList,
} from 'lucide-react';

interface AdminDashboardProps {
  forcedTab?: AdminTabType;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ forcedTab }) => {
  const {
    adminActiveTab,
    setAdminActiveTab,
    currentUser,
    courses,
    teachersList,
    studentsList,
    scheduleItems,
    createSubject,
    updateSubject,
    deleteSubject,
    createTeacherAccount,
    switchDemoRole,
  } = useApp();

  const activeTab = forcedTab || adminActiveTab;

  // Add New Subject Form State
  const [subjectTitle, setSubjectTitle] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectCredits, setSubjectCredits] = useState('5');
  const [selectedTeacherId, setSelectedTeacherId] = useState(
    teachersList[0]?.id || 'usr-teacher-1'
  );
  const [adminToast, setAdminToast] = useState<string | null>(null);

  // Add New Teacher Modal/Inline Form State
  const [showAddTeacherForm, setShowAddTeacherForm] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherDept, setNewTeacherDept] = useState('Department of Computer Science');

  if (activeTab === 'map') {
    return <CampusMapScreen />;
  }

  // Admin has access to all Teacher & System capabilities (Schedule, Gradebook, Attendance, Deadlines)
  if (
    activeTab === 'schedule' ||
    activeTab === 'gradebook' ||
    activeTab === 'attendance' ||
    activeTab === 'tasks'
  ) {
    return <TeacherDashboard forcedTab={activeTab} />;
  }

  const showToast = (msg: string) => {
    setAdminToast(msg);
    setTimeout(() => setAdminToast(null), 3200);
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectTitle.trim() || !subjectCode.trim()) return;
    const teacherId = selectedTeacherId || teachersList[0]?.id || 'usr-teacher-1';
    const created = await createSubject({
      title: subjectTitle.trim(),
      code: subjectCode.trim().toUpperCase(),
      credits: Number(subjectCredits) || 5,
      teacher_id: teacherId,
    });
    const teacherName =
      teachersList.find((t) => t.id === teacherId)?.full_name || created.teacher_name || 'Teacher';
    showToast(`Added subject "${created.code}: ${created.title}" → Bound to ${teacherName}`);
    setSubjectTitle('');
    setSubjectCode('');
    setSubjectCredits('5');
  };

  const handleReassignTeacher = async (courseId: string, newTeacherId: string) => {
    await updateSubject(courseId, { teacher_id: newTeacherId });
    const courseObj = courses.find((c) => c.id === courseId);
    const teacherObj = teachersList.find((t) => t.id === newTeacherId);
    showToast(
      `Bound "${courseObj?.code || 'Course'}" to ${teacherObj?.full_name || 'Selected Teacher'}`
    );
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName.trim() || !newTeacherEmail.trim()) return;
    const created = await createTeacherAccount({
      full_name: newTeacherName.trim(),
      email: newTeacherEmail.trim(),
      department: newTeacherDept.trim(),
    });
    setSelectedTeacherId(created.id);
    setNewTeacherName('');
    setNewTeacherEmail('');
    setShowAddTeacherForm(false);
    showToast(`Added teacher "${created.full_name}" — now available to bind to subjects!`);
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f6fa] relative overflow-hidden select-none">
      <Header
        title="ADMIN PORTAL"
        subtitle={`${currentUser?.full_name || 'Aidar K.'} · University Registry & RBAC`}
      />

      <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3 pb-20">
        {/* Top Admin Role Status Banner */}
        <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/80 rounded-xl px-3 py-2 text-xs text-purple-950">
          <div className="flex items-center gap-1.5 font-bold truncate">
            <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0" />
            <span className="truncate">Full Admin Control (Subjects, Teachers, Schedule & Grades)</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => switchDemoRole('teacher')}
              className="text-[10px] font-bold text-emerald-800 bg-white hover:bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 cursor-pointer"
            >
              Teacher →
            </button>
            <button
              onClick={() => switchDemoRole('student')}
              className="text-[10px] font-bold text-[#18458b] bg-white hover:bg-blue-50 px-2 py-1 rounded-lg border border-blue-200 cursor-pointer"
            >
              Student →
            </button>
          </div>
        </div>

        {/* Admin Quick Stats & All-Features Shortcuts */}
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => setAdminActiveTab('schedule')}
            className="bg-white rounded-xl p-2.5 border border-slate-100 shadow-2xs text-left hover:border-purple-200 transition-all cursor-pointer"
          >
            <CalendarClock className="w-4 h-4 text-purple-600 mb-1" />
            <div className="text-xs font-black text-slate-900">{scheduleItems.length}</div>
            <div className="text-[9.5px] font-semibold text-slate-500 truncate">Schedule</div>
          </button>

          <button
            onClick={() => setAdminActiveTab('gradebook')}
            className="bg-white rounded-xl p-2.5 border border-slate-100 shadow-2xs text-left hover:border-purple-200 transition-all cursor-pointer"
          >
            <Award className="w-4 h-4 text-amber-600 mb-1" />
            <div className="text-xs font-black text-slate-900">{studentsList.length}</div>
            <div className="text-[9.5px] font-semibold text-slate-500 truncate">Grade DB</div>
          </button>

          <button
            onClick={() => setAdminActiveTab('attendance')}
            className="bg-white rounded-xl p-2.5 border border-slate-100 shadow-2xs text-left hover:border-purple-200 transition-all cursor-pointer"
          >
            <UserCheck className="w-4 h-4 text-emerald-600 mb-1" />
            <div className="text-xs font-black text-slate-900">{teachersList.length}</div>
            <div className="text-[9.5px] font-semibold text-slate-500 truncate">Teachers</div>
          </button>

          <button
            onClick={() => setAdminActiveTab('tasks')}
            className="bg-white rounded-xl p-2.5 border border-slate-100 shadow-2xs text-left hover:border-purple-200 transition-all cursor-pointer"
          >
            <ClipboardList className="w-4 h-4 text-blue-600 mb-1" />
            <div className="text-xs font-black text-slate-900">{courses.length}</div>
            <div className="text-[9.5px] font-semibold text-slate-500 truncate">Subjects</div>
          </button>
        </div>

        {adminToast && (
          <div className="bg-purple-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-md flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{adminToast}</span>
          </div>
        )}

        {/* ================================================================= */}
        {/* 1. CREATE NEW SUBJECT & BIND TEACHER                              */}
        {/* ================================================================= */}
        <form
          onSubmit={handleCreateSubject}
          className="bg-white rounded-2xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  Add New Subject & Bind Teacher
                </h3>
                <p className="text-[10px] text-slate-400">
                  Creates a course in PostgreSQL and assigns a faculty teacher
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAddTeacherForm(!showAddTeacherForm)}
              className="text-[10.5px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
            >
              <UserPlus className="w-3 h-3" />
              <span>+ New Teacher</span>
            </button>
          </div>

          {/* Optional Quick Add Teacher Sub-form */}
          {showAddTeacherForm && (
            <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-3 space-y-2 animate-in fade-in duration-150">
              <div className="text-[11px] font-bold text-purple-900 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" />
                <span>Register New Faculty Teacher in DB</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  placeholder="Full Name (e.g. Prof. Serik A.)"
                  className="text-xs border border-purple-200 rounded-lg px-2.5 py-1.5 bg-white"
                />
                <input
                  type="email"
                  value={newTeacherEmail}
                  onChange={(e) => setNewTeacherEmail(e.target.value)}
                  placeholder="Email (serik@unicampus.kz)"
                  className="text-xs border border-purple-200 rounded-lg px-2.5 py-1.5 bg-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newTeacherDept}
                  onChange={(e) => setNewTeacherDept(e.target.value)}
                  placeholder="Department"
                  className="flex-1 text-xs border border-purple-200 rounded-lg px-2.5 py-1.5 bg-white"
                />
                <button
                  type="button"
                  onClick={handleAddTeacher}
                  className="text-xs font-bold bg-purple-700 hover:bg-purple-800 text-white px-3 py-1.5 rounded-lg shrink-0 cursor-pointer"
                >
                  Save Teacher
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-[10.5px] font-bold text-slate-700 mb-1">
                Subject / Course Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={subjectTitle}
                onChange={(e) => setSubjectTitle(e.target.value)}
                placeholder="e.g. Machine Learning & AI"
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/70 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10.5px] font-bold text-slate-700 mb-1">
                Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value.toUpperCase())}
                placeholder="CS305"
                className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/70 uppercase focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-[10.5px] font-bold text-slate-700 mb-1">
                Bind Teacher (Assigned Instructor) <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-xl px-2.5 py-2 bg-slate-50 font-medium text-slate-800"
              >
                {teachersList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name} ({t.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10.5px] font-bold text-slate-700 mb-1">
                ECTS Credits
              </label>
              <select
                value={subjectCredits}
                onChange={(e) => setSubjectCredits(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-xl px-2.5 py-2 bg-slate-50"
              >
                <option value="3">3 Credits</option>
                <option value="4">4 Credits</option>
                <option value="5">5 Credits</option>
                <option value="6">6 Credits</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Subject & Bind Teacher</span>
          </button>
        </form>

        {/* ================================================================= */}
        {/* 2. EXISTING SUBJECTS & TEACHER BINDING LIST                       */}
        {/* ================================================================= */}
        <div className="bg-white rounded-2xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900">
                University Subjects & Teacher Bindings ({courses.length})
              </h3>
              <p className="text-[10px] text-slate-400">
                Change the bound teacher for any subject below to reassign courses in real time
              </p>
            </div>
            <GraduationCap className="w-4 h-4 text-purple-600" />
          </div>

          <div className="space-y-2">
            {courses.map((course) => {
              const boundTeacherId =
                course.teacher_id ||
                teachersList.find((t) => t.full_name === course.teacher_name)?.id ||
                teachersList[0]?.id ||
                'usr-teacher-1';

              return (
                <div
                  key={course.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md text-[10.5px]">
                          {course.code}
                        </span>
                        <span className="font-bold text-slate-900">{course.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                        {course.credits} ECTS Credits · Bound Instructor:{' '}
                        <b className="text-slate-700">
                          {teachersList.find((t) => t.id === boundTeacherId)?.full_name ||
                            course.teacher_name ||
                            'Dr. Yersultan M.'}
                        </b>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        deleteSubject(course.id);
                        showToast(`Deleted subject "${course.code} - ${course.title}"`);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                      title="Delete subject"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Teacher Binding Selector */}
                  <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-200/60">
                    <span className="text-[10.5px] font-semibold text-slate-600 flex items-center gap-1 shrink-0">
                      <Briefcase className="w-3 h-3 text-emerald-600" />
                      <span>Assigned Teacher:</span>
                    </span>
                    <select
                      value={boundTeacherId}
                      onChange={(e) => handleReassignTeacher(course.id, e.target.value)}
                      className="flex-1 max-w-[210px] text-[11px] font-semibold border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-800 cursor-pointer"
                    >
                      {teachersList.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
