import { Injectable, Inject, PLATFORM_ID, inject, signal, computed, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of, tap, throwError, interval } from 'rxjs';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { environment } from '../../../environments/environment';
import { ApiResult } from './generic-api';
import { jwtDecode } from 'jwt-decode';
import { Router } from '@angular/router';

// --- AUTH-SPECIFIC DTOs ---
export interface RegisterUserDto {
  name: string;
}

export interface UserDetails {
  name: string;
  email: string;
  exp: number;
  roles: string[];
}

export interface LoginUserDto {
  userName: string;
  password: string;
  forceLogin?: boolean;
}

export interface LoginResponseDto {
  accessToken: string;
  refreshToken: string;
  userName: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface VerifyOtpDto {
  email: string;
  otp: string;
}

export interface ResetPasswordDto {
  email: string;
  otp: string;
  newPassword: string;
}

@Injectable({
  providedIn: 'root'
})
export class Auth {
  private apiBaseUrl = environment.apiBaseUrl;
  private isBrowser: boolean;
  private router = inject(Router);
  private http = inject(HttpClient);

  // --- STATE WITH SIGNALS ---
  private _accessToken = signal<string | null>(null);
  private _currentUserDetails = signal<UserDetails | null>(null);

  // Public readonly signals
  public accessToken = this._accessToken.asReadonly();
  public currentUserDetails = this._currentUserDetails.asReadonly();

  public currentUser = computed(() => this._currentUserDetails()?.name ?? null);
  public currentUserEmail = computed(() => this._currentUserDetails()?.email ?? null);
  public isLoggedIn = computed(() => !!this._accessToken() || (this.isBrowser && !!localStorage.getItem('refreshToken')));
  public isAdmin = computed(() => this._currentUserDetails()?.roles?.includes('Admin') ?? false);

  // Session Expiry Timer
  private _now = toSignal(interval(1000).pipe(map(() => Math.floor(Date.now() / 1000))), { initialValue: Math.floor(Date.now() / 1000) });

  public sessionExpiresIn = computed(() => {
    const details = this._currentUserDetails();
    if (!details || !details.exp) return 'N/A';

    const now = this._now();
    const secondsLeft = details.exp - now;

    if (secondsLeft <= 0) return 'Expired';

    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  });

  private refreshTimer: any;
  private isLoggingOut = false;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  private buildUrl(...segments: string[]): string {
    const fullPath = [this.apiBaseUrl, ...segments]
      .map(segment => segment.replace(/^\/+|\/+$/g, ''))
      .join('/');
    return fullPath;
  }

  // --- PRIVATE HELPERS ---

  private getRefreshToken(): string | null {
    if (this.isBrowser) {
      return localStorage.getItem('refreshToken');
    }
    return null;
  }

  private storeTokens(accessToken: string, refreshToken: string): void {
    if (this.isLoggingOut) return; // Prevent race condition

    // GUARD: valid tokens
    if (!accessToken || !refreshToken) {
      return;
    }

    this._accessToken.set(accessToken);
    if (this.isBrowser) {
      localStorage.setItem('refreshToken', refreshToken);
    }
    this.decodeAndSetUser(accessToken);
    this.startSilentRefresh();
  }

  private clearTokens(): void {
    this._accessToken.set(null);
    this._currentUserDetails.set(null);
    if (this.isBrowser) {
      localStorage.removeItem('refreshToken');
    }
    this.stopSilentRefresh();
  }

