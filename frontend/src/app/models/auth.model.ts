export interface User {
  id: number;
  name: string;
  email: string;
  role: 'conductor' | 'coordinador' | string;
  roleLabel: string;
  avatar: string;
  phone?: string;
  vehicle?: string;
  rememberMe?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
  hint?: string;
}

export interface AccessRequest {
  fullName: string;
  email: string;
  role: string;
  phone?: string;
  comments?: string;
}

export interface DemoUser {
  email: string;
  password: string;
  role: string;
  roleLabel: string;
  name: string;
}

