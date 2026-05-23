/**
 * Domain model representing a user account.
 */
export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
}

/**
 * Input shape for creating a new user.
 */
export interface CreateUserInput {
  email: string;
  displayName: string;
}
