import React from 'react';
import { useApp } from '../../context/AppContext';
import { X, Award, GraduationCap, Mail, IdCard, BookOpen, ShieldCheck } from 'lucide-react';

export const ProfileModal: React.FC = () => {
  const { isProfileOpen, setIsProfileOpen, student } = useApp();

  if (!isProfileOpen) return null;

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
            <GraduationCap className="w-5 h-5 text-sky-200" />
            <span className="text-xs font-semibold tracking-wider uppercase text-sky-100">
              Student Profile
            </span>
          </div>
          <p className="text-[11px] text-sky-200/90 mt-0.5">{student.university}</p>
        </div>

        {/* Content Body with overlapping Avatar */}
        <div className="px-6 pb-6 pt-0 relative">
          {/* Avatar and GPA Badge */}
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-400 via-sky-500 to-indigo-600 p-0.5 shadow-lg">
                <div className="w-full h-full bg-[#18458b] rounded-[14px] flex items-center justify-center text-white font-black text-2xl shadow-inner tracking-wider">
                  AS
                </div>
              </div>
              <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></span>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/70 rounded-2xl px-3.5 py-1.5 text-right shadow-2xs">
              <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1 justify-end">
                <Award className="w-3 h-3 text-amber-500" />
                <span>GPA</span>
              </div>
              <div className="text-xl font-black text-slate-900 leading-tight">
                {student.gpa}
                <span className="text-[11px] font-normal text-slate-400"> / {student.maxGpa.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Student Name (ФИО) & Major */}
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-900 leading-tight">
              {student.fullName}
            </h3>
            <p className="text-xs font-semibold text-blue-700 mt-0.5">
              {student.major}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {student.academicYear} · {student.faculty}
            </p>
          </div>

          {/* Details List */}
          <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-100 space-y-2.5 mb-5 text-xs">
            {/* Student ID */}
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <IdCard className="w-3.5 h-3.5 text-slate-400" />
                Student ID
              </span>
              <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200/70 text-[11px]">
                {student.studentId}
              </span>
            </div>

            {/* Email */}
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                Email
              </span>
              <span className="font-medium text-slate-700 text-[11px] truncate max-w-[170px]">
                {student.email}
              </span>
            </div>

            {/* Academic Standing */}
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Status
              </span>
              <span className="font-semibold text-emerald-700 text-[11px]">
                {student.scholarshipStatus}
              </span>
            </div>

            {/* University */}
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

          {/* Done Button */}
          <button
            onClick={() => setIsProfileOpen(false)}
            className="w-full bg-[#18458b] hover:bg-[#14366d] active:scale-98 text-white font-semibold text-xs py-2.5 rounded-xl shadow-sm transition-all"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
};
