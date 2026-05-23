import { User } from "./User.js";

/**
 * Persistence interface for users. Concrete implementations live in
 * adapter modules (e.g. PostgresUserRepository).
 */
export interface UserRepository {
  /**
   * Find a user by id. Returns null if no user with that id exists.
   */
  findById(id: string): Promise<User | null>;

  /**
   * Look up a user by email. Email lookup is case-insensitive.
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Persist a new user. Throws if email is already taken.
   */
  save(user: User): Promise<void>;

  /**
   * Soft-delete: marks the user as deleted but preserves the row for audit.
   */
  delete(id: string): Promise<void>;
}
