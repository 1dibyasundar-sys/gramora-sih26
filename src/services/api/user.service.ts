import { IUserService } from '../interfaces';
import { User, UserRole } from '@/types';
import { userService as mockUserService } from '../mock';

export class ApiUserService implements IUserService {
  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  }

  async getCurrentUser(): Promise<User> {
    const token = this.getAuthToken();
    if (!token) {
      // If no token in local storage, fall back to mock service for local prototyping
      return mockUserService.getCurrentUser();
    }

    const res = await fetch('/api/v1/users/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Failed to fetch profile: ${res.status}`);
    }

    const json = await res.json();
    return json.data as User;
  }

  async switchUserRole(role: UserRole): Promise<User> {
    const token = this.getAuthToken();
    if (token) {
      // In an authenticated session, mock role switching is disallowed; return current authoritative profile
      return this.getCurrentUser();
    }
    // Role switching in frontend dev mode delegates to mock service
    return mockUserService.switchUserRole(role);
  }

  async getUserById(id: string): Promise<User | null> {
    const current = await this.getCurrentUser();
    if (current && current.id === id) {
      return current;
    }
    return mockUserService.getUserById(id);
  }

  async updateProfile(id: string, updates: Partial<User>): Promise<User> {
    const token = this.getAuthToken();
    if (!token) {
      return mockUserService.updateProfile(id, updates);
    }

    const res = await fetch('/api/v1/users/me', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Failed to update profile: ${res.status}`);
    }

    const json = await res.json();
    return json.data as User;
  }

  async getAllUsers(): Promise<User[]> {
    return mockUserService.getAllUsers();
  }
}

export const apiUserService = new ApiUserService();
