import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
  private route = inject(ActivatedRoute);
  private notificationService = inject(NotificationService);
  public validationService = inject(ValidationService);
  public themeEngine = inject(ThemeEngine);
  private cdr = inject(ChangeDetectorRef);

  loginForm: FormGroup;
  isSubmitting: boolean = false;
  /** True after the API asked for the emailed code that confirms a new device. */
  awaitingDeviceCode: boolean = false;

  constructor() {
    this.loginForm = this.fb.group({
      userName: ['', Validators.required],
      password: ['', Validators.required],
      deviceVerificationCode: ['']
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid || this.isSubmitting) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { userName, password, deviceVerificationCode } = this.loginForm.value;
    const credentials: LoginUserDto = { userName, password };

    if (this.awaitingDeviceCode) {
      const code = (deviceVerificationCode ?? '').toString().trim();
      if (!code) {
        this.notificationService.showError('Enter the code we emailed you.', 'Verification Needed');
        return;
      }
      credentials.deviceVerificationCode = code;
    }

    this.performLogin(credentials);
  }

  performLogin(credentials: LoginUserDto): void {
    this.isSubmitting = true;
    this.cdr.markForCheck();

    this.authService.login(credentials).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if (response.isSuccess) {
          this.awaitingDeviceCode = false;
          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || sessionStorage.getItem('pending_return_url');
          if (returnUrl) {
            sessionStorage.removeItem('pending_return_url');
            this.router.navigateByUrl(returnUrl).then(success => {
              if (!success) {
                window.location.href = returnUrl;
              }
            });
          } else {
            this.router.navigate(['/app/dashboard']).then(success => {
              if (!success) {
                window.location.href = '/app/dashboard';
              }
            });
          }
        } else {
          const code = response.error?.code;

          // A new device: the API emailed a code. Show the code field and let the user resubmit.
          if (code === 'Auth.DeviceVerificationRequired') {
            this.awaitingDeviceCode = true;
            this.loginForm.get('deviceVerificationCode')?.reset('');
            this.notificationService.showInfo(
              response.error?.description || 'We emailed a verification code to confirm this new device.',
              'Check Your Email');
            this.cdr.markForCheck();
            return;
          }

          // Too many wrong codes: start over so a fresh code gets sent.
          if (code === 'Auth.TooManyAttempts') {
            this.awaitingDeviceCode = false;
            this.loginForm.get('deviceVerificationCode')?.reset('');
          }

          const msg = response.error?.description || 'Login failed';
          this.notificationService.showError(msg, 'Login Failed');
        }
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting = false;
        const detail = err.error?.message || 'An unknown error occurred.';
        this.notificationService.showError(detail, 'Error');
        this.cdr.markForCheck();
      }
    });
  }

  /** Back out of the code step (wrong account, or the code never arrived). */
  cancelDeviceCode(): void {
    this.awaitingDeviceCode = false;
    this.loginForm.get('deviceVerificationCode')?.reset('');
    this.cdr.markForCheck();
  }
}
