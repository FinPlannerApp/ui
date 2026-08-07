import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Auth, LoginUserDto } from '../../core/services/auth';
import { HttpErrorResponse } from '@angular/common/http';
import { NotificationService } from '../../core/services/notification.service';
import { ValidationService } from '../../core/services/validation.service';
import { ThemeEngine } from '../../core/services/theme';
import { sharedPrimeModules } from '../../shared/prime-imports';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    ...sharedPrimeModules
  ],
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Login {
  private fb = inject(FormBuilder);
  private authService = inject(Auth);
  private router = inject(Router);
  private notificationService = inject(NotificationService);
  public validationService = inject(ValidationService);
  public themeEngine = inject(ThemeEngine);
  private cdr = inject(ChangeDetectorRef);

  loginForm: FormGroup;
  isSubmitting: boolean = false;
  showConcurrentLoginModal: boolean = false;

  constructor() {
    this.loginForm = this.fb.group({
      userName: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid || this.isSubmitting) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const credentials: LoginUserDto = this.loginForm.value;
    this.performLogin(credentials);
  }

  performLogin(credentials: LoginUserDto): void {
    this.isSubmitting = true;
    this.cdr.markForCheck();

    this.authService.login(credentials).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if (response.isSuccess) {
          this.showConcurrentLoginModal = false;
          this.router.navigate(['/app/dashboard']);
        } else {
          // Check for Concurrent Login (Backend returns 200 OK with failure)
          if (response.error?.code === 'Auth.ConcurrentLogin') {
            this.showConcurrentLoginModal = true;
            this.cdr.markForCheck();
            return;
          }

          const msg = response.error?.description || 'Login failed';
          this.notificationService.showError(msg, 'Login Failed');
        }
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting = false;

        // Check for Concurrent Login Error
        if (err.status === 400) {
          const errorBody = err.error;
          let isConcurrent = false;

          if (errorBody?.errors && Array.isArray(errorBody.errors)) {
            isConcurrent = errorBody.errors.includes('ConcurrentLogin');
          }

          if (!isConcurrent && errorBody?.message) {
            isConcurrent = errorBody.message.includes('already logged in') || errorBody.message.includes('ConcurrentLogin');
          }

          if (isConcurrent) {
            this.showConcurrentLoginModal = true;
            this.cdr.markForCheck();
            return;
          }
        }

        const detail = err.error?.message || 'An unknown error occurred.';
        this.notificationService.showError(detail, 'Error');
        this.cdr.markForCheck();
      }
    });
  }

  confirmForceLogin(): void {
    const credentials: LoginUserDto = {
      ...this.loginForm.value,
      forceLogin: true
    };
    this.performLogin(credentials);
  }

  cancelForceLogin(): void {
    this.showConcurrentLoginModal = false;
    this.loginForm.reset();
    this.cdr.markForCheck();
  }
}

