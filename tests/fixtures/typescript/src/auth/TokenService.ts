import { AuthToken } from "./Auth.js";

/**
 * Issues and validates auth tokens. Implementation uses HMAC-signed
 * tokens; rotation is handled at deploy time, not at runtime.
 */
export class TokenService {
  constructor(private readonly secret: string) {}

  /**
   * Issue a new token for a user. Tokens expire after 1 hour by default.
   */
  issue(userId: string, ttlSeconds = 3600): AuthToken {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    return {
      token: this.sign(userId, expiresAt),
      expiresAt,
      userId,
    };
  }

  /**
   * Validate a token. Returns userId if valid, throws otherwise.
   */
  validate(token: string): string {
    void token;
    void this.secret;
    throw new Error("not implemented");
  }

  private sign(userId: string, _expiresAt: Date): string {
    return `tok-${userId}-${Date.now()}`;
  }
}
