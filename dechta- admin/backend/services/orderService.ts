import { storage } from "../storage";
import { type InsertOrder } from "../shared/schema";

export class OrderService {
    async listForUser(userId: number, role: "buyer" | "vendor" | "admin") {
        if (role === "admin") {
            return [];
        }
        if (role === "buyer") {
            return await storage.getOrdersForBuyer(userId);
        }
        return await storage.getOrdersForVendor(userId);
    }

    async create(buyerId: number, data: any) {
        return await storage.createOrder({ ...data, buyerId });
    }
}

export const orderService = new OrderService();
