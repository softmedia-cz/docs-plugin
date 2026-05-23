/**
 * Domain model for a customer order.
 */
export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  placedAt: Date;
}

export interface OrderItem {
  sku: string;
  quantity: number;
  unitPrice: number;
}

export type OrderStatus = "pending" | "paid" | "shipped" | "cancelled";
