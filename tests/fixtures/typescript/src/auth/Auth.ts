/**
 * Authentication credentials supplied by the client.
 */
export interface Credentials {
  email: string;
  password: string;
}

/**
 * Issued auth token plus expiration metadata.
 */
export interface AuthToken {
  token: string;
  expiresAt: Date;
  userId: string;
}
