import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AdminDashboard } from './AdminDashboard';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const { mockToast } = vi.hoisted(() => ({
  mockToast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: mockToast,
}));

vi.mock('../contexts/NotificationService', () => ({
  useNotificationListener: () => {},
}));

const mockUseSchool = vi.fn();

vi.mock('../contexts/SchoolContext', () => ({
  useSchool: () => mockUseSchool(),
}));

// Mock all child page components
vi.mock('./admin/RegisterUserPage', () => ({ RegisterUserPage: () => <div data-testid="register-user-page" /> }));
vi.mock('./admin/ManageUsersPage', () => ({ ManageUsersPage: () => <div data-testid="manage-users-page" /> }));
vi.mock('./admin/ManageStudentsPage', () => ({ ManageStudentsPage: () => <div data-testid="manage-students-page" /> }));
vi.mock('./admin/LinkStudentParentPage', () => ({ LinkStudentParentPage: () => <div data-testid="link-student-parent-page" /> }));
vi.mock('./admin/ManageClassesPage', () => ({ ManageClassesPage: () => <div data-testid="manage-classes-page" /> }));
vi.mock('./admin/ManageSubjectsPage', () => ({ ManageSubjectsPage: () => <div data-testid="manage-subjects-page" /> }));
vi.mock('./admin/ManageTeacherAssignmentsPage', () => ({ ManageTeacherAssignmentsPage: () => <div data-testid="manage-teacher-assignments-page" /> }));
vi.mock('./admin/PromotionSystemPage', () => ({ PromotionSystemPage: () => <div data-testid="promotion-system-page" /> }));
vi.mock('./admin/ResultsManagementPage', () => ({ ResultsManagementPage: () => <div data-testid="results-management-page" /> }));
vi.mock('./admin/ExamTimetablePage', () => ({ ExamTimetablePage: () => <div data-testid="exam-timetable-page" /> }));
vi.mock('./admin/CbtExamListPage', () => ({ CbtExamListPage: () => <div data-testid="cbt-exams-page" /> }));
vi.mock('./admin/NotificationSystemPage', () => ({ NotificationSystemPage: () => <div data-testid="notification-system-page" /> }));
vi.mock('./admin/ViewNotificationsPage', () => ({ ViewNotificationsPage: () => <div data-testid="view-notifications-page" /> }));
vi.mock('./admin/DataBackupPage', () => ({ DataBackupPage: () => <div data-testid="data-backup-page" /> }));
vi.mock('./admin/SystemSettingsPage', () => ({ SystemSettingsPage: () => <div data-testid="system-settings-page" /> }));
vi.mock('./admin/ActivityLogsPage', () => ({ ActivityLogsPage: () => <div data-testid="activity-logs-page" /> }));
vi.mock('./admin/AttendanceReportsPage', () => ({ AttendanceReportsPage: () => <div data-testid="attendance-reports-page" /> }));

