import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Navigate: ({ to }: { to: string; replace?: boolean }) => {
      mockNavigate(to);
      return <div data-testid="navigate" data-to={to} />;
    },
    useNavigate: () => mockNavigate,
  };
});

const mockUseSchool = vi.fn();

vi.mock('../contexts/SchoolContext', () => ({
  useSchool: () => mockUseSchool(),
}));

function renderWithRouter(ui: React.ReactNode, initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      {ui}
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner when isLoading is true', () => {
    mockUseSchool.mockReturnValue({ currentUser: null, isLoading: true });
    renderWithRouter(
      <ProtectedRoute>
        <div>Child content</div>
      </ProtectedRoute>
    );
    expect(screen.getByText('Loading session...')).toBeInTheDocument();
    expect(screen.queryByText('Child content')).not.toBeInTheDocument();
  });

  it('redirects to /login when no user', () => {
    mockUseSchool.mockReturnValue({ currentUser: null, isLoading: false });
    renderWithRouter(
      <ProtectedRoute>
        <div>Child content</div>
      </ProtectedRoute>
    );
    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/login');
    expect(screen.queryByText('Child content')).not.toBeInTheDocument();
  });

  it('redirects to /login when user has no token', () => {
    mockUseSchool.mockReturnValue({
      currentUser: { id: 1, role: 'admin', token: null },
      isLoading: false,
    });
    renderWithRouter(
      <ProtectedRoute>
        <div>Child content</div>
      </ProtectedRoute>
    );
    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/login');
  });

  it('renders children when user is authenticated', () => {
    mockUseSchool.mockReturnValue({
      currentUser: { id: 1, role: 'admin', token: 'valid-jwt' },
      isLoading: false,
    });
    renderWithRouter(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>
    );
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('redirects to /login when role does not match', () => {
    mockUseSchool.mockReturnValue({
      currentUser: { id: 1, role: 'teacher', token: 'valid-jwt' },
      isLoading: false,
    });
    renderWithRouter(
      <ProtectedRoute requiredRole="admin">
        <div>Admin content</div>
      </ProtectedRoute>
    );
    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/login');
    expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
  });

  it('renders children when role matches', () => {
    mockUseSchool.mockReturnValue({
      currentUser: { id: 1, role: 'admin', token: 'valid-jwt' },
      isLoading: false,
    });
    renderWithRouter(
      <ProtectedRoute requiredRole="admin">
        <div>Admin content</div>
      </ProtectedRoute>
    );
    expect(screen.getByText('Admin content')).toBeInTheDocument();
  });

  it('redirects to /login?reason=suspended for suspended school', () => {
    mockUseSchool.mockReturnValue({
      currentUser: { id: 1, role: 'admin', token: 'valid-jwt', school_status: 'Suspended' },
      isLoading: false,
    });
    renderWithRouter(
      <ProtectedRoute>
        <div>Content</div>
      </ProtectedRoute>
    );
    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/login?reason=suspended');
  });

  it('redirects to /login?reason=pending for pending school', () => {
    mockUseSchool.mockReturnValue({
      currentUser: { id: 1, role: 'admin', token: 'valid-jwt', school_status: 'Pending' },
      isLoading: false,
    });
    renderWithRouter(
      <ProtectedRoute>
        <div>Content</div>
      </ProtectedRoute>
    );
    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/login?reason=pending');
  });

  it('redirects to /login?reason=inactive for other inactive statuses', () => {
    mockUseSchool.mockReturnValue({
      currentUser: { id: 1, role: 'admin', token: 'valid-jwt', school_status: 'Inactive' },
      isLoading: false,
    });
    renderWithRouter(
      <ProtectedRoute>
        <div>Content</div>
      </ProtectedRoute>
    );
    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/login?reason=inactive');
  });

  it('redirects to /login?reason=expired when access_until is past', () => {
    mockUseSchool.mockReturnValue({
      currentUser: {
        id: 1,
        role: 'admin',
        token: 'valid-jwt',
        school_status: 'Active',
        access_until: '2020-01-01T00:00:00Z',
      },
      isLoading: false,
    });
    renderWithRouter(
      <ProtectedRoute>
        <div>Content</div>
      </ProtectedRoute>
    );
    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/login?reason=expired');
  });

  it('renders children when access_until is in the future', () => {
    mockUseSchool.mockReturnValue({
      currentUser: {
        id: 1,
        role: 'admin',
        token: 'valid-jwt',
        school_status: 'Active',
        access_until: '2099-01-01T00:00:00Z',
      },
      isLoading: false,
    });
    renderWithRouter(
      <ProtectedRoute>
        <div>Content</div>
      </ProtectedRoute>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});
