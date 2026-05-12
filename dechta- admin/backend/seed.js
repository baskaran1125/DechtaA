import { db } from "./backend/db.js";
import { users, products, orders } from "./shared/schema.js";
async function seed() {
    const existingUsers = await db.select().from(users);
    if (existingUsers.length > 0) {
        console.log("Database already seeded");
        return;
    }
    console.log("Seeding database...");
    // Create some users
    const [buyer] = await db.insert(users).values({
        name: "John Buyer",
        email: "buyer@example.com",
        password: "password123", // Simple password for prototype
        role: "buyer"
    }).returning();
    const [vendor] = await db.insert(users).values({
        name: "Bob Builder",
        email: "vendor@example.com",
        password: "password123",
        role: "vendor"
    }).returning();
    // Create some products for the vendor
    const [product1] = await db.insert(products).values({
        vendorId: vendor.id,
        name: "Premium Portland Cement",
        category: "Cement",
        price: "12.50",
        description: "High quality Portland cement for construction and masonry work. 50lb bag.",
        imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&h=400&fit=crop"
    }).returning();
    const [product2] = await db.insert(products).values({
        vendorId: vendor.id,
        name: "Red Clay Bricks",
        category: "Bricks",
        price: "0.85",
        description: "Standard red clay bricks, high durability for wall construction.",
        imageUrl: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=500&h=400&fit=crop"
    }).returning();
    const [product3] = await db.insert(products).values({
        vendorId: vendor.id,
        name: "Treated Pine Lumber 2x4",
        category: "Wood",
        price: "6.25",
        description: "Pressure treated pine lumber, 8ft length. Ideal for framing.",
        imageUrl: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=500&h=400&fit=crop"
    }).returning();
    // Create an order
    await db.insert(orders).values({
        buyerId: buyer.id,
        productId: product1.id,
        quantity: 10,
        status: "pending"
    });
    console.log("Database seeded successfully!");
}
seed().catch(console.error).finally(() => process.exit(0));
