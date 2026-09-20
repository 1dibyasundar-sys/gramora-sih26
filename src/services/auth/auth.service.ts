import { IAuthService } from '../interfaces';
import { User, UserRole, normalizeRole } from '@/types';
import { getFirebaseClientAuth, isFirebaseClientConfigured } from '@/lib/firebase';
import { userService as mockUserService } from '../mock';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';

export class FirebaseAuthService implements IAuthService {
  isConfigured(): boolean {
    return isFirebaseClientConfigured();
  }

  private saveToken(token: string | null) {
    if (typeof window === 'undefined') return;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  async getIdToken(forceRefresh = false): Promise<string | null> {
    const auth = getFirebaseClientAuth();
    if (!auth || !auth.currentUser) {
      if (typeof window !== 'undefined') {
        return localStorage.getItem('auth_token');
      }
      return null;
    }
    const token = await auth.currentUser.getIdToken(forceRefresh);
    this.saveToken(token);
    return token;
  }

  async getCurrentUser(): Promise<User | null> {
    if (!this.isConfigured()) {
      return mockUserService.getCurrentUser();
    }

    const token = await this.getIdToken();
    if (!token) return null;

    try {
      const res = await fetch('/api/v1/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data as User;
    } catch {
      return null;
    }
  }

  async signIn(email: string, password: string): Promise<User> {
    const auth = getFirebaseClientAuth();

    // Development / Mock fallback when Firebase credentials are not yet supplied
    if (!auth || !this.isConfigured()) {
      return mockUserService.getCurrentUser();
    }

    const credential = await signInWithEmailAndPassword(auth, email, password);
    const token = await credential.user.getIdToken();
    this.saveToken(token);

    // Fetch authoritative server profile from Firestore via API
    const res = await fetch('/api/v1/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to retrieve authoritative profile.');
    }

    const json = await res.json();
    return json.data as User;
  }

  async signUp(
    email: string,
    password: string,
    onboardingData: Record<string, unknown>
  ): Promise<User> {
    const auth = getFirebaseClientAuth();

    // Fallback when unconfigured
    if (!auth || !this.isConfigured()) {
      const role = normalizeRole(String(onboardingData.role || 'farmer'));
      return mockUserService.switchUserRole(role);
    }

    // 1. Create user in Firebase Authentication
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const token = await credential.user.getIdToken();
    this.saveToken(token);

    // 2. Call backend onboarding API to initialize authoritative profile in Firestore
    const res = await fetch('/api/v1/users/onboard', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...onboardingData,
        email,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to complete profile onboarding.');
    }

    const json = await res.json();
    return json.data as User;
  }

  async signOut(): Promise<void> {
    this.saveToken(null);
    const auth = getFirebaseClientAuth();
    if (auth) {
      await firebaseSignOut(auth);
    }
  }

  async resetPassword(email: string): Promise<void> {
    const auth = getFirebaseClientAuth();
    if (!auth || !this.isConfigured()) {
      // Mock resolution
      return;
    }
    await sendPasswordResetEmail(auth, email);
  }

  onAuthStateChanged(callback: (user: User | null, token: string | null) => void): () => void {
    const auth = getFirebaseClientAuth();
    if (!auth || !this.isConfigured()) {
      mockUserService.getCurrentUser().then((user) => callback(user, null));
      return () => {};
    }

    return firebaseOnAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (!fbUser) {
        this.saveToken(null);
        callback(null, null);
        return;
      }

      try {
        const token = await fbUser.getIdToken();
        this.saveToken(token);
        const res = await fetch('/api/v1/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const json = await res.json();
          callback(json.data as User, token);
        } else {
          callback(null, token);
        }
      } catch {
        callback(null, null);
      }
    });
  }
}

export const authService = new FirebaseAuthService();
