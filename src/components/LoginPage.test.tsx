import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockLogin = vi.fn();
const mockStudentLogin = vi.fn();

vi.mock('../contexts/SchoolContext', () => ({
  useSchool: () => ({
    login: mockLogin,
    studentLogin: mockStudentLogin,
    classes: [
      { id: 1, name: 'JSS 1' },
      { id: 2, name: 'JSS 2' },
      { id: 3, name: 'JSS 3' },
      { id: 4, name: 'SSS 1' },
      { id: 5, name: 'SSS 2' },
      { id: 6, name: 'SSS 3' },
    ],
  }),
}));

vi.mock('../config/api', () => ({
  API_CONFIG: {
    BASE_URL: 'http://localhost:3000/api',
  },
}));

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <LoginPage />
    </MemoryRouter>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the login form', () => {
      renderLogin();
      expect(screen.getByText('Welcome Back')).toBeInTheDocument();
      expect(screen.getByText('Sign in to your account to access the portal')).toBeInTheDocument();
    });

    it('renders the SmugFlex brand', () => {
      renderLogin();
      expect(screen.getByText('SmugFlex Portal')).toBeInTheDocument();
    });

    it('renders role selector', () => {
      renderLogin();
      expect(screen.getByText('Administrator')).toBeInTheDocument();
    });

    it('renders username input', () => {
      renderLogin();
      expect(screen.getByLabelText('Username or Email')).toBeInTheDocument();
    });

    it('renders password input', () => {
      renderLogin();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('renders sign in button', () => {
      renderLogin();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('renders student portal section', () => {
      renderLogin();
      expect(screen.getByText('Student Portal')).toBeInTheDocument();
      expect(screen.getByText('LAUNCH STUDENT ACCESS')).toBeInTheDocument();
    });

    it('renders footer text', () => {
      renderLogin();
      expect(screen.getByText(/2026 SmugFlex/)).toBeInTheDocument();
    });
  });

  describe('form validation', () => {
    it('shows error when fields are empty and login clicked', async () => {
      const user = userEvent.setup();
      renderLogin();
      await user.click(screen.getByRole('button', { name: /sign in/i }));
      expect(screen.getByText('Please fill in all fields to continue.')).toBeInTheDocument();
    });
  });

  describe('user login', () => {
    it('calls login with correct parameters', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue({ id: 1, role: 'admin' });
      renderLogin();

      await user.type(screen.getByLabelText('Username or Email'), 'admin');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      expect(mockLogin).toHaveBeenCalledWith('admin', 'password123', 'admin');
    });

    it('navigates to role-specific path on success', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue({ id: 1, role: 'admin' });
      renderLogin();

      await user.type(screen.getByLabelText('Username or Email'), 'admin');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/admin');
      });
    });

    it('shows error on failed login', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue(null);
      renderLogin();

      await user.type(screen.getByLabelText('Username or Email'), 'admin');
      await user.type(screen.getByLabelText('Password'), 'wrongpass');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials. Please check your username and password.')).toBeInTheDocument();
      });
    });

    it('shows error on login exception', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValue(new Error('Network error'));
      renderLogin();

      await user.type(screen.getByLabelText('Username or Email'), 'admin');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('shows loading state during login', async () => {
      const user = userEvent.setup();
      let resolveLogin: any;
      mockLogin.mockImplementation(() => new Promise(r => { resolveLogin = r; }));
      renderLogin();

      await user.type(screen.getByLabelText('Username or Email'), 'admin');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Authenticating...')).toBeInTheDocument();
      });

      resolveLogin({ id: 1, role: 'admin' });
    });
  });

  describe('password visibility toggle', () => {
    it('toggles password visibility on eye icon click', async () => {
      const user = userEvent.setup();
      renderLogin();

      const passwordInput = screen.getByLabelText('Password');
      expect(passwordInput).toHaveAttribute('type', 'password');

      const eyeButton = screen.getByRole('button', { name: /show password/i });
      await user.click(eyeButton);

      expect(passwordInput).toHaveAttribute('type', 'text');
    });
  });

  describe('enter key handling', () => {
    it('submits form on Enter when fields are filled', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue({ id: 1, role: 'admin' });
      renderLogin();

      await user.type(screen.getByLabelText('Username or Email'), 'admin');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.keyboard('{Enter}');

      expect(mockLogin).toHaveBeenCalled();
    });
  });

  describe('back to home', () => {
    it('navigates to home when back button is clicked', async () => {
      const user = userEvent.setup();
      renderLogin();

      const backButton = screen.getByRole('button', { name: /back to home/i });
      await user.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('student access modal', () => {
    it('opens student modal when LAUNCH STUDENT ACCESS is clicked', async () => {
      const user = userEvent.setup();
      renderLogin();

      await user.click(screen.getByText('LAUNCH STUDENT ACCESS'));

      expect(screen.getByText('Access your results')).toBeInTheDocument();
      expect(screen.getByText('Select your class')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('SMF/000/000')).toBeInTheDocument();
    });

    it('shows error when submitting student login without class', async () => {
      const user = userEvent.setup();
      renderLogin();

      await user.click(screen.getByText('LAUNCH STUDENT ACCESS'));
      await user.type(screen.getByPlaceholderText('SMF/000/000'), 'SMF/001/001');
      await user.click(screen.getByRole('button', { name: /view results/i }));

      await waitFor(() => {
        expect(screen.getAllByText('Please select your class and enter your registration number.').length).toBeGreaterThan(0);
      });
    });

    it('closes modal when close button is clicked', async () => {
      const user = userEvent.setup();
      renderLogin();

      await user.click(screen.getByText('LAUNCH STUDENT ACCESS'));
      expect(screen.getByText('Access your results')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /close modal/i }));

      await waitFor(() => {
        expect(screen.queryByLabelText('Registration Number')).not.toBeInTheDocument();
      });
    });
  });

  describe('role selector', () => {
    it('allows selecting a different role', async () => {
      const user = userEvent.setup();
      renderLogin();

      await user.click(screen.getByText('Administrator'));
      await user.click(screen.getByText('Teacher'));

      expect(screen.getByText('Teacher')).toBeInTheDocument();
    });
  });

  describe('forgot password', () => {
    it('shows contact admin message when forgot password clicked', async () => {
      const user = userEvent.setup();
      renderLogin();

      await user.click(screen.getByText('Forgot Password?'));

      await waitFor(() => {
        expect(screen.getByText('Please contact the school administrator to reset your password.')).toBeInTheDocument();
      });
    });
  });

  describe('student login flow', () => {
    it('logs in student successfully', async () => {
      const user = userEvent.setup();
      mockStudentLogin.mockResolvedValue({ id: 1, role: 'student' });
      renderLogin();

      await user.click(screen.getByText('LAUNCH STUDENT ACCESS'));
      
      await user.click(screen.getByText('Select your class'));
      await user.click(screen.getByText('JSS 1'));
      
      await user.type(screen.getByPlaceholderText('SMF/000/000'), 'SMF/001/001');
      await user.click(screen.getByRole('button', { name: /view results/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/student');
      });
    });

    it('shows error when class not found', async () => {
      const user = userEvent.setup();
      mockStudentLogin.mockResolvedValue(null);
      renderLogin();

      await user.click(screen.getByText('LAUNCH STUDENT ACCESS'));
      
      await user.click(screen.getByText('Select your class'));
      await user.click(screen.getByText('JSS 1'));
      
      await user.type(screen.getByPlaceholderText('SMF/000/000'), 'SMF/001/001');
      await user.click(screen.getByRole('button', { name: /view results/i }));

      await waitFor(() => {
        expect(screen.getAllByText(/Student verification failed/).length).toBeGreaterThan(0);
      });
    });
  });
});