  private decodeAndSetUser(token: string): void {
    try {
      const decodedToken: any = jwtDecode(token);
      // Extract roles: JWT role claim can be a string or array
      const roleClaim = decodedToken['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
      const roles: string[] = Array.isArray(roleClaim) ? roleClaim : (roleClaim ? [roleClaim] : []);
      const userDetails: UserDetails = {
        name: decodedToken.sub,
        email: decodedToken.email,
        exp: decodedToken.exp,
        roles
      };
      this._currentUserDetails.set(userDetails);
    } catch (e) {
      this.clearTokens();
    }
  }
  public cleanSession(): void {
    this.clearTokens();
  }

  // --- SILENT REFRESH LOGIC ---

  private startSilentRefresh() {
    this.stopSilentRefresh(); // clear any existing

    const details = this._currentUserDetails();
    if (!details || !details.exp) return;

    const expiresAt = details.exp * 1000;
    const now = Date.now();
    // Refresh 1 minute before expiry, or immediately if close
    const timeUntilExpiry = expiresAt - now;
    const refreshTime = timeUntilExpiry - (60 * 1000); // 1 minute before

    // If token is already expired or expires in < 1 min, refresh immediately (next tick) or soon
    const delay = Math.max(0, refreshTime);

    this.refreshTimer = setTimeout(() => {
      this.refreshToken().subscribe();
    }, delay);
  }

  private stopSilentRefresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  // --- PUBLIC API ---

  /**
   * Restores the user session from local storage on application startup.
   * @returns An Observable that emits true if session is restored, false otherwise.
   */
  public restoreSession(): Observable<boolean> {
    if (!this.isBrowser) return of(false);

    // Check if we have a refresh token in local storage
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return of(false);

    return this.refreshToken().pipe(
      map(success => success),
      catchError(() => of(false))
    );
  }

  /**
   * Initiates registration — sends OTP to user's email.
   * @param userData The user registration DTO.
   * @returns An Observable containing the API result.
   */
  register(userData: RegisterUserDto): Observable<ApiResult<string>> {
    this.isLoggingOut = false;
    return this.http.post<ApiResult<string>>(this.buildUrl('Auth', 'register'), userData);
  }

  /**
   * Completes registration by verifying the OTP.
   * @param dto The verify registration DTO (email + otp).
   * @returns An Observable containing the API result.
   */
  verifyRegistration(dto: { email: string; otp: string }): Observable<ApiResult<string>> {
    return this.http.post<ApiResult<string>>(this.buildUrl('Auth', 'verify-registration'), dto);
  }

  checkEmail(email: string): Observable<ApiResult<boolean>> {
    return this.http.post<ApiResult<boolean>>(this.buildUrl('Auth', 'check-email'), { email });
  }

  checkUsername(username: string): Observable<ApiResult<boolean>> {
    return this.http.post<ApiResult<boolean>>(this.buildUrl('Auth', 'check-username'), { username });
  }

  /**
   * Authenticates a user.
   * @param credentials The user login DTO.
   * @returns An Observable containing the login response with tokens.
   */
  login(credentials: LoginUserDto): Observable<ApiResult<LoginResponseDto>> {
    this.isLoggingOut = false;
    return this.http.post<ApiResult<LoginResponseDto>>(this.buildUrl('Auth', 'login'), credentials).pipe(
      tap(response => {
        if (response.isSuccess && response.value) {
          this.storeTokens(response.value.accessToken, response.value.refreshToken);
        }
      })
    );
  }

  changePassword(dto: ChangePasswordDto): Observable<ApiResult<boolean>> {
    return this.http.post<ApiResult<boolean>>(this.buildUrl('Auth', 'change-password'), dto);
  }

  forgotPassword(dto: ForgotPasswordDto): Observable<ApiResult<boolean>> {
    return this.http.post<ApiResult<boolean>>(this.buildUrl('Auth', 'forgot-password'), dto);
  }

  verifyOtp(dto: VerifyOtpDto): Observable<ApiResult<boolean>> {
    return this.http.post<ApiResult<boolean>>(this.buildUrl('Auth', 'verify-otp'), dto);
  }

  resetPassword(dto: ResetPasswordDto): Observable<ApiResult<boolean>> {
    return this.http.post<ApiResult<boolean>>(this.buildUrl('Auth', 'reset-password'), dto);
  }

  /**
   * Refreshes the access token using the stored refresh token.
   * @returns An Observable that emits true if refresh was successful, false otherwise.
   */
  refreshToken(): Observable<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.logout('Session Expired');
      return of(false);
    }

    return this.http.post<ApiResult<LoginResponseDto>>(this.buildUrl('Auth', 'refresh'), { refreshToken }).pipe(
      map(response => {
        if (response.isSuccess && response.value) {
          this.storeTokens(response.value.accessToken, response.value.refreshToken);
          return true;
        }
        this.logout('Refresh Failed');
        return false;
      }),
      catchError(() => {
        this.logout('Refresh Error');
        return of(false);
      })
    );
  }

  /**
   * Logs out the current user, clears tokens, and redirects to login.
   * @param reason Optional reason for logout to display on login page.
   */
  logout(reason?: string): void {
    if (this.isLoggingOut) return; // Debounce
    this.isLoggingOut = true;

    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      // Call backend to revoke token - Fire and forget
      this.http.post(this.buildUrl('Auth', 'logout'), { refreshToken }).pipe(
        catchError(() => of(null))
      ).subscribe();
    }

    this.clearTokens();
    this.router.navigate(['/login'], {
      queryParams: reason ? { reason } : undefined
    });
  }
}
