import { storage } from "../storage";
import { type InsertSupportTicket } from "../shared/schema";

export class SupportService {
    async listAll() {
        return await storage.getSupportTickets();
    }

    async create(data: InsertSupportTicket) {
        return await storage.createSupportTicket(data);
    }

    async updateStatus(id: number, status: string) {
        return await storage.updateTicketStatus(id, status);
    }
}

export const supportService = new SupportService();
