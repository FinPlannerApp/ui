import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Auth, ForgotPasswordDto } from '../../../core/services/auth';
import { HttpErrorResponse } from '@angular/common/http';
import { sharedPrimeModules } from '../../../shared/prime-imports';

@Component({
    selector: 'app-forgot-password',
    imports: [ReactiveFormsModule, RouterLink, ...sharedPrimeModules],
    templateUrl: './forgot-password.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [MessageService]
})
export class ForgotPasswordComponent {
    private fb = inject(FormBuilder);
    private authService = inject(Auth);
    private messageService = inject(MessageService);
    private cdr = inject(ChangeDetectorRef);
    private router = inject(Router);

    form: FormGroup;
    isSubmitting = false;
    step = signal(1);
    usernameExists = signal<boolean | null>(null);

    constructor() {
        this.form = this.fb.group({
            username: ['', [Validators.required, Validators.minLength(3)]],
            email: ['', [Validators.required, Validators.email]]
        });
    }

    onNext() {
        if (this.step() === 1) {
            if (this.form.get('username')?.invalid || this.isSubmitting) return;

            this.isSubmitting = true;
            this.cdr.markForCheck();

            this.authService.checkUsername(this.form.value.username).subscribe({
                next: (res) => {
                    this.isSubmitting = false;
                    // res.value is isAvailable (false means username exists in DB, true means available/not found)
                    if (res.isSuccess && res.value === false) {
                        this.usernameExists.set(true);
                        this.step.set(2);
                    } else {
                        this.usernameExists.set(false);
                        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Username not found.' });
                    }
                    this.cdr.markForCheck();
                },
                error: () => {
                    this.isSubmitting = false;
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not verify username.' });
                    this.cdr.markForCheck();
                }
            });
        }
    }

    onSubmit() {
        if (this.step() === 1) {
            this.onNext();
            return;
        }

        if (this.form.invalid || this.isSubmitting) return;

        this.isSubmitting = true;
        this.cdr.markForCheck();

        const dto: ForgotPasswordDto = { email: this.form.value.email };

        this.authService.forgotPassword(dto).subscribe({
            next: (res) => {
                this.isSubmitting = false;
                if (res.isSuccess) {
                    this.messageService.add({ severity: 'success', summary: 'Success', detail: 'If the email matches your account, a reset code has been sent.' });
                    setTimeout(() => {
                        this.router.navigate(['/reset-password'], { queryParams: { email: this.form.value.email } });
                    }, 2000);
                } else {
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: res.error?.description || 'Failed to send reset code.' });
                }
                this.cdr.markForCheck();
            },
            error: (err: HttpErrorResponse) => {
                this.isSubmitting = false;
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'An error occurred.' });
                this.cdr.markForCheck();
            }
        });
    }
}
