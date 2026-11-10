export type TabType = 'dashboard' | 'schedule' | 'grades' | 'assignments' | 'map';

export type TeacherTabType = 'gradebook' | 'attendance' | 'tasks' | 'schedule' | 'map';

export type UserRole = 'student' | 'teacher';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  group_name?: string | null;
  department?: string | null;
  gpa?: number | null;
  created_at?: string;
}

export interface CourseRecord {
  id: string;
  title: string;
  code: string;
  credits: number;
  teacher_id: string;
  teacher_name?: string;
}

export interface GradeRecord {
  id: string;
  student_id: string;
  course_id: string;
  teacher_id: string;
  category: string; // e.g., 'Assignment', 'Midterm 1', 'Midterm 2', 'Final'
  score: number; // 0 - 100
  feedback: string;
  updated_at: string;
  course_code?: string;
  course_title?: string;
  course_credits?: number;
  student_name?: string;
  student_email?: string;
  student_group?: string;
  teacher_name?: string;
}

export type AttendanceStatusType = 'present' | 'absent' | 'late';

export interface AttendanceRecord {
  id: string;
  student_id: string;
  course_id: string;
  date: string;
  status: AttendanceStatusType;
  course_code?: string;
  course_title?: string;
  student_name?: string;
  student_group?: string;
}

export type AssignmentStatus = 'todo' | 'submitted' | 'graded';

export type AssessmentCategory = 'assignment' | 'quiz' | 'midterm' | 'final';

export interface ScheduleItem {
  id: string;
  courseName: string;
  courseCode: string;
  professor: string;
  groupName?: string;
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';
  startTime: string; // e.g. "10:00"
  endTime: string;   // e.g. "11:30"
  timeRowIndex: number; // 0 to 7 (09:00 to 16:00)
  durationHours: number; // e.g. 1.5
  room: string;
  building: string;
  color: 'orange' | 'blue' | 'purple' | 'green' | 'pink' | 'yellow';
  isCurrent?: boolean;
}

export interface AssessmentItem {
  id: string;
  title: string;
  description?: string;
  category: AssessmentCategory; // 'assignment' | 'quiz' | 'midterm' | 'final'
  courseCode: string;
  courseName: string;
  groupName?: string;
  dueDate: string; // e.g. "Due Oct 26"
  dueFormatted: string; // e.g. "Oct 26, 23:59"
  daysLeft?: number;
  status: AssignmentStatus;
  weight?: string; // e.g. "15%"
  grade?: string; // e.g. "95/100"
  hasPersonalNote?: boolean;
  personalNote?: string;
}

export type Assignment = AssessmentItem;

export interface Announcement {
  id: string;
  title: string;
  courseCode?: string;
  timestamp: string;
  description: string;
  unread: boolean;
  type: 'schedule_change' | 'deadline' | 'admin' | 'scholarship';
}

export interface CampusBuilding {
  id: string;
  name: string;
  code: string;
  floors: number;
  description: string;
  x: number; // percentage on map (0-100)
  y: number; // percentage on map (0-100)
  rooms: string[];
}

export interface ClassroomLocation {
  roomNumber: string;
  buildingId: string;
  buildingName: string;
  floor: number;
  coordinates: { x: number; y: number };
}

export interface RoomBooking {
  id: string;
  userId?: string | null;
  userName?: string;
  userRole?: UserRole;
  roomNumber: string;
  buildingName: string;
  date: string;
  timeSlot: string;
  purpose: string;
  status: 'confirmed' | 'pending' | 'rejected';
  createdAt?: string;
}

export interface OfflineCacheSnapshot {
  lastSyncedAt: string;
  schedule: ScheduleItem[];
  grades: GradeRecord[];
  gpa: number;
  attendance: AttendanceRecord[];
  assignments: Assignment[];
  courses: CourseRecord[];
  bookings: RoomBooking[];
  mapData: {
    buildings: CampusBuilding[];
    classrooms: Record<string, ClassroomLocation>;
    validRooms: string[];
    floorsCached: number[];
  };
}
