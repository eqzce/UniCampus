export type TabType = 'dashboard' | 'schedule' | 'assignments' | 'map';

export type AssignmentStatus = 'todo' | 'submitted' | 'graded';

export interface ScheduleItem {
  id: string;
  courseName: string;
  courseCode: string;
  professor: string;
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

export interface Assignment {
  id: string;
  title: string;
  courseCode: string;
  courseName: string;
  dueDate: string; // e.g. "Oct 26" or "Due 26"
  daysLeft?: number;
  status: AssignmentStatus;
  grade?: string;
  hasPersonalNote?: boolean;
  personalNote?: string;
}

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
  roomNumber: string;
  buildingName: string;
  date: string;
  timeSlot: string;
  purpose: string;
  status: 'confirmed' | 'pending';
}
