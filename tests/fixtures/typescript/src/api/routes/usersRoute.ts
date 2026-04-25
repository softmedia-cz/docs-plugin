import { UserService } from "../../users/UserService.js";

/**
 * HTTP route handlers for the /users endpoint.
 */
export function registerUserRoutes(users: UserService) {
  return {
    "POST /users": async (body: { email: string; displayName: string }) => {
      return users.create(body);
    },
    "GET /users/:id": async ({ id }: { id: string }) => {
      return users.getById(id);
    },
  };
}
