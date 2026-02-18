import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';

export interface LoginResponse {
  success: boolean;
  token?: string;
  message?: string;
}

export interface RegisterResponse {
  success: boolean;
  message?: string;
}

export interface PasswordResetResponse {
  success: boolean;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly API_URL = 'https://api.retailos.ru/api/auth';

  constructor(private readonly http: HttpClient) {}

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.API_URL}/login`, { email, password })
      .pipe(catchError((error) => of({ success: false, message: this.extractErrorMessage(error) })));
  }

  register(data: { name?: string; email: string; password: string }): Observable<RegisterResponse> {
    return this.http
      .post<RegisterResponse>(`${this.API_URL}/register`, data)
      .pipe(catchError((error) => of({ success: false, message: this.extractErrorMessage(error) })));
  }

  requestPasswordReset(email: string): Observable<PasswordResetResponse> {
    return this.http
      .post<PasswordResetResponse>(`${this.API_URL}/forgot-password`, { email })
      .pipe(catchError((error) => of({ success: false, message: this.extractErrorMessage(error) })));
  }

  resetPassword(token: string, password: string): Observable<PasswordResetResponse> {
    return this.http
      .post<PasswordResetResponse>(`${this.API_URL}/reset-password`, { token, password })
      .pipe(catchError((error) => of({ success: false, message: this.extractErrorMessage(error) })));
  }

  setToken(token: string): void {
    this.storage()?.setItem(this.TOKEN_KEY, token);
  }

  getToken(): string | null {
    return this.storage()?.getItem(this.TOKEN_KEY) ?? null;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    this.storage()?.removeItem(this.TOKEN_KEY);
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const apiMessage = error.error?.message;
      if (typeof apiMessage === 'string' && apiMessage.trim()) {
        return apiMessage;
      }

      if (typeof error.message === 'string' && error.message.trim()) {
        return error.message;
      }
    }

    return 'Request failed';
  }

  private storage(): Storage | null {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.localStorage;
  }
}
