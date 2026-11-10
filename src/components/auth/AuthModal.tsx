import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getApiBaseUrl, setCustomApiBaseUrl } from '../../config/apiConfig';
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
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Server,
  WifiOff,
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    loginWithCredentials,
    registerAccount,
    switchDemoRole,
    currentUser,
    userRole,
    isColdStarting,
    isOfflineMode,
    setIsOfflineMode,
  } = useApp();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<UserRole>(userRole);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [groupName, setGroupName] = useState('CS-2401');
  const [department, setDepartment] = useState('Department of Computer Science');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [apiUrlInput, setApiUrlInput] = useState(getApiBaseUrl());
  const [apiSavedMsg, setApiSavedMsg] = useState(false);

  if (!isAuthModalOpen) return null;

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
          department: role === 'teacher' ? department : undefined,
        });
      }
      setIsAuthModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (targetRole: UserRole) => {
    setError(null);
    setLoading(true);
    try {
      await switchDemoRole(targetRole);
      setIsAuthModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiUrl = () => {
    setCustomApiBaseUrl(apiUrlInput);
    setApiSavedMsg(true);
    setTimeout(() => setApiSavedMsg(false), 2000);
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
              <h3 className="text-base font-bold tracking-tight">UniCampus Portal</h3>
              <p className="text-[11px] text-blue-100/90">
                Role-Based Cloud Access (Student & Teacher RBAC)
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
          {/* Render Cold-Start Warning Banner */}
          {isColdStarting && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900 flex items-start gap-2">
              <Loader2 className="w-4 h-4 text-amber-600 animate-spin shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Waking up Render PostgreSQL Cloud Server...</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Render Free Tier instances may take up to 30–60 seconds to spin up on the first request. Please wait...
                </p>
              </div>
            </div>
          )}

          {/* Quick Demo Role Switcher (Student / Teacher / Admin) */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Instant Test Accounts (1-Click)
              </span>
              {currentUser && (
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  Active: {currentUser.role.toUpperCase()}
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleDemoLogin('student')}
                className={`flex flex-col items-start gap-1 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  userRole === 'student'
                    ? 'bg-blue-50/90 border-[#18458b] text-[#18458b] ring-1 ring-[#18458b]/20'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-[#18458b] text-white flex items-center justify-center shrink-0">
                  <GraduationCap className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 w-full">
                  <div className="text-[11px] font-bold truncate">Student</div>
                  <div className="text-[9.5px] text-slate-500 truncate">student123</div>
                </div>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleDemoLogin('teacher')}
                className={`flex flex-col items-start gap-1 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  userRole === 'teacher'
                    ? 'bg-emerald-50/90 border-emerald-600 text-emerald-900 ring-1 ring-emerald-600/20'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Briefcase className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 w-full">
                  <div className="text-[11px] font-bold truncate">Teacher</div>
                  <div className="text-[9.5px] text-slate-500 truncate">teacher123</div>
                </div>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleDemoLogin('admin')}
                className={`flex flex-col items-start gap-1 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  userRole === 'admin'
                    ? 'bg-purple-50/90 border-purple-700 text-purple-900 ring-1 ring-purple-700/20'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-purple-700 text-white flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 w-full">
                  <div className="text-[11px] font-bold truncate">Admin</div>
                  <div className="text-[9.5px] text-slate-500 truncate">admin123</div>
                </div>
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Main Login / Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Role Selector during Registration */}
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
                    placeholder={role === 'student' ? 'e.g. Sanzhar Akhmetov' : 'e.g. Prof. Aidar K.'}
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
                  placeholder="student@astanait.edu.kz or teacher@astanait.edu.kz"
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
                  placeholder="•••••••• (Demo: password123)"
                  className="w-full text-xs border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#18458b]/20"
                />
              </div>
            </div>

            {mode === 'register' && role === 'student' && (
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
                  </select>
                </div>
              </div>
            )}

            {mode === 'register' && role === 'teacher' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Academic Department
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-[#18458b] hover:bg-[#14366d] active:scale-98 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {mode === 'login'
                  ? 'Sign In to UniCampus'
                  : `Register as ${role === 'teacher' ? 'Teacher' : 'Student'}`}
              </span>
            </button>
          </form>

          {/* Offline Mode & Server Endpoint Settings for APK / Render */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={() => {
                setIsOfflineMode(!isOfflineMode);
                if (!isOfflineMode) setIsAuthModalOpen(false);
              }}
              className={`flex items-center gap-1 font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                isOfflineMode
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <WifiOff className="w-3.5 h-3.5" />
              <span>{isOfflineMode ? 'Offline Mode: ON' : 'Use Offline Mode'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowApiConfig(!showApiConfig)}
              className="flex items-center gap-1 text-slate-500 hover:text-[#18458b] font-semibold"
            >
              <Server className="w-3.5 h-3.5" />
              <span>Render API Config</span>
            </button>
          </div>

          {showApiConfig && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2 text-xs">
              <div className="font-bold text-slate-700 flex items-center justify-between">
                <span>Backend Server URL (Render / Local)</span>
                {apiSavedMsg && (
                  <span className="text-emerald-600 flex items-center gap-1 text-[10px]">
                    <CheckCircle2 className="w-3 h-3" /> Saved
                  </span>
                )}
              </div>
              <input
                type="url"
                value={apiUrlInput}
                onChange={(e) => setApiUrlInput(e.target.value)}
                placeholder="https://unicampus-api.onrender.com/api"
                className="w-full text-[11px] border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white font-mono"
              />
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setCustomApiBaseUrl(null);
                    setApiUrlInput(getApiBaseUrl());
                  }}
                  className="text-[10px] px-2 py-1 rounded bg-slate-200 text-slate-700 font-semibold"
                >
                  Reset Default
                </button>
                <button
                  type="button"
                  onClick={handleSaveApiUrl}
                  className="text-[10px] px-2.5 py-1 rounded bg-[#18458b] text-white font-semibold"
                >
                  Save Endpoint
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
