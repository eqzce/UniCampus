/**
 * UniCampus API Service Layer
 * 
 * Currently uses local mock data based on Assignment 1, 2, and 3.
 * Easily swappable to real FastAPI / Django / Node backend endpoints.
 */

import {
  TODAY_CLASSES,
  WEEKLY_SCHEDULE,
  ASSIGNMENTS_LIST,
  RECENT_ANNOUNCEMENTS,
  CAMPUS_BUILDINGS,
  CLASSROOM_LOCATIONS,
  CURRENT_STUDENT,
} from '../data/mockData';
import type { ScheduleItem, Assignment, Announcement, CampusBuilding, ClassroomLocation } from '../types';

export const ApiService = {
  // Student Profile
  async getStudentProfile() {
    return Promise.resolve(CURRENT_STUDENT);
  },

  // Schedules
  async getTodaySchedule() {
    return Promise.resolve(TODAY_CLASSES);
  },

  async getWeeklySchedule(): Promise<ScheduleItem[]> {
    return Promise.resolve(WEEKLY_SCHEDULE);
  },

  // Assignments
  async getAssignments(): Promise<Assignment[]> {
    return Promise.resolve(ASSIGNMENTS_LIST);
  },

  // Announcements / Notifications
  async getAnnouncements(): Promise<Announcement[]> {
    return Promise.resolve(RECENT_ANNOUNCEMENTS);
  },

  // Campus Map & Buildings
  async getCampusBuildings(): Promise<CampusBuilding[]> {
    return Promise.resolve(CAMPUS_BUILDINGS);
  },

  async getClassroomLocation(roomNumber: string): Promise<ClassroomLocation | null> {
    return Promise.resolve(CLASSROOM_LOCATIONS[roomNumber] || null);
  },

  // Future Backend API Integration helper:
  // e.g.:
  // async fetchFromBackend(endpoint: string, options?: RequestInit) {
  //   const res = await fetch(`http://localhost:8000/api/${endpoint}`, options);
  //   return await res.json();
  // }
};
