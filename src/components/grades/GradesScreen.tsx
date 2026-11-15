import React, { useMemo, useState } from 'react';
import { Header } from '../common/Header';
import { useApp } from '../../context/AppContext';
import { COURSES_LIST } from '../../data/mockData';
import {
  Award,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Calculator,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  BookOpen,
} from 'lucide-react';

function scoreToGpaPoints(score: number): number {
  if (score >= 95) return 4.0;
  if (score >= 90) return 3.67;
  if (score >= 85) return 3.33;
  if (score >= 80) return 3.0;
  if (score >= 75) return 2.67;
  if (score >= 70) return 2.33;
  if (score >= 65) return 2.0;
  if (score >= 60) return 1.67;
  if (score >= 55) return 1.33;
  if (score >= 50) return 1.0;
  return 0.0;
}

const STANDARD_SCHOLARSHIP_THRESHOLD = 2.33;
const INCREASED_SCHOLARSHIP_THRESHOLD = 3.66;

export const GradesScreen: React.FC = () => {
  const {
    selectedCourseFilter,
    setSelectedCourseFilter,
    grades,
    courses,
    student,
    currentUser,
    setActiveTab,
  } = useApp();

  const [showGradebookFeedback, setShowGradebookFeedback] = useState(true);
  const [simCourseCode, setSimCourseCode] = useState<string>('PHYS101');
  const [simulatedFinalScore, setSimulatedFinalScore] = useState<number>(92);

  const courseChips = useMemo(() => {
    const map = new Map(COURSES_LIST.map((c) => [c.code, { code: c.code, title: c.name, shortName: c.shortName, credits: 5 }]));
    for (const c of courses) {
      map.set(c.code, {
        code: c.code,
        title: c.title,
        shortName: c.title.slice(0, 14),
        credits: c.credits || 5,
      });
    }
    const all = Array.from(map.values());
    if (currentUser?.role === 'student' && currentUser.enrolled_course_ids?.length) {
      const enrolledCodes = new Set(
        courses
          .filter((c) => currentUser.enrolled_course_ids?.includes(c.id))
          .map((c) => c.code)
      );
      if (enrolledCodes.size > 0) {
        return all.filter((item) => enrolledCodes.has(item.code));
      }
    }
    return all;
  }, [courses, currentUser]);

  // Own student grades across all courses
  const allStudentGrades = useMemo(() => {
    const activeId = currentUser?.role === 'student' ? currentUser.id : 'usr-student-1';
    const own = grades.filter(
      (g) => g.student_id === activeId || g.student_email === currentUser?.email
    );
    return own.length > 0 ? own : grades.filter((g) => g.student_id === 'usr-student-1');
  }, [grades, currentUser]);

  // Filtered official feedback rows
  const filteredGrades = useMemo(() => {
    if (selectedCourseFilter === 'all') return allStudentGrades;
    return allStudentGrades.filter((g) => g.course_code === selectedCourseFilter);
  }, [allStudentGrades, selectedCourseFilter]);

  // Course-by-course weighted breakdown (Assignment 20% + Quiz 10% + Midterm 30% + Final 40%)
  const courseBreakdowns = useMemo(() => {
    const grouped = new Map<
      string,
      {
        code: string;
        title: string;
        credits: number;
        assignment: number | null;
        quiz: number | null;
        midterm: number | null;
        finalExam: number | null;
        records: typeof allStudentGrades;
      }
    >();

    for (const ch of courseChips) {
      grouped.set(ch.code, {
        code: ch.code,
        title: ch.title,
        credits: ch.credits,
        assignment: null,
        quiz: null,
        midterm: null,
        finalExam: null,
        records: [],
      });
    }

    for (const g of allStudentGrades) {
      const code = g.course_code || 'COURSE';
      if (!grouped.has(code)) {
        grouped.set(code, {
          code,
          title: g.course_title || code,
          credits: g.course_credits || 5,
          assignment: null,
          quiz: null,
          midterm: null,
          finalExam: null,
          records: [],
        });
      }
      const entry = grouped.get(code)!;
      entry.records.push(g);
      const cat = g.category.toLowerCase();
      if (cat.includes('assign') || cat.includes('lab') || cat.includes('hw')) {
        entry.assignment = Number(g.score);
      } else if (cat.includes('quiz')) {
        entry.quiz = Number(g.score);
      } else if (cat.includes('midterm')) {
        entry.midterm = Number(g.score);
      } else if (cat.includes('final')) {
        entry.finalExam = Number(g.score);
      }
    }

    return Array.from(grouped.values())
      .filter((item) => item.records.length > 0)
      .filter((item) => selectedCourseFilter === 'all' || item.code === selectedCourseFilter)
      .map((item) => {
        const parts: { score: number; weight: number }[] = [];
        if (item.assignment !== null) parts.push({ score: item.assignment, weight: 0.2 });
        if (item.quiz !== null) parts.push({ score: item.quiz, weight: 0.1 });
        if (item.midterm !== null) parts.push({ score: item.midterm, weight: 0.3 });
        if (item.finalExam !== null) parts.push({ score: item.finalExam, weight: 0.4 });
        const totalWeight = parts.reduce((acc, p) => acc + p.weight, 0);
        const currentScore =
          totalWeight > 0
            ? Math.round(parts.reduce((acc, p) => acc + p.score * p.weight, 0) / totalWeight)
            : 85;
        return {
          ...item,
          currentScore,
          gpaPoints: scoreToGpaPoints(currentScore),
        };
      });
  }, [courseChips, allStudentGrades, selectedCourseFilter]);

  // Interactive Scholarship & GPA Target Simulator calculation
  const simulation = useMemo(() => {
    const activeTargetCode =
      courseChips.some((c) => c.code === simCourseCode)
        ? simCourseCode
        : courseChips[0]?.code || 'PHYS101';

    let weightedSum = 0;
    let totalCredits = 0;
    let targetProjectedScore = 88;

    for (const c of courseChips) {
      const cGrades = allStudentGrades.filter((g) => g.course_code === c.code);
      const nonFinalAvg =
        cGrades.length > 0
          ? cGrades.reduce((sum, g) => sum + Number(g.score), 0) / cGrades.length
          : 85;

      let courseScore = nonFinalAvg;
      if (c.code === activeTargetCode) {
        courseScore = Math.round(nonFinalAvg * 0.6 + simulatedFinalScore * 0.4);
        targetProjectedScore = courseScore;
      }

      if (cGrades.length > 0 || c.code === activeTargetCode) {
        weightedSum += scoreToGpaPoints(courseScore) * c.credits;
        totalCredits += c.credits;
      }
    }

    const projectedGpa = totalCredits > 0 ? Number((weightedSum / totalCredits).toFixed(2)) : student.gpa;
    const isStandardSafe = projectedGpa >= STANDARD_SCHOLARSHIP_THRESHOLD;
    const isIncreasedSafe = projectedGpa >= INCREASED_SCHOLARSHIP_THRESHOLD;
    const margin = Number(
      (
        projectedGpa -
        (isIncreasedSafe ? INCREASED_SCHOLARSHIP_THRESHOLD : STANDARD_SCHOLARSHIP_THRESHOLD)
      ).toFixed(2)
    );

    return {
      targetCode: activeTargetCode,
      targetProjectedScore,
      projectedGpa,
      isStandardSafe,
      isIncreasedSafe,
      margin,
    };
  }, [courseChips, allStudentGrades, simCourseCode, simulatedFinalScore, student.gpa]);

  const isIncreasedSafe = student.gpa >= INCREASED_SCHOLARSHIP_THRESHOLD;
  const isStandardSafe = student.gpa >= STANDARD_SCHOLARSHIP_THRESHOLD;
  const currentMargin = Number(
    (
      student.gpa -
      (isIncreasedSafe ? INCREASED_SCHOLARSHIP_THRESHOLD : STANDARD_SCHOLARSHIP_THRESHOLD)
    ).toFixed(2)
  );

  return (
    <div className="flex flex-col h-full bg-[#f4f6fa] relative overflow-hidden select-none">
      <Header title="GRADES" />

      <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3 pb-20">
        {/* GPA & Scholarship Card */}
        <div className="bg-gradient-to-br from-[#18458b] to-[#113163] rounded-2xl p-4 text-white shadow-md">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10.5px] uppercase tracking-wider text-blue-200 font-bold">
                GPA
              </p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-3xl font-black tracking-tight">{student.gpa.toFixed(2)}</span>
                <span className="text-xs text-blue-200 font-medium">/ 4.00</span>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('assignments')}
              className="flex items-center gap-1 bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
            >
              <span>Open Tasks</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-3 pt-2.5 border-t border-white/15 flex items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-1.5 min-w-0">
              {isStandardSafe ? (
                <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
              )}
              <span className="font-semibold truncate">
                {isIncreasedSafe
                  ? `Increased Scholarship (+${currentMargin.toFixed(2)})`
                  : isStandardSafe
                    ? `Standard Scholarship Safe (+${currentMargin.toFixed(2)})`
                    : `Below ${STANDARD_SCHOLARSHIP_THRESHOLD.toFixed(2)} Scholarship Cutoff (${currentMargin.toFixed(2)})`}
              </span>
            </div>
            <span className="text-blue-200 text-[10px] shrink-0">Std: 2.33 · Inc: 3.66</span>
          </div>
        </div>

        {/* Course Selector Chips */}
        <div>
          <div className="flex items-center justify-between mb-1.5 px-0.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Filter by Course
            </span>
            {selectedCourseFilter !== 'all' && (
              <button
                onClick={() => setSelectedCourseFilter('all')}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
              >
                Clear filter
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCourseFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                selectedCourseFilter === 'all'
                  ? 'bg-[#18458b] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              All Courses
            </button>
            {courseChips.map((course) => {
              const isSelected = selectedCourseFilter === course.code;
              return (
                <button
                  key={course.code}
                  onClick={() => setSelectedCourseFilter(course.code)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                    isSelected
                      ? 'bg-[#18458b] text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                  }`}
                >
                  {course.shortName}
                </button>
              );
            })}
          </div>
        </div>

        {/* Course-by-Course Weighted Breakdown */}
        <div className="bg-white rounded-2xl p-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#18458b] flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Courses</h3>
              </div>
            </div>
          </div>

          {courseBreakdowns.length > 0 ? (
            <div className="space-y-2.5 pt-1">
              {courseBreakdowns.map((c) => (
                <div
                  key={c.code}
                  className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[11px] font-extrabold text-[#18458b]">{c.code}</span>
                      <p className="text-[11px] font-semibold text-slate-800 truncate">{c.title}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-slate-900">{c.currentScore}%</span>
                    </div>
                  </div>

                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#18458b] rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.max(5, c.currentScore))}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
                    <div className="bg-white rounded-lg p-1 border border-slate-100">
                      <div className="text-slate-400">Assign 20%</div>
                      <div className="font-bold text-slate-800">
                        {c.assignment !== null ? `${c.assignment}%` : '—'}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-1 border border-slate-100">
                      <div className="text-slate-400">Quiz 10%</div>
                      <div className="font-bold text-slate-800">
                        {c.quiz !== null ? `${c.quiz}%` : '—'}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-1 border border-slate-100">
                      <div className="text-slate-400">Mid 30%</div>
                      <div className="font-bold text-slate-800">
                        {c.midterm !== null ? `${c.midterm}%` : '—'}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-1 border border-slate-100">
                      <div className="text-slate-400">Final 40%</div>
                      <div className="font-bold text-slate-800">
                        {c.finalExam !== null ? `${c.finalExam}%` : 'Pending'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-2">
              No course breakdowns available for this filter.
            </p>
          )}
        </div>

        {/* Interactive Scholarship & GPA Target Simulator */}
        <div className="bg-white rounded-2xl p-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  Simulator
                </h3>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <label htmlFor="sim-course-select" className="text-[10px] font-bold text-slate-500 block mb-1">
                Course
              </label>
              <select
                id="sim-course-select"
                value={simulation.targetCode}
                onChange={(e) => setSimCourseCode(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-xl p-2 bg-slate-50 text-slate-800 font-semibold"
              >
                {courseChips.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-slate-50 rounded-xl p-2 border border-slate-200/70 flex flex-col justify-center">
              <span className="text-[10px] text-slate-500 font-semibold">GPA</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-black text-[#18458b]">
                  {simulation.projectedGpa.toFixed(2)}
                </span>
                <span
                  className={`text-[10px] font-bold ${
                    simulation.isIncreasedSafe
                      ? 'text-emerald-600'
                      : simulation.isStandardSafe
                        ? 'text-blue-600'
                        : 'text-rose-600'
                  }`}
                >
                  {simulation.isIncreasedSafe
                    ? `Increased (+${simulation.margin.toFixed(2)})`
                    : simulation.isStandardSafe
                      ? `Standard (+${simulation.margin.toFixed(2)})`
                      : `At Risk (${simulation.margin.toFixed(2)})`}
                </span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 mb-1">
              <label htmlFor="sim-final-slider">Final Exam (40%)</label>
              <span className="font-bold text-[#18458b]">
                {simulatedFinalScore}% → {simulation.targetProjectedScore}%
              </span>
            </div>
            <input
              id="sim-final-slider"
              type="range"
              min={40}
              max={100}
              value={simulatedFinalScore}
              onChange={(e) => setSimulatedFinalScore(Number(e.target.value))}
              aria-label="Hypothetical Final Exam Score"
              className="w-full accent-[#18458b] cursor-pointer"
            />
          </div>
        </div>

        {/* Official Grades & Teacher Feedback List */}
        <div className="bg-white rounded-2xl p-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100">
          <div
            onClick={() => setShowGradebookFeedback(!showGradebookFeedback)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Feedback</h3>
              </div>
            </div>
            <button className="text-slate-400 hover:text-slate-700 p-1" aria-label="Toggle feedback">
              {showGradebookFeedback ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>

          {showGradebookFeedback && (
            <div className="mt-3 space-y-2 border-t border-slate-100 pt-2.5">
              {filteredGrades.length > 0 ? (
                filteredGrades.map((grd) => (
                  <div
                    key={grd.id}
                    className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#18458b]">
                          {grd.course_code || 'COURSE'}
                        </span>
                        <span className="text-[10px] font-semibold bg-white px-2 py-0.5 rounded-full border border-slate-200 text-slate-600">
                          {grd.category}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                          grd.score >= 90
                            ? 'bg-emerald-100 text-emerald-800'
                            : grd.score >= 75
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {grd.score} / 100
                      </span>
                    </div>
                    {grd.feedback && (
                      <div className="flex items-start gap-1.5 text-[11px] text-slate-600 pt-0.5">
                        <MessageSquare className="w-3 h-3 text-blue-500 mt-0.5 shrink-0" />
                        <span>
                          <b className="text-slate-700">{grd.teacher_name || 'Professor'}:</b>{' '}
                          {grd.feedback}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-2">
                  No official grades recorded for this course filter yet.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
