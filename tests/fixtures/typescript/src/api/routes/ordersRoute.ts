import { OrderService } from "../../orders/OrderService.js";
import { OrderItem } from "../../orders/Order.js";

/**
 * HTTP route handlers for /orders endpoints.
 */
export function registerOrderRoutes(orders: OrderService) {
  return {
    "POST /orders": async (body: { userId: string; items: OrderItem[] }) => {
      return orders.place(body.userId, body.items);
    },
    "POST /orders/:id/pay": async ({ id }: { id: string }) => {
      await orders.markPaid(id);
      return { ok: true };
    },
  };
}
