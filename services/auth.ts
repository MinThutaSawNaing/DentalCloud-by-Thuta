import { User } from '../types';
import { api } from './api';

// Default admin credentials
export const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'admin123'
};

// Session storage keys
const SESSION_KEY = 'dental_auth_session';
const SESSION_USER_KEY = 'dental_auth_user';

export interface AuthSession {
  userId: string;
  username: string;
  role: 'admin' | 'normal';
  location_id: string | null;
  loginTime: number;
}

export const auth = {
  // Initialize default admin if it doesn't exist
  async initializeDefaultAdmin(): Promise<void> {
    try {
      const users = await api.users.getAll();
      const adminExists = users.some(u => u.username === DEFAULT_ADMIN.username && u.role === 'admin');
      
      if (!adminExists) {
        // Create default admin
        await api.users.create({
          username: DEFAULT_ADMIN.username,
          password: DEFAULT_ADMIN.password,
          role: 'admin'
        });
      }
    } catch (error) {
      console.warn('Error initializing default admin:', error);
    }
  },

  // Login with username, password, and CAPTCHA
  async login(username: string, password: string, captchaAnswer: number, captchaExpected: number): Promise<AuthSession> {
    // Verify CAPTCHA
    if (captchaAnswer !== captchaExpected) {
      throw new Error('Invalid CAPTCHA. Please try again.');
    }

    // Check default admin first
    if (username === DEFAULT_ADMIN.username && password === DEFAULT_ADMIN.password) {
      const session: AuthSession = {
        userId: 'admin-default',
        username: DEFAULT_ADMIN.username,
        role: 'admin',
        location_id: null,
        loginTime: Date.now()
      };
      this.setSession(session);
      return session;
    }

    // Check database users
    try {
      const user = await api.users.authenticate(username, password);
      if (!user) {
        throw new Error('Invalid username or password');
      }

      const session: AuthSession = {
        userId: user.id,
        username: user.username,
        role: user.role,
        location_id: user.location_id || null,
        loginTime: Date.now()
      };
      this.setSession(session);
      return session;
    } catch (error: any) {
      throw new Error(error.message || 'Invalid username or password');
    }
  },

  // Logout
  logout(): void {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_USER_KEY);
  },

  // Get current session
  getSession(): AuthSession | null {
    try {
      const sessionStr = localStorage.getItem(SESSION_KEY);
      if (!sessionStr) return null;
      
      const session: AuthSession = JSON.parse(sessionStr);
      // Check if session is still valid (24 hours)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      if (Date.now() - session.loginTime > maxAge) {
        this.logout();
        return null;
      }
      return session;
    } catch {
      return null;
    }
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.getSession() !== null;
  },

  // Check if user is admin
  isAdmin(): boolean {
    const session = this.getSession();
    return session?.role === 'admin' || false;
  },

  // Set session
  setSession(session: AuthSession): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  },

  // Get current user
  getCurrentUser(): AuthSession | null {
    return this.getSession();
  }
};

