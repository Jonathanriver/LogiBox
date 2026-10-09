import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { User, LoginCredentials, AuthResponse, AccessRequest, DemoUser } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);

  private apiUrl = typeof window !== 'undefined' && window.location.port === '4200'
    ? 'http://localhost:3000/api/auth'
    : '/api/auth';

  private storageKey = 'logibox_user_session';
  
  // Angular 18 Signals
  currentUser = signal<User | null>(this.loadStoredUser());
  isLoggedIn = signal<boolean>(!!this.loadStoredUser());

  private loadStoredUser(): User | null {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(this.storageKey) || sessionStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(res => {
        if (res.success && res.user && res.token) {
          this.currentUser.set(res.user);
          this.isLoggedIn.set(true);

          const storage = credentials.rememberMe ? localStorage : sessionStorage;
          storage.setItem(this.storageKey, JSON.stringify(res.user));
          storage.setItem('logibox_token', res.token);
        }
      })
    );
  }

  requestAccess(request: AccessRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/request-access`, request);
  }

  forgotPassword(email: string): Observable<{ success: boolean; message: string; demoPasswordHint?: string }> {
    return this.http.post<{ success: boolean; message: string; demoPasswordHint?: string }>(
      `${this.apiUrl}/forgot-password`,
      { email }
    );
  }

  getDemoUsers(): Observable<{ success: boolean; data: DemoUser[] }> {
    return this.http.get<{ success: boolean; data: DemoUser[] }>(`${this.apiUrl}/demo-users`);
  }

  logout(): Observable<{ success: boolean; message: string }> {
    this.currentUser.set(null);
    this.isLoggedIn.set(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.storageKey);
      localStorage.removeItem('logibox_token');
      sessionStorage.removeItem(this.storageKey);
      sessionStorage.removeItem('logibox_token');
    }
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/logout`, {});
  }
}

