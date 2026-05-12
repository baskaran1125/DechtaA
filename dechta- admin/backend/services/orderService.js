import { storage } from "../storage";
export class OrderService {
    async listForUser(userId, role) {
        if (role === "admin") {
            return [];
        }
        if (role === "buyer") {
            return await storage.getOrdersForBuyer(userId);
        }
        return await storage.getOrdersForVendor(userId);
    }
    async create(buyerId, data) {
        return await storage.createOrder({ ...data, buyerId });
    }
}
export const orderService = new OrderService();
