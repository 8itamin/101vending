import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css'
})
export class ResetPasswordComponent {
  resetPasswordForm: FormGroup;
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  resetToken = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.resetPasswordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });

    const token = this.route.snapshot.queryParamMap.get('token');
    this.resetToken.set(token && token.trim() ? token.trim() : null);
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(value => !value);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update(value => !value);
  }

  onSubmit(): void {
    if (!this.resetToken()) {
      this.errorMessage.set('Токен сброса отсутствует. Откройте ссылку из письма.');
      return;
    }

    if (this.resetPasswordForm.invalid) {
      this.markFormGroupTouched(this.resetPasswordForm);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const { password } = this.resetPasswordForm.value;

    this.authService.resetPassword(this.resetToken() as string, password).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage.set(response.message || 'Пароль успешно сброшен');
          setTimeout(() => {
            this.router.navigate(['/auth/login']);
          }, 1500);
        } else {
          this.errorMessage.set(response.message || 'Не удалось сбросить пароль');
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Произошла ошибка. Попробуйте снова.');
        this.isLoading.set(false);
      }
    });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  get password() {
    return this.resetPasswordForm.get('password');
  }

  get confirmPassword() {
    return this.resetPasswordForm.get('confirmPassword');
  }

  get passwordMismatch() {
    return this.resetPasswordForm.errors?.['passwordMismatch'] &&
      this.confirmPassword?.touched;
  }
}
