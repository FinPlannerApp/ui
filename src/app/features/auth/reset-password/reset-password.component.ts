import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Auth, ResetPasswordDto, VerifyOtpDto } from '../../../core/services/auth';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { sharedPrimeModules } from '../../../shared/prime-imports';

@Component({
    selector: 'app-reset-password',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterModule,
        ...sharedPrimeModules
    ],
    templateUrl: './reset-password.component.html',
    styles: [`
    ::ng-deep .p-password input {
      width: 100%;
    }
  `],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [MessageService]
})
export class ResetPasswordComponent implements OnInit {
    private fb = inject(FormBuilder);
    private authService = inject(Auth);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private messageService = inject(MessageService);
    private cdr = inject(ChangeDetectorRef);

    form: FormGroup;
    isSubmitting = false;
    email = '';
    step = 1;
    resendCountdown = signal(0);
    private timerInterval: any;

    constructor() {
        this.form = this.fb.group({
            otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
            newPassword: ['', [Validators.required, Validators.minLength(12)]],
            confirmPassword: ['', Validators.required]
        }, { validators: this.passwordMatchValidator });
    }

    ngOnInit(): void {
        this.authService.cleanSession();
        this.route.queryParams.subscribe(params => {
            this.email = params['email'] || '';
            if (!this.email) {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Email missing. Please restart.' });
            }
        });
    }

    onResendCode() {
        if (this.resendCountdown() > 0 || !this.email || this.isSubmitting) return;

        this.isSubmitting = true;
        this.cdr.markForCheck();

        this.authService.forgotPassword({ email: this.email }).subscribe({
            next: (res) => {
                this.isSubmitting = false;
                if (res.isSuccess) {
                    this.messageService.add({ severity: 'success', summary: 'Success', detail: 'A new code has been sent to your email.' });
                    this.startResendTimer();
                } else {
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to resend code.' });
                }
                this.cdr.markForCheck();
            },
            error: () => {
                this.isSubmitting = false;
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'An error occurred while resending.' });
                this.cdr.markForCheck();
            }
        });
    }

    private startResendTimer() {
        this.resendCountdown.set(60);
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.resendCountdown.update(v => (v > 0 ? v - 1 : 0));
            if (this.resendCountdown() === 0) {
                clearInterval(this.timerInterval);
            }
            this.cdr.markForCheck();
        }, 1000);
    }

    passwordMatchValidator(g: FormGroup) {
        return g.get('newPassword')?.value === g.get('confirmPassword')?.value
            ? null : { mismatch: true };
    }

    onVerifyOtp() {
        if (this.form.get('otp')?.invalid || this.isSubmitting || !this.email) return;

        this.isSubmitting = true;
        this.cdr.markForCheck();

        const dto: VerifyOtpDto = {
            email: this.email,
            otp: this.form.value.otp
        };

        this.authService.verifyOtp(dto).subscribe({
            next: (res) => {
                this.isSubmitting = false;
                if (res.isSuccess) {
                    this.step = 2;
                    this.messageService.add({ severity: 'success', summary: 'Success', detail: 'OTP verified. Please enter your new password.' });
                } else {
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: res.error?.description || 'Invalid OTP' });
                }
                this.cdr.markForCheck();
            },
            error: (err: HttpErrorResponse) => {
                this.isSubmitting = false;
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'An error occurred' });
                this.cdr.markForCheck();
            }
        });
    }

    // --- Password Hint Helpers ---
    hasMinLength(pwd: string): boolean { return pwd?.length >= 12; }
    hasUpper(pwd: string): boolean { return /[A-Z]/.test(pwd || ''); }
    hasLower(pwd: string): boolean { return /[a-z]/.test(pwd || ''); }
    hasNumber(pwd: string): boolean { return /\d/.test(pwd || ''); }
    hasSpecial(pwd: string): boolean { return /[@$!%*?&]/.test(pwd || ''); }

    doPasswordsMatch(): boolean {
        const pwd = this.form.get('newPassword')?.value;
        const confirmPwd = this.form.get('confirmPassword')?.value;
        return !!pwd && !!confirmPwd && pwd === confirmPwd;
    }

    onSubmit() {
        if (this.step === 1) {
            this.onVerifyOtp();
            return;
        }

        if (this.form.invalid || this.isSubmitting || !this.email) return;

        this.isSubmitting = true;
        this.cdr.markForCheck();

        const dto: ResetPasswordDto = {
            email: this.email,
            otp: this.form.value.otp,
            newPassword: this.form.value.newPassword
        };

        this.authService.resetPassword(dto).subscribe({
            next: (res) => {
                this.isSubmitting = false;
                if (res.isSuccess) {
                    this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Password reset successfully. Redirecting...' });
                    setTimeout(() => this.router.navigate(['/login']), 2000);
                } else {
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: res.error?.description || 'Reset failed' });
                }
                this.cdr.markForCheck();
            },
            error: (err: HttpErrorResponse) => {
                this.isSubmitting = false;
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'An error occurred' });
                this.cdr.markForCheck();
            }
        });
    }
}
