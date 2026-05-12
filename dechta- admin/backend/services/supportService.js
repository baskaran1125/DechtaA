import { storage } from "../storage";
export class SupportService {
    async listAll() {
        return await storage.getSupportTickets();
    }
    async create(data) {
        return await storage.createSupportTicket(data);
    }
    async updateStatus(id, status) {
        return await storage.updateTicketStatus(id, status);
    }
}
export const supportService = new SupportService();
