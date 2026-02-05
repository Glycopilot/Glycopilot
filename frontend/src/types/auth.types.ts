export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  phoneNumber?: string;
  address?: string;
  birthDate?: string;
  diabetesType?: string;
  medicalComment?: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface ApiError {
  message: string;
  status?: number;
  data?: unknown;
}
