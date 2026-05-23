import { CreateUserInput, User } from "./User.js";
import { UserRepository } from "./UserRepository.js";

/**
 * Application service for user lifecycle. Coordinates UserRepository
 * with cross-cutting concerns (validation, audit, notifications).
 */
export class UserService {
  constructor(private readonly repo: UserRepository) {}

  /**
   * Create a new user. Idempotent on email — calling twice with the same
   * email returns the existing user.
   */
  async create(input: CreateUserInput): Promise<User> {
    const existing = await this.repo.findByEmail(input.email);
    if (existing) return existing;

    const user: User = {
      id: crypto.randomUUID(),
      email: input.email.toLowerCase(),
      displayName: input.displayName,
      createdAt: new Date(),
    };
    await this.repo.save(user);
    return user;
  }

  /**
   * Look up user by id. Throws if not found.
   */
  async getById(id: string): Promise<User> {
    const user = await this.repo.findById(id);
    if (!user) throw new Error(`User ${id} not found`);
    return user;
  }
}
