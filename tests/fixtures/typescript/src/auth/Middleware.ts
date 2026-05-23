import { TokenService } from "./TokenService.js";

/**
 * HTTP middleware that extracts a bearer token from the Authorization
 * header, validates it via TokenService, and attaches userId to the
 * request context.
 */
export function authMiddleware(tokens: TokenService) {
  return (req: { headers: Record<string, string>; userId?: string }, next: () => void) => {
    const auth = req.headers["authorization"];
    if (!auth?.startsWith("Bearer ")) {
      throw new Error("Missing or malformed Authorization header");
    }
    const userId = tokens.validate(auth.slice("Bearer ".length));
    req.userId = userId;
    next();
  };
}