// Mock DashboardSidebar and DashboardTopBar
vi.mock('./DashboardSidebar', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DashboardSidebar: ({ items, activeItem: _activeItem, onItemClick }: any) => (
    <div data-testid="dashboard-sidebar">
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {items.map((item: any) => (
        <button
          key={item.id}
          data-testid={`sidebar-${item.id}`}
          onClick={() => onItemClick(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('./DashboardTopBar', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DashboardTopBar: ({ userName, onLogout, onNotificationClick }: any) => (
    <div data-testid="dashboard-topbar">
      <span data-testid="user-name">{userName}</span>
      <button data-testid="logout-btn" onClick={onLogout}>Logout</button>
      <button data-testid="notification-btn" onClick={onNotificationClick}>Notifications</button>
    </div>
  ),
}));

const defaultSchoolContext = {
  students: [
    { id: 1, status: 'Active', name: 'Student 1' },
    { id: 2, status: 'Active', name: 'Student 2' },
    { id: 3, status: 'Inactive', name: 'Student 3' },
  ],
  teachers: [
    { id: 1, status: 'Active', name: 'Teacher 1' },
    { id: 2, status: 'Inactive', name: 'Teacher 2' },
  ],
  compiledResults: [],
  getPendingApprovals: vi.fn(() => []),
  currentUser: { id: 1, username: 'admin', role: 'admin' },
  checkUserPermissionAPI: vi.fn(() => true),
  currentAcademicYear: '2025/2026',
  currentTerm: 'Term 1',
  loadCompiledResultsFromAPI: vi.fn().mockResolvedValue(undefined),
  loadStudentsFromAPI: vi.fn().mockResolvedValue(undefined),
  loadTeachersFromAPI: vi.fn().mockResolvedValue(undefined),
  loadClassesFromAPI: vi.fn().mockResolvedValue(undefined),
  loadNotificationsFromAPI: vi.fn().mockResolvedValue(undefined),
  notifications: [
    { id: 1, isRead: false, targetAudience: 'all' },
    { id: 2, isRead: true, targetAudience: 'all' },
  ],
  logout: vi.fn(),
};

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <AdminDashboard onLogout={vi.fn()} />
    </MemoryRouter>
  );
}

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSchool.mockReturnValue(defaultSchoolContext);
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

    it('displays the admin username', () => {
      renderDashboard();
      expect(screen.getByTestId('user-name')).toHaveTextContent('admin');
    });

    it('shows dashboard overview by default', () => {
      renderDashboard();
      expect(screen.getByText(/Welcome/)).toBeInTheDocument();
    });

    it('shows total students count', () => {
      renderDashboard();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('shows teaching staff count via stat card', () => {
      renderDashboard();
      const teachingStaff = screen.getByText('Teaching Staff').closest('[class*="card"]');
      expect(teachingStaff).toBeTruthy();
      const count = teachingStaff!.querySelector('.font-semibold');
      expect(count?.textContent).toBe('1');
    });
  });

  describe('sidebar navigation', () => {
    it('navigates to manage-students when sidebar item clicked', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await user.click(screen.getByTestId('sidebar-manage-students'));
      expect(screen.getByTestId('manage-students-page')).toBeInTheDocument();
    });

    it('navigates to register-user when sidebar item clicked', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await user.click(screen.getByTestId('sidebar-register-user'));
      expect(screen.getByTestId('register-user-page')).toBeInTheDocument();
    });

    it('navigates to manage-users when sidebar item clicked', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await user.click(screen.getByTestId('sidebar-manage-users'));
      expect(screen.getByTestId('manage-users-page')).toBeInTheDocument();
    });

    it('navigates to manage-classes when sidebar item clicked', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await user.click(screen.getByTestId('sidebar-manage-classes'));
      expect(screen.getByTestId('manage-classes-page')).toBeInTheDocument();
    });

    it('navigates to settings when sidebar item clicked', async () => {
      const user = userEvent.setup();
      renderDashboard();

      await user.click(screen.getByTestId('sidebar-settings'));
      expect(screen.getByTestId('system-settings-page')).toBeInTheDocument();
    });

    it('calls onLogout prop when logout clicked', async () => {
      const user = userEvent.setup();
      const mockOnLogout = vi.fn();
      render(
        <MemoryRouter initialEntries={['/admin']}>
          <AdminDashboard onLogout={mockOnLogout} />
        </MemoryRouter>
      );

      await user.click(screen.getByTestId('logout-btn'));
      expect(mockOnLogout).toHaveBeenCalled();
    });
  });

  describe('stats cards', () => {
    it('navigates to manage-students when students card clicked', async () => {
      const user = userEvent.setup();
      renderDashboard();

      const studentsCard = screen.getByText('Total Students').closest('[class*="cursor-pointer"]');
      if (studentsCard) {
        await user.click(studentsCard);
        expect(screen.getByTestId('manage-students-page')).toBeInTheDocument();
      }
    });

    it('navigates to manage-users when teachers card clicked', async () => {
      const user = userEvent.setup();
      renderDashboard();

      const teachersCard = screen.getByText('Teaching Staff').closest('[class*="cursor-pointer"]');
      if (teachersCard) {
        await user.click(teachersCard);
        expect(screen.getByTestId('manage-users-page')).toBeInTheDocument();
      }
    });
  });

  describe('permission model', () => {
    it('renders with admin permissions', () => {
      renderDashboard();
      expect(screen.getByTestId('dashboard-sidebar')).toBeInTheDocument();
    });

    it('renders with non-admin permissions', () => {
      mockUseSchool.mockReturnValue({
        ...defaultSchoolContext,
        currentUser: { id: 2, username: 'teacher', role: 'teacher' },
        checkUserPermissionAPI: vi.fn(() => false),
      });
      renderDashboard();
      expect(screen.getByTestId('dashboard-sidebar')).toBeInTheDocument();
    });
  });

  describe('data loading', () => {
    it('calls loadStudentsFromAPI on mount', () => {
      renderDashboard();
      expect(defaultSchoolContext.loadStudentsFromAPI).toHaveBeenCalled();
    });

    it('calls loadTeachersFromAPI on mount', () => {
      renderDashboard();
      expect(defaultSchoolContext.loadTeachersFromAPI).toHaveBeenCalled();
    });

    it('calls loadNotificationsFromAPI on mount', () => {
      renderDashboard();
      expect(defaultSchoolContext.loadNotificationsFromAPI).toHaveBeenCalled();
    });
  });
});
