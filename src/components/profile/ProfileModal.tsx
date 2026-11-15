import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Award,
  GraduationCap,
  Mail,
  IdCard,
  BookOpen,
  ShieldCheck,
  Briefcase,
  LogIn,
} from 'lucide-react';

export const ProfileModal: React.FC = () => {
  const {
    isProfileOpen,
    setIsProfileOpen,
    student,
    userRole,
    currentUser,
    setIsAuthModalOpen,
    isOfflineMode,
    setIsOfflineMode,
    saveAllForOffline,
  } = useApp();

  const [offlineSavedNotice, setOfflineSavedNotice] = useState(false);

  if (!isProfileOpen) return null;

  const isTeacher = userRole === 'teacher';
  const isAdmin = userRole === 'admin';
  const initials = (currentUser?.full_name || student.fullName)
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-[#18458b] via-[#1d55ad] to-[#2563eb] pt-6 pb-12 px-6 relative text-white">
          <button
            onClick={() => setIsProfileOpen(false)}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
            aria-label="Close profile"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <ShieldCheck className="w-5 h-5 text-purple-200" />
            ) : isTeacher ? (
              <Briefcase className="w-5 h-5 text-emerald-300" />
            ) : (
              <GraduationCap className="w-5 h-5 text-sky-200" />
            )}
            <span className="text-xs font-semibold tracking-wider uppercase text-sky-100">
              {isAdmin
                ? 'Administrator Profile'
                : isTeacher
                  ? 'Faculty Teacher Profile'
                  : 'Student Profile'}
            </span>
          </div>
          <p className="text-[11px] text-sky-200/90 mt-0.5">{student.university}</p>
        </div>

        {/* Content Body with overlapping Avatar */}
        <div className="px-6 pb-6 pt-0 relative">
          {/* Avatar and GPA / Role Badge */}
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-400 via-sky-500 to-indigo-600 p-0.5 shadow-lg">
                <div className="w-full h-full bg-[#18458b] rounded-[14px] flex items-center justify-center text-white font-black text-2xl shadow-inner tracking-wider">
                  {initials}
                </div>
              </div>
              <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></span>
            </div>

            {isAdmin ? (
              <div className="bg-purple-50 border border-purple-200 rounded-2xl px-3.5 py-2 text-right shadow-2xs">
                <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                  Role Access
                </div>
                <div className="text-sm font-black text-purple-950">ADMIN</div>
              </div>
            ) : isTeacher ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-3.5 py-2 text-right shadow-2xs">
                <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                  Role Access
                </div>
                <div className="text-sm font-black text-emerald-950">TEACHER</div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/70 rounded-2xl px-3.5 py-1.5 text-right shadow-2xs">
                <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1 justify-end">
                  <Award className="w-3 h-3 text-amber-500" />
                  <span>GPA</span>
                </div>
                <div className="text-xl font-black text-slate-900 leading-tight">
                  {student.gpa.toFixed(2)}
                  <span className="text-[11px] font-normal text-slate-400">
                    {' '}
                    / {student.maxGpa.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Name & Major / Department */}
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-900 leading-tight">
              {currentUser?.full_name || student.fullName}
            </h3>
            <p className="text-xs font-semibold text-blue-700 mt-0.5">
              {isAdmin
                ? currentUser?.department || 'University Academic Affairs & Registry'
                : isTeacher
                  ? currentUser?.department || 'Department of Physics'
                  : `${student.major} · Group ${student.groupName || 'CS-2401'}`}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isAdmin
                ? 'Astana IT University Administration'
                : isTeacher
                  ? 'Astana IT University Faculty'
                  : `${student.academicYear} · ${student.faculty}`}
            </p>
          </div>

          {/* Details List */}
          <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-100 space-y-2.5 mb-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <IdCard className="w-3.5 h-3.5 text-slate-400" />
                {isAdmin ? 'Admin ID' : isTeacher ? 'Faculty ID' : 'Student ID'}
              </span>
              <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200/70 text-[11px]">
                {isAdmin ? 'ADM-2026-0001' : isTeacher ? 'FAC-2024-0104' : student.studentId}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                Email
              </span>
              <span className="font-medium text-slate-700 text-[11px] truncate max-w-[170px]">
                {currentUser?.email || student.email}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                {isAdmin || isTeacher ? 'Permissions' : 'Scholarship'}
              </span>
              <span className="font-semibold text-emerald-700 text-[11px] text-right max-w-[190px]">
                {isAdmin
                  ? 'Full Campus & RBAC Management'
                  : isTeacher
                    ? 'Gradebook, Homework & Schedule'
                    : student.scholarshipStatus}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                Institution
              </span>
              <span className="font-medium text-slate-700 text-[11px]">
                AITU (Astana)
              </span>
            </div>
          </div>

          {/* Settings: Online / Offline Mode & Cache Sync */}
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Settings
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isOfflineMode
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {isOfflineMode ? 'Offline Mode' : 'Online Mode'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsOfflineMode(!isOfflineMode)}
                className={`flex-1 text-xs font-bold py-2 px-3 rounded-xl border transition-colors cursor-pointer ${
                  isOfflineMode
                    ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                    : 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                }`}
              >
                {isOfflineMode ? 'Offline: ON' : 'Online: ON'}
              </button>
              <button
                type="button"
                onClick={() => {
                  saveAllForOffline();
                  setOfflineSavedNotice(true);
                  setTimeout(() => setOfflineSavedNotice(false), 2200);
                }}
                className="text-xs font-bold py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-[#18458b] border border-blue-200 transition-colors cursor-pointer"
              >
                {offlineSavedNotice ? 'Saved!' : 'Save Offline'}
              </button>
            </div>
          </div>

          {/* Account Authentication Button (Role switching via real sign-in/registration only) */}
          <div className="space-y-2">
            <button
              onClick={() => {
                setIsProfileOpen(false);
                setIsAuthModalOpen(true);
              }}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Switch Account</span>
            </button>

            <button
              onClick={() => setIsProfileOpen(false)}
              className="w-full bg-[#18458b] hover:bg-[#14366d] active:scale-98 text-white font-semibold text-xs py-2.5 rounded-xl shadow-sm transition-all cursor-pointer"
            >
              Close Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
