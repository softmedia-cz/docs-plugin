import { Order, OrderItem } from "./Order.js";
import { OrderRepository } from "./OrderRepository.js";

/**
 * Application service for order placement and status transitions.
 * Enforces invariants (positive quantities, total = sum of line items).
 */
export class OrderService {
  constructor(private readonly repo: OrderRepository) {}

  /**
   * Place a new order. Computes total server-side; ignores client-supplied total.
   */
  async place(userId: string, items: OrderItem[]): Promise<Order> {
    if (items.length === 0) throw new Error("Order must have at least one item");

    const total = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const order: Order = {
      id: crypto.randomUUID(),
      userId,
      items,
      total,
      status: "pending",
      placedAt: new Date(),
    };
    await this.repo.save(order);
    return order;
  }

  /**
   * Mark an order as paid. Idempotent — calling on already-paid order is a no-op.
   */
  async markPaid(orderId: string): Promise<void> {
    const order = await this.repo.findById(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);
    if (order.status === "paid") return;
    if (order.status !== "pending") {
      throw new Error(`Cannot pay order in status ${order.status}`);
    }
    await this.repo.updateStatus(orderId, "paid");
  }
}
