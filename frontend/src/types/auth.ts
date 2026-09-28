export interface User {
  id: string;
  name: string;
  email: string;
  mfa_enabled: boolean;
  created_at: string;
}

export interface Session {
  user: User;
  token: string;
  device_token?: string;
}

export interface MfaChallenge {
  mfa_required: true;
  challenge: string;
}

export interface TrustedDevice {
  id: string;
  user_agent: string;
  last_used_at: string;
  created_at: string;
}

export interface MfaSetup {
  secret: string;
  otpauth_url: string;
}
