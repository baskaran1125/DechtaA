import { storage } from "../storage";
export class OpsService {
    async getCatalogItems() {
        return await storage.getCatalogItems();
    }
    async createCatalogItem(data) {
        return await storage.createCatalogItem(data);
    }
    async getStats(dateFilter) {
        return await storage.getStats(dateFilter);
    }
}
export const opsService = new OpsService();
