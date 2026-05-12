import { storage } from "../storage";
import { type InsertProduct } from "../shared/schema";
import { z } from "zod";

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

  async listByVendor(vendorId: number) {
    return await storage.getProductsByVendor(vendorId);
  }

  async create(vendorId: number, data: any) {
    const input = {
      ...data,
      price: String(data.price),
    };
    return await storage.createProduct({ ...input, vendorId });
  }

  async approve(id: number) {
    return await storage.approveProduct(id);
  }

  async reject(id: number, reason: string) {
    return await storage.rejectProduct(id, reason);
  }
}

export const productService = new ProductService();
