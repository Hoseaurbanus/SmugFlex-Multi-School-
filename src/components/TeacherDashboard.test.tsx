import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { TeacherDashboard } from './TeacherDashboard';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const { mockToast } = vi.hoisted(() => ({
  mockToast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('sonner', () => ({ toast: mockToast }));

vi.mock('../contexts/NotificationService', () => ({
  useNotificationListener: () => {},
}));

const mockUseSchool = vi.fn();

vi.mock('../contexts/SchoolContext', () => ({
  useSchool: () => mockUseSchool(),
}));

vi.mock('./teacher/ScoreEntryPage', () => ({ ScoreEntryPage: () => <div data-testid="score-entry-page" /> }));
vi.mock('./teacher/CompileResultsPage', () => ({ CompileResultsPage: () => <div data-testid="compile-results-page" /> }));
vi.mock('./teacher/ClassListPage', () => ({ ClassListPage: () => <div data-testid="class-list-page" /> }));
vi.mock('./teacher/MarkAttendancePage', () => ({ MarkAttendancePage: () => <div data-testid="mark-attendance-page" /> }));
vi.mock('./teacher/DomainsPage', () => ({ DomainsPage: () => <div data-testid="domains-page" /> }));
vi.mock('./teacher/MessageParentsPage', () => ({ MessageParentsPage: () => <div data-testid="message-parents-page" /> }));
vi.mock('./teacher/ScoreApprovalPage', () => ({ ScoreApprovalPage: () => <div data-testid="score-approval-page" /> }));
vi.mock('./shared/ViewExamTimetablePage', () => ({ ViewExamTimetablePage: () => <div data-testid="exam-timetable-page" /> }));
vi.mock('./ChangePasswordPage', () => ({ ChangePasswordPage: () => <div data-testid="change-password-page" /> }));
vi.mock('./shared/ViewNotificationsPage', () => ({ ViewNotificationsPage: () => <div data-testid="view-notifications-page" /> }));
vi.mock('./cbt/CbtExamListPage', () => ({ CbtExamListPage: () => <div data-testid="cbt-exams-page" /> }));

vi.mock('./DashboardSidebar', () => ({
  DashboardSidebar: ({ items, onItemClick }: any) => (
    <div data-testid="dashboard-sidebar">
      {items.map((item: any) => (
        <button key={item.id} data-testid={`sidebar-${item.id}`} onClick={() => onItemClick(item.id)}>
          {item.label}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('./DashboardTopBar', () => ({
  DashboardTopBar: ({ userName, onLogout, onNotificationClick }: any) => (
    <div data-testid="dashboard-topbar">
      <span data-testid="user-name">{userName}</span>
      <button data-testid="logout-btn" onClick={onLogout}>Logout</button>
      <button data-testid="notification-btn" onClick={onNotificationClick}>Notifications</button>
    </div>
  ),
}));

const defaultContext = {
  currentUser: { id: 1, username: 'teacher1', role: 'teacher', linked_id: 1, name: 'John Doe' },
  teachers: [{ id: 1, firstName: 'John', lastName: 'Doe', status: 'Active' }],
  classes: [{ id: 1, name: 'JSS 1A', level: 'Junior' }],
  currentTerm: 'Term 1',
  currentAcademicYear: '2025/2026',
  subjectAssignments: [],
  classTeacherAssignments: [{ id: 1, teacher_id: 1, class_id: 1, status: 'Active', academic_year: '2025/2026', term: 'Term 1' }],
  getTeacherAssignments: vi.fn(() => []),
  getTeacherClasses: vi.fn(() => [{ id: 1, name: 'JSS 1A', subjects: ['Math'], studentCount: 20 }]),
  getTeacherResponsibilities: vi.fn(() => []),
  getUnreadNotifications: vi.fn(() => []),
  getActivityLogs: vi.fn(() => []),
  loadSubjectAssignmentsFromAPI: vi.fn().mockResolvedValue(undefined),
  loadClassTeacherAssignmentsFromAPI: vi.fn().mockResolvedValue(undefined),
  loadStudentsFromAPI: vi.fn().mockResolvedValue(undefined),
  loadClassesFromAPI: vi.fn().mockResolvedValue(undefined),
  loadTeachersFromAPI: vi.fn().mockResolvedValue(undefined),
  loadNotificationsFromAPI: vi.fn().mockResolvedValue(undefined),
  loadScoresFromAPI: vi.fn().mockResolvedValue(undefined),
  loadAssignmentsFromAPI: vi.fn().mockResolvedValue(undefined),
  loadAttendancesFromAPI: vi.fn().mockResolvedValue(undefined),
  logout: vi.fn(),
};

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/teacher']}>
      <TeacherDashboard onLogout={vi.fn()} />
    </MemoryRouter>
  );
}

describe('TeacherDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSchool.mockReturnValue(defaultContext);
  });

  describe('rendering', () => {
    it('renders the sidebar', () => {
      renderDashboard();
      expect(screen.getByTestId('dashboard-sidebar')).toBeInTheDocument();
    });

    it('renders the topbar', () => {
      renderDashboard();
      expect(screen.getByTestId('dashboard-topbar')).toBeInTheDocument();
    });

    it('displays teacher name', () => {
      renderDashboard();
      expect(screen.getByTestId('user-name')).toHaveTextContent('John Doe');
    });

    it('shows dashboard overview by default', () => {
      renderDashboard();
      expect(screen.getByText(/Welcome/)).toBeInTheDocument();
    });
  });

  describe('sidebar navigation', () => {
    it('navigates to enter-scores', async () => {
      const user = userEvent.setup();
      renderDashboard();
      await user.click(screen.getByTestId('sidebar-enter-scores'));
      expect(screen.getByTestId('score-entry-page')).toBeInTheDocument();
    });

    it('navigates to class-list', async () => {
      const user = userEvent.setup();
      renderDashboard();
      await user.click(screen.getByTestId('sidebar-class-list'));
      expect(screen.getByTestId('class-list-page')).toBeInTheDocument();
    });

    it('navigates to exam-timetable', async () => {
      const user = userEvent.setup();
      renderDashboard();
      await user.click(screen.getByTestId('sidebar-exam-timetable'));
      expect(screen.getByTestId('exam-timetable-page')).toBeInTheDocument();
    });

    it('navigates to cbt-exams', async () => {
      const user = userEvent.setup();
      renderDashboard();
      await user.click(screen.getByTestId('sidebar-cbt-exams'));
      expect(screen.getByTestId('cbt-exams-page')).toBeInTheDocument();
    });

    it('navigates to change-password', async () => {
      const user = userEvent.setup();
      renderDashboard();
      await user.click(screen.getByTestId('sidebar-change-password'));
      expect(screen.getByTestId('change-password-page')).toBeInTheDocument();
    });

    it('calls onLogout when logout clicked', async () => {
      const user = userEvent.setup();
      const mockOnLogout = vi.fn();
      render(
        <MemoryRouter initialEntries={['/teacher']}>
          <TeacherDashboard onLogout={mockOnLogout} />
        </MemoryRouter>
      );
      await user.click(screen.getByTestId('logout-btn'));
      expect(mockOnLogout).toHaveBeenCalled();
    });
  });

  describe('class teacher features', () => {
    it('shows class-list sidebar item', async () => {
      const user = userEvent.setup();
      renderDashboard();
      expect(screen.getByTestId('sidebar-class-list')).toBeInTheDocument();
    });

    it('navigates to class-list', async () => {
      const user = userEvent.setup();
      renderDashboard();
      await user.click(screen.getByTestId('sidebar-class-list'));
      expect(screen.getByTestId('class-list-page')).toBeInTheDocument();
    });

    it('navigates to message-parents', async () => {
      const user = userEvent.setup();
      renderDashboard();
      await user.click(screen.getByTestId('sidebar-message-parents'));
      expect(screen.getByTestId('message-parents-page')).toBeInTheDocument();
    });
  });

  describe('permission model', () => {
    it('renders with teacher permissions', () => {
      renderDashboard();
      expect(screen.getByTestId('dashboard-sidebar')).toBeInTheDocument();
    });
  });
});
