export interface UserRead {
  id: string;
  email: string;
  display_name: string;
  is_active: boolean;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface AuthResponse {
  user: UserRead;
  tokens: TokenPair;
}

export interface RegisterRequest {
  email: string;
  password: string;
  display_name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ApiErrorBody {
  detail?: string | { msg: string }[];
}
