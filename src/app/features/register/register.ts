import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../core/services/auth';
import { HttpErrorResponse } from '@angular/common/http';
import { NotificationService } from '../../core/services/notification.service';
import { MessageService } from 'primeng/api';
import { sharedPrimeModules } from '../../shared/prime-imports';
import { Observable, of, timer } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-register',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    ...sharedPrimeModules
  ],
  templateUrl: './register.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Register implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(Auth);
  private router = inject(Router);
  private notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);

  registerForm: FormGroup;
  isSubmitting = false;
  isVerifying = false;
  otpSent = false;

  activeStep = 1;
  otpValue = '';

  resendCountdown = 0;
  private resendTimer: any = null;

  constructor() {
    this.registerForm = this.fb.group({
      name: ['', Validators.required],
      dateOfBirth: ['', Validators.required],
      email: ['', [Validators.required, Validators.email], [this.emailUniqueValidator.bind(this)]],
      userName: ['', Validators.required, [this.usernameUniqueValidator.bind(this)]],
      password: ['', [
        Validators.required,
        Validators.minLength(12),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/)
      ]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.restoreDraft();
    this.registerForm.valueChanges.subscribe(val => {
      this.saveDraft(val);
    });
  }

  ngOnDestroy(): void {
    this.stopResendTimer();
  }

  // --- Draft Persistence ---
  private saveDraft(formData: any): void {
    try {
      const draft = {
        name: formData.name || '',
        dateOfBirth: formData.dateOfBirth || '',
        email: formData.email || '',
        userName: formData.userName || '',
        password: formData.password || '',
        confirmPassword: formData.confirmPassword || '',
        activeStep: this.activeStep
      };
      sessionStorage.setItem('fin_register_draft', JSON.stringify(draft));
    } catch (e) {}
  }

  private restoreDraft(): void {
    try {
      const saved = sessionStorage.getItem('fin_register_draft');
      if (saved) {
        const draft = JSON.parse(saved);
        this.registerForm.patchValue({
          name: draft.name || '',
          dateOfBirth: draft.dateOfBirth || '',
          email: draft.email || '',
          userName: draft.userName || '',
          password: draft.password || '',
          confirmPassword: draft.confirmPassword || ''
        }, { emitEvent: false });

        if (draft.activeStep && draft.activeStep >= 1 && draft.activeStep <= 4) {
          this.activeStep = draft.activeStep;
          if (this.activeStep === 4) {
            this.startResendTimer();
          }
        }
      }
    } catch (e) {}
  }

  private clearDraft(): void {
    try {
      sessionStorage.removeItem('fin_register_draft');
      sessionStorage.removeItem('fin_resend_target');
    } catch (e) {}
  }

  // --- Resend Timer Helper (Timestamp-based) ---
  startResendTimer(resetNewTarget: boolean = false): void {
    this.stopResendTimer();

    const now = Date.now();
    let targetTime = 0;

    if (!resetNewTarget) {
      targetTime = parseInt(sessionStorage.getItem('fin_resend_target') || '0', 10);
    }

    if (!targetTime || targetTime <= now || resetNewTarget) {
      targetTime = now + 60 * 1000;
      sessionStorage.setItem('fin_resend_target', targetTime.toString());
    }

    const updateCountdown = () => {
      const remainingMs = targetTime - Date.now();
      if (remainingMs <= 0) {
        this.resendCountdown = 0;
        sessionStorage.removeItem('fin_resend_target');
        this.stopResendTimer();
      } else {
        this.resendCountdown = Math.ceil(remainingMs / 1000);
      }
      this.cdr.markForCheck();
    };

    updateCountdown();
    this.resendTimer = setInterval(updateCountdown, 1000);
  }

  stopResendTimer(): void {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
      this.resendTimer = null;
    }
  }

  // --- Wrong Email / Go Back ---
  goToEditEmail(): void {
    this.activeStep = 2;
    this.otpValue = '';
    this.stopResendTimer();
    sessionStorage.removeItem('fin_resend_target');
    this.saveDraft(this.registerForm.value);
    this.cdr.markForCheck();
  }

  // --- Async Validators for Live Verification ---
  emailUniqueValidator(control: AbstractControl): Observable<ValidationErrors | null> {
    if (!control.value) return of(null);
    return timer(500).pipe(
      switchMap(() => this.authService.checkEmail(control.value)),
      map(res => res.isSuccess && res.value === true ? null : { emailTaken: true }),
      catchError(() => of(null))
    );
  }

  usernameUniqueValidator(control: AbstractControl): Observable<ValidationErrors | null> {
    if (!control.value) return of(null);
    return timer(500).pipe(
      switchMap(() => this.authService.checkUsername(control.value)),
      map(res => res.isSuccess && res.value === true ? null : { usernameTaken: true }),
      catchError(() => of(null))
    );
  }

  // --- Stepper Navigation ---
  nextStep() {
    if (this.activeStep === 1) {
      if (this.registerForm.get('name')?.valid && this.registerForm.get('dateOfBirth')?.valid) {
        this.activeStep = 2;
      } else {
        this.registerForm.get('name')?.markAsTouched();
        this.registerForm.get('dateOfBirth')?.markAsTouched();
      }
    } else if (this.activeStep === 2) {
      if (this.registerForm.get('email')?.valid && this.registerForm.get('userName')?.valid) {
        this.activeStep = 3;
      } else {
        this.registerForm.get('email')?.markAsTouched();
        this.registerForm.get('userName')?.markAsTouched();
      }
    }
    this.saveDraft(this.registerForm.value);
  }

  prevStep() {
    if (this.activeStep > 1) {
      this.activeStep--;
      this.saveDraft(this.registerForm.value);
    }
  }

  passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    return password && confirmPassword && password.value !== confirmPassword.value
      ? { passwordMismatch: true }
      : null;
  };

  // --- Password Hint Helpers ---
  hasMinLength(pwd: string): boolean { return pwd?.length >= 12; }
  hasUpper(pwd: string): boolean { return /[A-Z]/.test(pwd || ''); }
  hasLower(pwd: string): boolean { return /[a-z]/.test(pwd || ''); }
  hasNumber(pwd: string): boolean { return /\d/.test(pwd || ''); }
  hasSpecial(pwd: string): boolean { return /[@$!%*?&]/.test(pwd || ''); }

  doPasswordsMatch(): boolean {
    const pwd = this.registerForm.get('password')?.value;
    const confirmPwd = this.registerForm.get('confirmPassword')?.value;
    return !!pwd && !!confirmPwd && pwd === confirmPwd;
  }

  // --- Step 3: Send OTP ---
  sendOtp(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.cdr.markForCheck();

    const { confirmPassword, ...registerData } = this.registerForm.value;

    this.authService.register(registerData).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if (response.isSuccess) {
          this.otpSent = true;
          this.activeStep = 4;
          this.startResendTimer(true);
          this.saveDraft(this.registerForm.value);
          this.notificationService.showSuccess('Verification code sent to your email!');
        } else {
          const msg = response.error?.description || 'Registration failed.';
          this.notificationService.showError(msg);
        }
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting = false;
        if (err.status === 400 && err.error?.errors) {
          this.processValidationErrors(err.error.errors);
          this.notificationService.showError('Please fix the validation errors.');
        } else {
          const detail = err.error?.detail || err.error?.message || 'An unknown error occurred.';
          this.notificationService.showError(detail);
        }
        this.cdr.markForCheck();
      }
    });
  }

  // --- Step 4: Verify OTP ---
  verifyOtp(): void {
    if (!this.otpValue || this.otpValue.length < 6) {
      this.notificationService.showError('Please enter the 6-digit verification code.');
      return;
    }

    this.isVerifying = true;
    this.cdr.markForCheck();

    const email = this.registerForm.get('email')?.value;

    this.authService.verifyRegistration({ email, otp: this.otpValue }).subscribe({
      next: (response) => {
        this.isVerifying = false;
        if (response.isSuccess) {
          this.clearDraft();
          this.notificationService.showSuccess('Account created successfully! Please login.');
          this.router.navigate(['/login']);
        } else {
          const msg = response.error?.description || 'Verification failed.';
          this.notificationService.showError(msg);
        }
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.isVerifying = false;
        const detail = err.error?.detail || err.error?.message || 'Verification failed.';
        this.notificationService.showError(detail);
        this.cdr.markForCheck();
      }
    });
  }

  private processValidationErrors(errors: any) {
    if (Array.isArray(errors)) {
      const message = errors.join('\n');
      this.notificationService.showError(message, 'Validation Error');
    } else if (typeof errors === 'object' && errors !== null) {
      for (const key in errors) {
        if (errors.hasOwnProperty(key)) {
          let formControlName = key.charAt(0).toLowerCase() + key.slice(1);
          const control = this.registerForm.get(formControlName);

          if (control) {
            const errorMessages = errors[key].join(' ');
            control.setErrors({ serverError: errorMessages });
          } else {
            const msg = errors[key].join(' ');
            this.notificationService.showError(msg, 'Validation Error');
          }
        }
      }
    } else {
      this.notificationService.showError('An unexpected validation error occurred.');
    }
  }
}
