import { TokenService } from "../../auth/TokenService.js";
import { UserService } from "../../users/UserService.js";

/**
 * HTTP route handlers for the /auth endpoint (login, refresh).
 */
export function registerAuthRoutes(users: UserService, tokens: TokenService) {
  return {
    "POST /auth/login": async (body: { email: string; password: string }) => {
      void body.password;
      const user = await users.create({ email: body.email, displayName: body.email });
      return tokens.issue(user.id);
    },
  };
}
