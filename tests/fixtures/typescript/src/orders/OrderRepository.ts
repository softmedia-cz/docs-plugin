import { Order, OrderStatus } from "./Order.js";

/**
 * Persistence interface for orders.
 */
export interface OrderRepository {
  findById(id: string): Promise<Order | null>;
  listByUser(userId: string): Promise<Order[]>;
  save(order: Order): Promise<void>;
  updateStatus(id: string, status: OrderStatus): Promise<void>;
}
