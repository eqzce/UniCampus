// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from '../App';
import { parseRoom } from '../components/map/buildings';
import { OfflineStorage } from '../services/offlineStorage';
import { getWeekSummaryInfo } from '../utils/dateUtils';

describe('UniCampus Frontend & E2E Workflows', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    OfflineStorage.setOfflineModeEnabled(true);
    vi.restoreAllMocks();
  });

  it('resolves room aliases accurately for campus room highlighting', () => {
    const r301 = parseRoom('Room 301');
    expect(r301.id).toBe('C1.1.320');
    expect(r301.floor).toBe(3);

    const r105 = parseRoom('105');
    expect(r105.id).toBe('C1.2.136');
    expect(r105.floor).toBe(1);
  });

  it('renders 5-tab navigation (Dashboard, Schedule, Grades, Tasks, Map) without floating green FAB', () => {
    render(<App />);
    const nav = screen.getByRole('navigation');
    expect(within(nav).getByRole('button', { name: 'Dashboard' })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'Schedule' })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'Grades' })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'Tasks' })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'Map' })).toBeInTheDocument();

    // No floating green "+" action button, and Dashboard Schedule has no "View Only" badge
    expect(screen.queryByRole('button', { name: /Open quick actions/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/View Only/i)).not.toBeInTheDocument();
  });

  it('highlights searched rooms on CampusMap without Get Directions or route SVG, and pre-fills Room Booking modal', async () => {
    render(<App />);

    const nav = screen.getByRole('navigation');
    fireEvent.click(within(nav).getByRole('button', { name: 'Map' }));

    const searchInput = screen.getByPlaceholderText('Search room, e.g. 105');
    fireEvent.change(searchInput, { target: { value: 'C1.1.320' } });

    await waitFor(() => {
      expect(screen.getByText('C1.1.320')).toBeInTheDocument();
      expect(screen.getByText('Highlighted on Map')).toBeInTheDocument();
    });

    // Indoor route & Get Directions must not exist
    expect(screen.queryByRole('button', { name: /Get Directions/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Indoor Navigation Route')).not.toBeInTheDocument();

    // Click Book Room inside the Map drawer
    const bookButtons = screen.getAllByRole('button', { name: /Book Room/i });
    fireEvent.click(bookButtons[bookButtons.length - 1]);

    expect(screen.getByText('Room Booking')).toBeInTheDocument();
    expect(
      screen.getAllByDisplayValue('C1.1.320').some((el) => el.tagName === 'SELECT')
    ).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /Confirm Booking/i }));

    await waitFor(() => {
      expect(screen.getByText('Room Reserved!')).toBeInTheDocument();
    });
  });

  it('displays 2.33 / 3.66 scholarship rules & simulator on Grades tab with percentages only and zero grant', async () => {
    render(<App />);
    const nav = screen.getByRole('navigation');
    fireEvent.click(within(nav).getByRole('button', { name: 'Grades' }));

    expect(screen.getByText('Courses')).toBeInTheDocument();
    expect(screen.getByText('Simulator')).toBeInTheDocument();
    expect(screen.getAllByText(/2\.33/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/3\.66/).length).toBeGreaterThan(0);
    expect(document.body.textContent || '').not.toMatch(/grant/i);

    const slider = screen.getByLabelText('Hypothetical Final Exam Score');
    fireEvent.change(slider, { target: { value: '45' } });
    expect(screen.getByText(/45%/)).toBeInTheDocument();

    fireEvent.change(slider, { target: { value: '98' } });
    expect(screen.getByText(/98%/)).toBeInTheDocument();
  });

  it('scrolls dynamic current weeks on Schedule tab and supports student Save, Delete and Restore', async () => {
    render(<App />);
    const nav = screen.getByRole('navigation');
    fireEvent.click(within(nav).getByRole('button', { name: 'Schedule' }));

    expect(screen.queryByText(/View Only/i)).not.toBeInTheDocument();
    const week0 = getWeekSummaryInfo(0);
    const week1 = getWeekSummaryInfo(1);
    expect(screen.getByText(week0.rangeLabel)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next week' }));
    expect(screen.getByText(week1.rangeLabel)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Previous week' }));
    expect(screen.getByText(week0.rangeLabel)).toBeInTheDocument();

    // Student saves schedule, deletes a session, then restores it
    fireEvent.click(screen.getByRole('button', { name: /^Save$/i }));
    const physicsCards = screen.getAllByRole('button', { name: /Physics/i });
    const countBefore = physicsCards.length;
    fireEvent.click(physicsCards[0]);
    fireEvent.click(screen.getByRole('button', { name: /Delete class/i }));
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Physics/i }).length).toBeLessThan(countBefore);
    });

    fireEvent.click(screen.getByRole('button', { name: /Restore/i }));
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Physics/i }).length).toBe(countBefore);
    });
  });

  it('sorts Tasks via dropdown selector without Check off submissions label and persists Study Notes', async () => {
    render(<App />);
    const nav = screen.getByRole('navigation');
    fireEvent.click(within(nav).getByRole('button', { name: 'Tasks' }));

    expect(screen.queryByText(/Check off submissions & study notes/i)).not.toBeInTheDocument();

    const sortSelect = screen.getByLabelText('Sort tasks by') as HTMLSelectElement;
    expect(sortSelect.tagName).toBe('SELECT');
    fireEvent.change(sortSelect, { target: { value: 'course' } });
    expect(sortSelect.value).toBe('course');
    fireEvent.change(sortSelect, { target: { value: 'status' } });
    expect(sortSelect.value).toBe('status');

    const addNoteBtns = screen.getAllByRole('button', { name: 'Add Personal Note' });
    fireEvent.click(addNoteBtns[0]);

    const noteTextarea = screen.getByPlaceholderText(/Remember to check formulas/i);
    fireEvent.change(noteTextarea, { target: { value: 'Double check Kirchhoff laws' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Note' }));

    await waitFor(() => {
      expect(screen.getByText('Double check Kirchhoff laws')).toBeInTheDocument();
    });

    const cached = OfflineStorage.loadSnapshot();
    expect(
      cached.assignments.some((a) => a.personalNote === 'Double check Kirchhoff laws')
    ).toBe(true);
  });

  it('opens Additional Functions header menu, queries AI Advisor, and highlights room on Map without directions', async () => {
    render(<App />);

    const funcsBtn = screen.getByRole('button', { name: 'Additional Functions' });
    fireEvent.click(funcsBtn);

    const aiMenuItem = await screen.findByRole('menuitem', { name: /Ask AI Assistant/i });
    fireEvent.click(aiMenuItem);

    expect(screen.getByText('UniCampus AI Advisor')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Highlight C1.1.320/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Open Map to C1.1.320/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Open Map to C1.1.320/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search room, e.g. 105')).toBeInTheDocument();
      expect(screen.getByText('Highlighted on Map')).toBeInTheDocument();
    });
    expect(screen.queryByLabelText('Indoor Navigation Route')).not.toBeInTheDocument();
  });

  it('moves Online/Offline mode to Profile Settings, hides inline credentials, and switches roles via AuthModal', async () => {
    render(<App />);

    // Open Profile: verify no 1-click role buttons and verify Settings Online/Offline toggle works
    fireEvent.click(screen.getByRole('button', { name: /Open profile/i }));
    expect(screen.queryByRole('button', { name: /^Admin$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Teacher$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Student$/i })).not.toBeInTheDocument();

    expect(screen.getByText('Settings')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Offline: ON/i }));
    expect(screen.getByRole('button', { name: /Online: ON/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Online: ON/i }));
    expect(screen.getByRole('button', { name: /Offline: ON/i })).toBeInTheDocument();
    const saveOfflineBtns = screen.getAllByRole('button', { name: /^Save Offline$/i });
    fireEvent.click(saveOfflineBtns[saveOfflineBtns.length - 1]);

    // Open Sign In modal via Profile -> Sign In / Switch Account
    fireEvent.click(screen.getByRole('button', { name: /Sign In \/ Switch Account/i }));

    // Verify no credentials reference box or offline toggle bar appears in AuthModal
    expect(screen.queryByText(/DATABASE ACCOUNTS REFERENCE/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/API Server Config/i)).not.toBeInTheDocument();

    // Log in as Admin using credentials
    fireEvent.change(screen.getByPlaceholderText('student@unicampus.kz or teacher@unicampus.kz'), {
      target: { value: 'admin@unicampus.kz' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter password'), {
      target: { value: 'admin123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Sign In to UniCampus/i }));

    await waitFor(() => {
      expect(screen.getByText(/LMS Middleware Sync/i)).toBeInTheDocument();
      expect(screen.getByText(/B2B SaaS & AI Token Analytics/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Sync MOODLE/i }));
    await waitFor(() => {
      expect(screen.getByText(/Synchronized Moodle LMS successfully/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/Event Title/i), {
      target: { value: 'AITU Robotics Meetup' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Publish Campus Event/i }));
    await waitFor(() => {
      expect(screen.getByText(/Published event "AITU Robotics Meetup"/i)).toBeInTheDocument();
    });

    // Switch to Teacher account via Sign In modal
    fireEvent.click(screen.getByRole('button', { name: /Sign In \/ Register/i }));
    fireEvent.change(screen.getByPlaceholderText('student@unicampus.kz or teacher@unicampus.kz'), {
      target: { value: 'teacher@unicampus.kz' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter password'), {
      target: { value: 'teacher123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Sign In to UniCampus/i }));

    await waitFor(() => {
      expect(screen.getByText('GRADES')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /View as Student/i })).not.toBeInTheDocument();

    // Verify teacher@unicampus.kz sees only PHYS101 & MATH101 (not CS101)
    expect(screen.getByRole('button', { name: /PHYS101/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /MATH101/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /CS101/i })).not.toBeInTheDocument();

    // Verify Teacher Schedule renders calendar grid
    const teacherNav = screen.getByRole('navigation');
    fireEvent.click(within(teacherNav).getByRole('button', { name: 'Schedule' }));
    await waitFor(() => {
      expect(screen.getByText('SCHEDULE')).toBeInTheDocument();
      expect(screen.getByText('09:00')).toBeInTheDocument();
    });
  });
});
