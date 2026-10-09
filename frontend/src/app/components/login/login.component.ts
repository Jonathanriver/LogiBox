import { Component, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { LoginCredentials, User } from '../../models/auth.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private authService = inject(AuthService);

  @Output() loginSuccess = new EventEmitter<User>();

  // Credenciales
  credentials: LoginCredentials = {
    email: '',
    password: '',
    rememberMe: false
  };

  // Estados de interfaz
  showPassword = false;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  // Modales
  showForgotPasswordModal = false;
  forgotEmail = '';
  forgotStatusMessage = '';
  isForgotLoading = false;

  showRequestAccessModal = false;
  accessForm = {
    fullName: '',
    email: '',
    role: 'conductor',
    phone: '',
    comments: ''
  };
  accessStatusMessage = '';
  isAccessLoading = false;

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  fillDemoUser(role: 'conductor' | 'coordinador'): void {
    if (role === 'conductor') {
      this.credentials.email = 'conductor@logibox.com';
      this.credentials.password = 'password123';
    } else {
      this.credentials.email = 'coordinador@logibox.com';
      this.credentials.password = 'admin123';
    }
    this.errorMessage = '';
  }

  onSubmit(): void {
    if (!this.credentials.email.trim() || !this.credentials.password.trim()) {
      this.errorMessage = 'Por favor ingresa tu correo y contraseña.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.login(this.credentials).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success && res.user) {
          this.successMessage = res.message || 'Inicio de sesión exitoso.';
          setTimeout(() => {
            this.loginSuccess.emit(res.user);
          }, 600);
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.status === 0
          ? 'No se pudo conectar con el backend. Verifica que esté iniciado y que MySQL esté configurado en backend/.env.'
          : err.status >= 500
            ? 'El servidor no pudo consultar la base de datos. Revisa la conexión MySQL e inténtalo de nuevo.'
            : err.error?.message || 'Error al iniciar sesión. Intenta de nuevo.';
      }
    });
  }

  // Modal Olvidé Contraseña
  openForgotPassword(): void {
    this.forgotEmail = this.credentials.email;
    this.forgotStatusMessage = '';
    this.showForgotPasswordModal = true;
  }

  closeForgotPassword(): void {
    this.showForgotPasswordModal = false;
    this.forgotStatusMessage = '';
  }

  submitForgotPassword(): void {
    if (!this.forgotEmail.trim()) return;
    this.isForgotLoading = true;
    this.forgotStatusMessage = '';

    this.authService.forgotPassword(this.forgotEmail).subscribe({
      next: (res) => {
        this.isForgotLoading = false;
        this.forgotStatusMessage = res.message + (res.demoPasswordHint ? ` (${res.demoPasswordHint})` : '');
      },
      error: (err) => {
        this.isForgotLoading = false;
        this.forgotStatusMessage = err.error?.message || 'No se pudo procesar la solicitud.';
      }
    });
  }

  // Modal Solicitar Acceso
  openRequestAccess(): void {
    this.accessStatusMessage = '';
    this.showRequestAccessModal = true;
  }

  closeRequestAccess(): void {
    this.showRequestAccessModal = false;
    this.accessStatusMessage = '';
  }

  submitRequestAccess(): void {
    if (!this.accessForm.fullName.trim() || !this.accessForm.email.trim()) {
      this.accessStatusMessage = 'Por favor completa nombre y correo electrónico.';
      return;
    }

    this.isAccessLoading = true;
    this.accessStatusMessage = '';

    this.authService.requestAccess(this.accessForm).subscribe({
      next: (res) => {
        this.isAccessLoading = false;
        this.accessStatusMessage = res.message;
        setTimeout(() => {
          this.closeRequestAccess();
          this.accessForm = { fullName: '', email: '', role: 'conductor', phone: '', comments: '' };
        }, 2200);
      },
      error: (err) => {
        this.isAccessLoading = false;
        this.accessStatusMessage = err.error?.message || 'Error al enviar la solicitud.';
      }
    });
  }
}

