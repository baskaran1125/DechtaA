import { storage } from "../storage";
export class ProductService {
    async listAll() {
        return await storage.getProducts();
    }
    async listApproved() {
        return await storage.getApprovedProducts();
    }
    async listPending() {
        return await storage.getPendingProducts();
    }
    async listByVendor(vendorId) {
        return await storage.getProductsByVendor(vendorId);
    }
    async create(vendorId, data) {
        const input = {
            ...data,
            price: String(data.price),
        };
        return await storage.createProduct({ ...input, vendorId });
    }
    async approve(id) {
        return await storage.approveProduct(id);
    }
    async reject(id, reason) {
        return await storage.rejectProduct(id, reason);
    }
}
export const productService = new ProductService();
