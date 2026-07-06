import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { StudentDashboard } from './StudentDashboard';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const { mockToast } = vi.hoisted(() => ({
  mockToast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('sonner', () => ({ toast: mockToast }));

vi.mock('../../contexts/NotificationService', () => ({
  useNotificationListener: () => {},
}));

const mockUseSchool = vi.fn();

vi.mock('../../contexts/SchoolContext', () => ({
  useSchool: () => mockUseSchool(),
}));

vi.mock('../cbt/CbtExamPlayer', () => ({ CbtExamPlayer: () => <div data-testid="cbt-exam-player" /> }));
vi.mock('../cbt/cbt-exam/ResultsSummary', () => ({ ResultsSummary: () => <div data-testid="results-summary" /> }));

vi.mock('../DashboardSidebar', () => ({
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

vi.mock('../DashboardTopBar', () => ({
  DashboardTopBar: ({ userName, onLogout }: any) => (
    <div data-testid="dashboard-topbar">
      <span data-testid="user-name">{userName}</span>
      <button data-testid="logout-btn" onClick={onLogout}>Logout</button>
    </div>
  ),
}));

const defaultContext = {
  currentUser: { id: 1, username: 'student1', role: 'student', first_name: 'Alice', last_name: 'Brown' },
  cbtExams: [
    { id: 1, title: 'Math Exam', status: 'Active', published: true, classId: 1, subjectId: 1, duration: 60, totalQuestions: 20 },
  ],
  cbtAttempts: [
    { id: 1, examId: 1, studentId: 1, status: 'completed', score: 80, totalScore: 100, startedAt: '2026-01-01', completedAt: '2026-01-01' },
  ],
  loadCbtStudentExamsFromAPI: vi.fn().mockResolvedValue(undefined),
  loadCbtMyAttemptsFromAPI: vi.fn().mockResolvedValue(undefined),
  getCbtAttemptDetail: vi.fn().mockResolvedValue({ score: 80, totalScore: 100 }),
  logout: vi.fn(),
};

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/student']}>
      <StudentDashboard onLogout={vi.fn()} />
    </MemoryRouter>
  );
}

describe('StudentDashboard', () => {
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

    it('displays student name', () => {
      renderDashboard();
      expect(screen.getByTestId('user-name')).toHaveTextContent('Alice Brown');
    });

    it('shows dashboard overview by default', () => {
      renderDashboard();
      expect(screen.getByText(/Welcome/)).toBeInTheDocument();
    });
  });

  describe('sidebar navigation', () => {
    it('navigates to my-exams', async () => {
      const user = userEvent.setup();
      renderDashboard();
      await user.click(screen.getByTestId('sidebar-my-exams'));
      expect(screen.getAllByText(/My Exams/).length).toBeGreaterThan(1);
    });

    it('navigates to my-results', async () => {
      const user = userEvent.setup();
      renderDashboard();
      await user.click(screen.getByTestId('sidebar-my-results'));
      expect(screen.getAllByText(/My Results/).length).toBeGreaterThan(1);
    });

    it('calls onLogout when logout clicked', async () => {
      const user = userEvent.setup();
      const mockOnLogout = vi.fn();
      render(
        <MemoryRouter initialEntries={['/student']}>
          <StudentDashboard onLogout={mockOnLogout} />
        </MemoryRouter>
      );
      await user.click(screen.getByTestId('logout-btn'));
      expect(mockOnLogout).toHaveBeenCalled();
    });
  });

  describe('data loading', () => {
    it('loads CBT exams on mount', () => {
      renderDashboard();
      expect(defaultContext.loadCbtStudentExamsFromAPI).toHaveBeenCalled();
    });

    it('loads CBT attempts on mount', () => {
      renderDashboard();
      expect(defaultContext.loadCbtMyAttemptsFromAPI).toHaveBeenCalled();
    });
  });

  describe('exam stats', () => {
    it('shows available exams count', () => {
      renderDashboard();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('shows completed exams count', () => {
      renderDashboard();
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });
});
