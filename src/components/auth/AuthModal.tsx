import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { UserRole } from '../../types';
import {
  GraduationCap,
  Briefcase,
  ShieldCheck,
  Mail,
  Lock,
  User,
  Users,
  Building2,
  BookOpen,
  X,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    loginWithCredentials,
    registerAccount,
    courses,
    isColdStarting,
  } = useApp();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<UserRole>('student');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [groupName, setGroupName] = useState('CS-2401');
  const [department, setDepartment] = useState('Department of Computer Science');
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>(() =>
    courses.slice(0, 3).map((c) => c.id)
  );
  const [teacherCourseCode, setTeacherCourseCode] = useState('');
  const [teacherCourseTitle, setTeacherCourseTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const toggleCourseSelection = (courseId: string) => {
    setSelectedCourseIds((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await loginWithCredentials(email, password);
      } else {
        await registerAccount({
          email,
          password,
          full_name: fullName,
          role,
          group_name: role === 'student' ? groupName : undefined,
          department: role !== 'student' ? department : undefined,
          enrolled_course_ids:
            role === 'student'
              ? selectedCourseIds.length > 0
                ? selectedCourseIds
                : courses.map((c) => c.id)
              : undefined,
          course_code: role === 'teacher' && teacherCourseCode.trim() ? teacherCourseCode.trim() : undefined,
          course_title: role === 'teacher' && teacherCourseTitle.trim() ? teacherCourseTitle.trim() : undefined,
        });
      }
      setIsAuthModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-in fade-in duration-150">
      <div
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#18458b] via-[#1d55ad] to-blue-600 text-white px-5 py-4 relative">
          <button
            onClick={() => setIsAuthModalOpen(false)}
            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
            aria-label="Close authentication modal"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shadow-inner">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">UniCampus Account</h3>
              <p className="text-[11px] text-blue-100/90">
                Sign In or Create Student / Teacher / Admin Account
              </p>
            </div>
          </div>

          {/* Login / Register Mode Switcher */}
          <div className="mt-3.5 bg-slate-900/25 p-1 rounded-xl flex items-center">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                mode === 'login' ? 'bg-white text-[#18458b] shadow-xs' : 'text-blue-100 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
                if (selectedCourseIds.length === 0 && courses.length > 0) {
                  setSelectedCourseIds(courses.map((c) => c.id));
                }
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                mode === 'register' ? 'bg-white text-[#18458b] shadow-xs' : 'text-blue-100 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-slate-800">
          {isColdStarting && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900 flex items-start gap-2">
              <Loader2 className="w-4 h-4 text-amber-600 animate-spin shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Waking up Cloud Database Server...</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Server cold start may take a few seconds on first request. Please wait...
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Main Login / Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                  Select Role <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('student')}
                    className={`py-2 px-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                      role === 'student'
                        ? 'bg-[#18458b] text-white border-[#18458b] shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Student</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('teacher')}
                    className={`py-2 px-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                      role === 'teacher'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Teacher</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`py-2 px-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                      role === 'admin'
                        ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Admin</span>
                  </button>
                </div>
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={
                      role === 'student'
                        ? 'e.g. Sanzhar Akhmetov'
                        : role === 'teacher'
                          ? 'e.g. Prof. Nurlan K.'
                          : 'e.g. Admin Saltanat M.'
                    }
                    className="w-full text-xs border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#18458b]/20"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                University Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@unicampus.kz or teacher@unicampus.kz"
                  className="w-full text-xs border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#18458b]/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full text-xs border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#18458b]/20"
                />
              </div>
            </div>

            {mode === 'register' && role === 'student' && (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Student Group
                  </label>
                  <div className="relative">
                    <Users className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <select
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 bg-slate-50/70 focus:bg-white focus:outline-none"
                    >
                      <option value="CS-2401">CS-2401 (Computer Science)</option>
                      <option value="SE-2402">SE-2402 (Software Engineering)</option>
                      <option value="IT-2403">IT-2403 (Information Technology)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-[#18458b]" />
                    <span>Enrolled Subjects ({selectedCourseIds.length})</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {courses.map((course) => {
                      const active = selectedCourseIds.includes(course.id);
                      return (
                        <button
                          key={course.id}
                          type="button"
                          onClick={() => toggleCourseSelection(course.id)}
                          className={`text-[10.5px] font-bold px-2.5 py-1 rounded-lg border transition-colors ${
                            active
                              ? 'bg-blue-50 text-[#18458b] border-blue-300'
                              : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}
                        >
                          {course.code}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {mode === 'register' && (role === 'teacher' || role === 'admin') && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {role === 'admin' ? 'Administrative Unit' : 'Academic Department'}
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Department of Computer Science"
                    className="w-full text-xs border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 bg-slate-50/70 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            )}

            {mode === 'register' && role === 'teacher' && (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Subject Code (opt)
                  </label>
                  <input
                    type="text"
                    value={teacherCourseCode}
                    onChange={(e) => setTeacherCourseCode(e.target.value)}
                    placeholder="e.g. AI201"
                    className="w-full text-xs border border-slate-200 rounded-xl px-2.5 py-2 bg-slate-50/70 focus:bg-white focus:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Subject Title (opt)
                  </label>
                  <input
                    type="text"
                    value={teacherCourseTitle}
                    onChange={(e) => setTeacherCourseTitle(e.target.value)}
                    placeholder="e.g. Applied Machine Learning"
                    className="w-full text-xs border border-slate-200 rounded-xl px-2.5 py-2 bg-slate-50/70 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-[#18458b] hover:bg-[#14366d] active:scale-98 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {mode === 'login'
                  ? 'Sign In to UniCampus'
                  : `Register as ${
                      role === 'admin' ? 'Administrator' : role === 'teacher' ? 'Teacher' : 'Student'
                    }`}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
