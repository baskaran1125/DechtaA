import { db } from "../db";
import { users, products, orders, catalogItems } from "../shared/schema";
import { eq, and } from "drizzle-orm";


async function seed() {
    console.log("Seeding Database...");

    // Check and create users
    let vendor = await db.select().from(users).where(eq(users.email, "vendor@example.com")).then(r => r[0]);
    if (!vendor) {
        [vendor] = await db.insert(users).values({
            name: "Acme Materials",
            email: "vendor@example.com",
            password: "password123",
            role: "vendor"
        }).returning();
        console.log("Created vendor:", vendor.email);
    } else {
        console.log("Vendor already exists:", vendor.email);
    }

    let buyer = await db.select().from(users).where(eq(users.email, "buyer@example.com")).then(r => r[0]);
    if (!buyer) {
        [buyer] = await db.insert(users).values({
            name: "John Builder",
            email: "buyer@example.com",
            password: "password123",
            role: "buyer"
        }).returning();
        console.log("Created buyer:", buyer.email);
    } else {
        console.log("Buyer already exists:", buyer.email);
    }

    let admin = await db.select().from(users).where(eq(users.email, "admin@example.com")).then(r => r[0]);
    if (!admin) {
        [admin] = await db.insert(users).values({
            name: "Ops Admin",
            email: "admin@example.com",
            password: "password123",
            role: "admin"
        }).returning();
        console.log("Created admin:", admin.email);
    } else {
        console.log("Admin already exists:", admin.email);
    }

    // Check and create catalog items
    let catalogItem1 = await db.select().from(catalogItems).where(eq(catalogItems.name, "Premium Portland Cement")).then(r => r[0]);
    if (!catalogItem1) {
        [catalogItem1] = await db.insert(catalogItems).values({
            name: "Premium Portland Cement",
            category: "Cement",
            description: "High strength Portland cement for structural applications.",
            imageUrl: "https://pixabay.com/get/g7f8994f86db8c8b0c8faf87c41c9f6b8f3d1d889c3ccdd8b4a57e28c35e9b1cb9a8ca7c9c5e65a7c5c0f8e0b8f7b8f7b_640.jpg"
        }).returning();
        console.log("Created catalog item:", catalogItem1.name);
    } else {
        console.log("Catalog item already exists:", catalogItem1.name);
    }

    let catalogItem2 = await db.select().from(catalogItems).where(eq(catalogItems.name, "10mm Rebar bundle")).then(r => r[0]);
    if (!catalogItem2) {
        [catalogItem2] = await db.insert(catalogItems).values({
            name: "10mm Rebar bundle",
            category: "Steel",
            description: "Standard industrial steel rebar bundled by the ton.",
            imageUrl: "https://pixabay.com/get/g8e8a8e8c8d8f8b8c8faf87c41c9f6b8f3d1d889c3ccdd8b4a57e28c35e9b1cb9a8ca7c9c5e65a7c5c0f8e0b8f7b8f7b_640.jpg"
        }).returning();
        console.log("Created catalog item:", catalogItem2.name);
    } else {
        console.log("Catalog item already exists:", catalogItem2.name);
    }

    // Check and create products
    let product1 = await db.select().from(products).where(and(eq(products.vendorId, vendor.id), eq(products.catalogItemId, catalogItem1.id))).then(r => r[0]);
    if (!product1) {
        [product1] = await db.insert(products).values({
            vendorId: vendor.id,
            catalogItemId: catalogItem1.id,
            sellingPrice: "12.50"
        }).returning();
        console.log("Created product for vendor:", catalogItem1.name);
    } else {
        console.log("Product already exists for:", catalogItem1.name);
    }

    let product2 = await db.select().from(products).where(and(eq(products.vendorId, vendor.id), eq(products.catalogItemId, catalogItem2.id))).then(r => r[0]);
    if (!product2) {
        [product2] = await db.insert(products).values({
            vendorId: vendor.id,
            catalogItemId: catalogItem2.id,
            sellingPrice: "450.00"
        }).returning();
        console.log("Created product for vendor:", catalogItem2.name);
    } else {
        console.log("Product already exists for:", catalogItem2.name);
    }

    // Check and create orders
    const existingOrders = await db.select().from(orders).where(eq(orders.buyerId, buyer.id)).limit(1);
    if (existingOrders.length === 0) {
        await db.insert(orders).values({
            buyerId: buyer.id,
            productId: product1.id,
            quantity: 100,
            status: "completed"
        });
        console.log("Created mock order.");
    } else {
        console.log("Orders already exist.");
    }

    console.log("Database seeding completed.");
    process.exit(0);
}

seed().catch(err => {
    console.error("Error seeding database:", err);
    process.exit(1);
});
