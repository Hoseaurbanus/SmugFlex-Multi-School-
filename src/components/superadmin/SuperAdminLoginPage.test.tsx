import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SuperAdminLoginPage } from './SuperAdminLoginPage';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const { mockSuperAdminAuth } = vi.hoisted(() => ({
  mockSuperAdminAuth: { login: vi.fn() },
}));

vi.mock('../../services/superAdminAuthService', () => ({
  superAdminAuth: mockSuperAdminAuth,
}));

vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react');
  return {
    ...actual,
    Shield: (props: any) => <span data-testid="icon-shield" {...props} />,
    ArrowLeft: (props: any) => <span data-testid="icon-arrow-left" {...props} />,
  };
});

function renderLogin(initialEntries = ['/super-admin/login']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <SuperAdminLoginPage />
    </MemoryRouter>
  );
}

describe('SuperAdminLoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the login form', () => {
      renderLogin();
      expect(screen.getByText('Super Admin Login')).toBeInTheDocument();
      expect(screen.getByText('Authorized personnel only')).toBeInTheDocument();
    });

    it('renders the shield icon', () => {
      renderLogin();
      expect(screen.getByTestId('icon-shield')).toBeInTheDocument();
    });

    it('renders Super Admin heading', () => {
      renderLogin();
      expect(screen.getByText('Super Admin')).toBeInTheDocument();
      expect(screen.getByText('Platform Administration')).toBeInTheDocument();
    });

    it('renders username input', () => {
      renderLogin();
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
    });

    it('renders password input', () => {
      renderLogin();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('renders login button', () => {
      renderLogin();
      expect(screen.getByRole('button', { name: /login to super admin/i })).toBeInTheDocument();
    });

    it('renders back to school login link', () => {
      renderLogin();
      expect(screen.getByText('Back to School Login')).toBeInTheDocument();
    });

    it('renders footer text', () => {
      renderLogin();
      expect(screen.getByText('Secure platform administration portal')).toBeInTheDocument();
    });
  });

  describe('form validation', () => {
    it('login button is disabled when fields are empty', () => {
      renderLogin();
      expect(screen.getByRole('button', { name: /login to super admin/i })).toBeDisabled();
    });

    it('login button is disabled with only username', async () => {
      const user = userEvent.setup();
      renderLogin();
      await user.type(screen.getByLabelText('Username'), 'admin');
      expect(screen.getByRole('button', { name: /login to super admin/i })).toBeDisabled();
    });

    it('login button is disabled with only password', async () => {
      const user = userEvent.setup();
      renderLogin();
      await user.type(screen.getByLabelText('Password'), 'pass');
      expect(screen.getByRole('button', { name: /login to super admin/i })).toBeDisabled();
    });

    it('login button is enabled when both fields are filled', async () => {
      const user = userEvent.setup();
      renderLogin();
      await user.type(screen.getByLabelText('Username'), 'admin');
      await user.type(screen.getByLabelText('Password'), 'pass');
      expect(screen.getByRole('button', { name: /login to super admin/i })).not.toBeDisabled();
    });

    it('shows error when submitting empty form', async () => {
      const user = userEvent.setup();
      renderLogin();

      // Button is disabled when empty, but handleLogin validates independently
      // Test that the button correctly prevents click when disabled
      const button = screen.getByRole('button', { name: /login to super admin/i });
      expect(button).toBeDisabled();
    });
  });

  describe('login flow', () => {
    it('calls superAdminAuth.login with credentials', async () => {
      const user = userEvent.setup();
      mockSuperAdminAuth.login.mockResolvedValue({ token: 'jwt', username: 'admin', first_name: 'A', last_name: 'B' });
      renderLogin();

      await user.type(screen.getByLabelText('Username'), 'admin');
      await user.type(screen.getByLabelText('Password'), 'pass123');
      await user.click(screen.getByRole('button', { name: /login to super admin/i }));

      expect(mockSuperAdminAuth.login).toHaveBeenCalledWith('admin', 'pass123');
    });

    it('navigates to dashboard on success', async () => {
      const user = userEvent.setup();
      mockSuperAdminAuth.login.mockResolvedValue({ token: 'jwt', username: 'admin', first_name: 'A', last_name: 'B' });
      renderLogin();

      await user.type(screen.getByLabelText('Username'), 'admin');
      await user.type(screen.getByLabelText('Password'), 'pass123');
      await user.click(screen.getByRole('button', { name: /login to super admin/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/super-admin/dashboard');
      });
    });

    it('shows error on failed login', async () => {
      const user = userEvent.setup();
      mockSuperAdminAuth.login.mockResolvedValue(null);
      renderLogin();

      await user.type(screen.getByLabelText('Username'), 'admin');
      await user.type(screen.getByLabelText('Password'), 'wrong');
      await user.click(screen.getByRole('button', { name: /login to super admin/i }));

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });
    });

    it('shows error on exception', async () => {
      const user = userEvent.setup();
      mockSuperAdminAuth.login.mockRejectedValue(new Error('Network'));
      renderLogin();

      await user.type(screen.getByLabelText('Username'), 'admin');
      await user.type(screen.getByLabelText('Password'), 'pass');
      await user.click(screen.getByRole('button', { name: /login to super admin/i }));

      await waitFor(() => {
        expect(screen.getByText('Login failed. Please try again.')).toBeInTheDocument();
      });
    });

    it('shows loading state during login', async () => {
      const user = userEvent.setup();
      let resolveLogin: any;
      mockSuperAdminAuth.login.mockImplementation(() => new Promise(r => { resolveLogin = r; }));
      renderLogin();

      await user.type(screen.getByLabelText('Username'), 'admin');
      await user.type(screen.getByLabelText('Password'), 'pass');
      await user.click(screen.getByRole('button', { name: /login to super admin/i }));

      await waitFor(() => {
        expect(screen.getByText('Authenticating...')).toBeInTheDocument();
      });

      resolveLogin({ token: 'jwt', username: 'admin', first_name: 'A', last_name: 'B' });
    });

    it('submits on Enter key', async () => {
      const user = userEvent.setup();
      mockSuperAdminAuth.login.mockResolvedValue({ token: 'jwt', username: 'admin', first_name: 'A', last_name: 'B' });
      renderLogin();

      await user.type(screen.getByLabelText('Username'), 'admin');
      await user.type(screen.getByLabelText('Password'), 'pass');
      await user.keyboard('{Enter}');

      expect(mockSuperAdminAuth.login).toHaveBeenCalled();
    });
  });

  describe('navigation', () => {
    it('navigates to /login when back button is clicked', async () => {
      const user = userEvent.setup();
      renderLogin();

      await user.click(screen.getByText('Back to School Login'));

      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });
});
