import { api } from "./shared/routes";
import { z } from "zod";
import session from "express-session";
import createMemoryStore from "memorystore";
import multer from "multer";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { authService } from "./services/authService";
import { productService } from "./services/productService";
import { orderService } from "./services/orderService";
import { opsService } from "./services/opsService";
import { driverService } from "./services/driverService";
import { manpowerService } from "./services/manpowerService";
import { clientService } from "./services/clientService";
import { jobService } from "./services/jobService";
import { supportService } from "./services/supportService";
import { chatService } from "./services/chatService";
import { onboardingService } from "./services/onboardingService";
import { pricingService } from "./services/pricingService";
import { manpowerPricingService } from "./services/manpowerPricingService";
import { notificationService } from "./services/notificationService";
import { storage } from "./storage";
import { pool } from "./db";
const upload = multer({ dest: path.join(process.cwd(), "uploads/") });
function getUploadUrl(req, filename) {
    const protocol = req.protocol;
    const backendHost = process.env.BACKEND_HOST || process.env.HOST || "localhost";
    const backendPort = process.env.PORT || "5001";
    return `${protocol}://${backendHost}:${backendPort}/uploads/${filename}`;
}
// WebSocket: tracking clients
const trackingClients = new Set();
function broadcastLocation(data) {
    const message = JSON.stringify({ type: "location_update", data });
    for (const client of trackingClients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    }
}
function broadcastOnboardingRefresh(payload) {
    const message = JSON.stringify({ type: "onboarding_refresh", data: payload });
    for (const client of trackingClients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    }
}
export async function registerRoutes(httpServer, app) {
    const MemoryStore = createMemoryStore(session);
    app.use(session({
        cookie: {
            maxAge: 86400000,
            sameSite: 'lax',
            secure: false,
        },
        store: new MemoryStore({
            checkPeriod: 86400000
        }),
        resave: false,
        saveUninitialized: false,
        secret: process.env.SESSION_SECRET || 'keyboard cat'
    }));
    app.post(api.auth.register.path, async (req, res) => {
        try {
            const input = api.auth.register.input.parse(req.body);
            const registerData = input.role === 'vendor'
                ? { ...input, verificationStatus: 'pending' }
                : input;
            const user = await authService.register(registerData);
            req.session.userId = user.id;
            res.status(201).json(user);
        }
        catch (err) {
            if (err instanceof z.ZodError) {
                return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
            }
            if (err.message === "Email already exists") {
                return res.status(400).json({ message: err.message });
            }
            res.status(500).json({ message: "Internal server error" });
        }
    });
    app.post(api.auth.login.path, async (req, res) => {
        try {
            const input = api.auth.login.input.parse(req.body);
            const user = await authService.login(input.email, input.password);
            req.session.userId = user.id;
            res.status(200).json(user);
        }
        catch (err) {
            if (err instanceof z.ZodError) {
                return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
            }
            if (err.message === "Invalid email or password") {
                return res.status(401).json({ message: err.message });
            }
            res.status(500).json({ message: "Internal server error" });
        }
    });
    app.post(api.auth.logout.path, (req, res) => {
        req.session.destroy(() => {
            res.status(200).json({ message: "Logged out" });
        });
    });
    app.get(api.auth.me.path, async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            res.status(200).json(user);
        }
        catch (err) {
            res.status(401).json({ message: "Not logged in" });
        }
    });
    app.get(api.products.list.path, async (req, res) => {
        const products = await productService.listApproved();
        res.status(200).json(products);
    });
    app.get(api.products.vendorList.path, async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "vendor")
                return res.status(401).json({ message: "Not a vendor" });
            const products = await productService.listByVendor(userId);
            res.status(200).json(products);
        }
        catch (err) {
            res.status(500).json({ message: "Internal server error" });
        }
    });
    app.post(api.products.create.path, async (req, res) => {
        try {
            const userId = req.session.userId;
            if (!userId)
                return res.status(401).json({ message: "Not logged in" });
            const user = await authService.getMe(userId);
            if (user.role !== "vendor")
                return res.status(401).json({ message: "Not a vendor" });
            if (user.verificationStatus !== "verified")
                return res.status(403).json({ message: "Your account is pending verification. You cannot add products until verified." });
            const input = api.products.create.input.parse(req.body);
            const product = await productService.create(userId, input);
            res.status(201).json(product);
        }
        catch (err) {
            if (err instanceof z.ZodError) {
                return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
            }
            res.status(500).json({ message: "Internal server error" });
        }
    });
    app.get(api.ops.stats.path, async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            // Parse date filter from query params
            const startDate = req.query.startDate ? new Date(req.query.startDate) : undefined;
            const endDate = req.query.endDate ? new Date(req.query.endDate) : undefined;
            const dateFilter = (startDate || endDate) ? { startDate, endDate } : undefined;
            const stats = await opsService.getStats(dateFilter);
            res.status(200).json(stats);
        }
        catch (err) {
            res.status(500).json({ message: "Internal server error" });
        }
    });
    app.get(api.ops.catalog.path, async (req, res) => {
        try {
            const catalog = await opsService.getCatalogItems();
            res.status(200).json(catalog);
        }
        catch (err) {
            res.status(500).json({ message: "Internal server error" });
        }
    });
    app.post(api.ops.createCatalogItem.path, async (req, res) => {
        try {
            const userId = req.session.userId;
            if (!userId)
                return res.status(401).json({ message: "Not logged in" });
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const input = api.ops.createCatalogItem.input.parse(req.body);
            const item = await opsService.createCatalogItem(input);
            res.status(201).json(item);
        }
        catch (err) {
            if (err instanceof z.ZodError) {
                return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
            }
            res.status(500).json({ message: "Internal server error" });
        }
    });
    app.post("/api/ops/upload", upload.single("image"), async (req, res) => {
        try {
            const userId = req.session.userId;
            if (!userId)
                return res.status(401).json({ message: "Not logged in" });
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            if (!req.file) {
                return res.status(400).json({ message: "No image file provided" });
            }
            const imageUrl = getUploadUrl(req, req.file.filename);
            res.status(201).json({ imageUrl });
        }
        catch (err) {
            res.status(500).json({ message: "Internal server error" });
        }
    });
    // Generic document/file upload (for onboarding forms)
    app.post("/api/ops/upload-doc", upload.single("file"), async (req, res) => {
        try {
            const userId = req.session.userId;
            if (!userId)
                return res.status(401).json({ message: "Not logged in" });
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            if (!req.file) {
                return res.status(400).json({ message: "No file provided" });
            }
            const url = getUploadUrl(req, req.file.filename);
            res.status(201).json({ url });
        }
        catch (err) {
            res.status(500).json({ message: "Internal server error" });
        }
    });
    // Product approval routes
    app.get(api.ops.pendingProducts.path, async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const products = await productService.listPending();
            res.status(200).json(products);
        }
        catch (err) {
            res.status(500).json({ message: "Internal server error" });
        }
    });
    app.get(api.ops.allProducts.path, async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const products = await productService.listAll();
            res.status(200).json(products);
        }
        catch (err) {
            res.status(500).json({ message: "Internal server error" });
        }
    });
    app.patch("/api/ops/products/:id/approve", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const product = await productService.approve(parseInt(req.params.id));
            res.status(200).json(product);
        }
        catch (err) {
            console.error('[APPROVE PRODUCT ERROR]', err);
            res.status(500).json({ message: "Internal server error", error: err.message });
        }
    });
    app.patch("/api/ops/products/:id/reject", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const { reason } = api.ops.rejectProduct.input.parse(req.body);
            const product = await productService.reject(parseInt(req.params.id), reason);
            res.status(200).json(product);
        }
        catch (err) {
            console.error('[REJECT PRODUCT ERROR]', err);
            if (err instanceof z.ZodError) {
                return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
            }
            res.status(500).json({ message: "Internal server error", error: err.message });
        }
    });
    app.get(api.orders.list.path, async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            const orders = await orderService.listForUser(userId, user.role);
            return res.status(200).json(orders);
        }
        catch (err) {
            res.status(500).json({ message: "Internal server error" });
        }
    });
    app.post(api.orders.create.path, async (req, res) => {
        try {
            const userId = req.session.userId;
            if (!userId)
                return res.status(401).json({ message: "Not logged in" });
            const user = await authService.getMe(userId);
            if (user.role !== "buyer")
                return res.status(401).json({ message: "Only buyers can create orders" });
            const input = api.orders.create.input.parse(req.body);
            const order = await orderService.create(userId, input);
            res.status(201).json(order);
        }
        catch (err) {
            if (err instanceof z.ZodError) {
                return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
            }
            res.status(500).json({ message: "Internal server error" });
        }
    });
    // Drivers routes
    app.get("/api/ops/drivers", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const drivers = await driverService.listAll();
            res.status(200).json(drivers);
        }
        catch (err) {
            res.status(500).json({ message: "Internal server error" });
        }
    });
    app.post("/api/ops/drivers", async (req, res) => {
        try {
            const userId = req.session.userId;
            if (!userId)
                return res.status(401).json({ message: "Not logged in" });
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const driver = await driverService.create(req.body);
            res.status(201).json(driver);
        }
        catch (err) {
            res.status(500).json({ message: err.message || "Internal server error" });
        }
    });
    app.patch("/api/ops/drivers/:id/status", async (req, res) => {
        try {
            const userId = req.session.userId;
            if (!userId)
                return res.status(401).json({ message: "Not logged in" });
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const id = parseInt(req.params.id, 10);
            const status = String(req.body?.status || "").toLowerCase();
            try {
                const driver = await driverService.updateStatus(id, status);
                return res.status(200).json(driver);
            }
            catch {
                await pool.query(`ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE`).catch(() => ({ rows: [] }));
                const approvedStatuses = ["verified", "approve", "approved", "active"];
                const rejectedStatuses = ["rejected", "reject", "suspended", "inactive", "banned"];
                if (approvedStatuses.includes(status)) {
                    await pool.query(`
              UPDATE users u
              SET is_approved = true,
                  status = 'active'
              FROM driver_profiles dp
              WHERE dp.id = $1 AND dp.user_id = u.id
            `, [id]).catch(() => ({ rows: [] }));
                    await pool.query(`UPDATE driver_profiles SET is_approved = true WHERE id = $1`, [id]).catch(() => ({ rows: [] }));
                }
                else if (rejectedStatuses.includes(status)) {
                    const userStatus = status === "inactive" ? "inactive" : "suspended";
                    await pool.query(`
              UPDATE users u
              SET is_approved = false,
                  status = $2
              FROM driver_profiles dp
              WHERE dp.id = $1 AND dp.user_id = u.id
            `, [id, userStatus]).catch(() => ({ rows: [] }));
                    await pool.query(`UPDATE driver_profiles SET is_approved = false WHERE id = $1`, [id]).catch(() => ({ rows: [] }));
                }
                const refreshed = await driverService.listAll().catch(() => []);
                const driver = (refreshed || []).find((d) => Number(d?.id) === Number(id)) || { id, status };
                return res.status(200).json(driver);
            }
        }
        catch (err) {
            res.status(500).json({ message: err.message || "Internal server error" });
        }
    });
    // Manpower routes
    app.get("/api/ops/manpower", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            // Parse date filter from query params
            const startDate = req.query.startDate ? new Date(req.query.startDate) : undefined;
            const endDate = req.query.endDate ? new Date(req.query.endDate) : undefined;
            const dateFilter = (startDate || endDate) ? { startDate, endDate } : undefined;
            const workers = await manpowerService.listAll(dateFilter);
            res.status(200).json(workers);
        }
        catch (err) {
            res.status(500).json({ message: err.message || "Internal server error" });
        }
    });
    app.post("/api/ops/manpower", async (req, res) => {
        try {
            const userId = req.session.userId;
            if (!userId)
                return res.status(401).json({ message: "Not logged in" });
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const worker = await manpowerService.create(req.body);
            res.status(201).json(worker);
        }
        catch (err) {
            res.status(500).json({ message: err.message || "Internal server error" });
        }
    });
    app.patch("/api/ops/manpower/:id/status", async (req, res) => {
        try {
            const userId = req.session.userId;
            if (!userId)
                return res.status(401).json({ message: "Not logged in" });
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const { status } = req.body;
            const worker = await manpowerService.updateStatus(req.params.id, status);
            res.status(200).json(worker);
        }
        catch (err) {
            res.status(500).json({ message: err.message || "Internal server error" });
        }
    });
    // Clients routes
    app.get("/api/ops/clients", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            // Parse date filter from query params
            const startDate = req.query.startDate ? new Date(req.query.startDate) : undefined;
            const endDate = req.query.endDate ? new Date(req.query.endDate) : undefined;
            const dateFilter = (startDate || endDate) ? { startDate, endDate } : undefined;
            const clients = await clientService.listAll(dateFilter);
            res.status(200).json(clients);
        }
        catch (err) {
            res.status(500).json({ message: err.message || "Internal server error" });
        }
    });
    app.post("/api/ops/clients", async (req, res) => {
        try {
            const userId = req.session.userId;
            if (!userId)
                return res.status(401).json({ message: "Not logged in" });
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const client = await clientService.create(req.body);
            res.status(201).json(client);
        }
        catch (err) {
            res.status(500).json({ message: err.message || "Internal server error" });
        }
    });
    // Jobs routes
    app.get("/api/ops/jobs", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            // Parse date filter from query params
            const startDate = req.query.startDate ? new Date(req.query.startDate) : undefined;
            const endDate = req.query.endDate ? new Date(req.query.endDate) : undefined;
            const dateFilter = (startDate || endDate) ? { startDate, endDate } : undefined;
            const jobs = await jobService.listAll(dateFilter);
            res.status(200).json(jobs);
        }
        catch (err) {
            res.status(500).json({ message: "Internal server error" });
        }
    });
    // Orders (Product Jobs) routes for Ops
    app.get("/api/ops/orders", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const orders = await storage.getOpsOrders();
            res.status(200).json(orders);
        }
        catch (err) {
            res.status(500).json({ message: "Internal server error" });
        }
    });
    app.patch("/api/ops/orders/:id/status", async (req, res) => {
        try {
            const userId = req.session.userId;
            if (!userId)
                return res.status(401).json({ message: "Not logged in" });
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const { status } = req.body;
            const order = await storage.updateOrderStatus(parseInt(req.params.id), status);
            res.status(200).json(order);
        }
        catch (err) {
            res.status(500).json({ message: err.message || "Internal server error" });
        }
    });
    app.patch("/api/ops/orders/:id/assign-driver", async (req, res) => {
        try {
            const userId = req.session.userId;
            if (!userId)
                return res.status(401).json({ message: "Not logged in" });
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const { driverId } = req.body;
            const order = await storage.assignOrderDriver(parseInt(req.params.id), driverId);
            res.status(200).json(order);
        }
        catch (err) {
            res.status(500).json({ message: err.message || "Internal server error" });
        }
    });
    app.post("/api/ops/jobs", async (req, res) => {
        try {
            const userId = req.session.userId;
            if (!userId)
                return res.status(401).json({ message: "Not logged in" });
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const job = await jobService.create(req.body);
            res.status(201).json(job);
        }
        catch (err) {
            res.status(500).json({ message: err.message || "Internal server error" });
        }
    });
    app.patch("/api/ops/jobs/:id/status", async (req, res) => {
        try {
            const userId = req.session.userId;
            if (!userId)
                return res.status(401).json({ message: "Not logged in" });
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const { status } = req.body;
            const job = await jobService.updateStatus(parseInt(req.params.id), status);
            res.status(200).json(job);
        }
        catch (err) {
            res.status(500).json({ message: err.message || "Internal server error" });
        }
    });
    app.patch("/api/ops/jobs/:id/assign-driver", async (req, res) => {
        try {
            const userId = req.session.userId;
            if (!userId)
                return res.status(401).json({ message: "Not logged in" });
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const { driverId } = req.body;
            const job = await jobService.assignDriver(parseInt(req.params.id), driverId);
            res.status(200).json(job);
        }
        catch (err) {
            res.status(500).json({ message: err.message || "Internal server error" });
        }
    });
    app.patch("/api/ops/jobs/:id/assign-worker", async (req, res) => {
        try {
            const userId = req.session.userId;
            if (!userId)
                return res.status(401).json({ message: "Not logged in" });
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const { workerId } = req.body;
            const job = await jobService.assignWorker(parseInt(req.params.id), workerId);
            res.status(200).json(job);
        }
        catch (err) {
            res.status(500).json({ message: err.message || "Internal server error" });
        }
    });
    // Support routes
    app.get("/api/ops/support", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const tickets = await supportService.listAll();
            res.status(200).json(tickets);
        }
        catch (err) {
            res.status(500).json({ message: "Internal server error" });
        }
    });
    app.post("/api/ops/support", async (req, res) => {
        try {
            const userId = req.session.userId;
            if (!userId)
                return res.status(401).json({ message: "Not logged in" });
            const ticket = await supportService.create({ ...req.body, userId });
            // Auto-create conversation for the support ticket
            const conversation = await storage.findOrCreateConversation("user", String(userId), "user", "0", // Admin/support user
            {
                title: `Support: ${ticket.subject}`,
                conversationType: "support",
                supportTicketId: ticket.id,
            });
            // Send initial system message
            await storage.createMessage({
                conversationId: conversation.id,
                senderType: "user",
                senderId: "0",
                content: `Support ticket created: ${ticket.subject}\n\n${ticket.description}`,
                messageType: "system",
            });
            res.status(201).json({ ticket, conversation });
        }
        catch (err) {
            res.status(500).json({ message: err.message || "Internal server error" });
        }
    });
    app.patch("/api/ops/support/:id/status", async (req, res) => {
        try {
            const userId = req.session.userId;
            if (!userId)
                return res.status(401).json({ message: "Not logged in" });
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const { status } = req.body;
            const ticket = await supportService.updateStatus(parseInt(req.params.id), status);
            res.status(200).json(ticket);
        }
        catch (err) {
            res.status(500).json({ message: err.message || "Internal server error" });
        }
    });
    // Admin: Get all support conversations (for live chat panel)
    app.get("/api/ops/support/conversations", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(403).json({ message: "Not an admin" });
            const convos = await storage.getSupportConversations();
            const enriched = await chatService.enrichConversations(convos, "user", "0");
            res.status(200).json(enriched);
        }
        catch (err) {
            console.error("[Support Conversations]", err);
            res.status(500).json({ message: err.message || "Internal server error" });
        }
    });
    // Admin: Start a new direct support chat with any entity
    app.post("/api/ops/support/conversations/start", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(403).json({ message: "Not an admin" });
            const { withEntityType, withEntityId, subject } = req.body;
            if (!withEntityType || !withEntityId) {
                return res.status(400).json({ message: "withEntityType and withEntityId are required" });
            }
            const convo = await storage.findOrCreateConversation("user", "0", withEntityType, String(withEntityId), { title: subject || `Chat with ${withEntityType}`, conversationType: "support" });
            res.status(200).json(convo);
        }
        catch (err) {
            res.status(500).json({ message: err.message || "Internal server error" });
        }
    });
    // ═══════════════════════════════════════════════
    // CHAT REST API
    // ═══════════════════════════════════════════════
    // Get user's conversations
    app.get("/api/chat/conversations", async (req, res) => {
        try {
            const userId = req.session.userId;
            if (!userId)
                return res.status(401).json({ message: "Not logged in" });
            const user = await authService.getMe(userId);
            const entityType = "user";
            const entityId = String(userId);
            const conversations = await storage.getConversations(entityType, entityId);
            const enriched = await chatService.enrichConversations(conversations, entityType, entityId);
            res.status(200).json(enriched);
        }
        catch (err) {
            console.error("Get conversations error:", err);
            res.status(500).json({ message: err.message || "Internal server error" });
        }
    });
    // Get conversation by ID
    app.get("/api/chat/conversations/:id", async (req, res) => {
        try {
            const userId = req.session.userId;
            if (!userId)
                return res.status(401).json({ message: "Not logged in" });
            const conversationId = parseInt(req.params.id);
            const conversation = await storage.getConversation(conversationId);
            if (!conversation) {
                return res.status(404).json({ message: "Conversation not found" });
            }
            // Verify user is participant
            const userIdStr = String(userId);
            const isParticipant = (conversation.participant1Type === "user" && conversation.participant1Id === userIdStr) ||
                (conversation.participant2Type === "user" && conversation.participant2Id === userIdStr);
            if (!isParticipant) {
                return res.status(403).json({ message: "Not authorized" });
            }
            res.status(200).json(conversation);
        }
        catch (err) {
            console.error("Get conversation error:", err);
            res.status(500).json({ message: err.message || "Internal server error" });
        }
    });
    // Get messages for conversation
    app.get("/api/chat/conversations/:id/messages", async (req, res) => {
        try {
            const userId = req.session.userId;
            if (!userId)
                return res.status(401).json({ message: "Not logged in" });
            const conversationId = parseInt(req.params.id);
            const limit = parseInt(req.query.limit) || 50;
            const before = req.query.before ? parseInt(req.query.before) : undefined;
            // Verify user is participant
            const conversation = await storage.getConversation(conversationId);
            if (!conversation) {
                return res.status(404).json({ message: "Conversation not found" });
            }
            const userIdStr = String(userId);
            const user = await authService.getMe(userId);
            const isParticipant = (conversation.participant1Type === "user" && conversation.participant1Id === userIdStr) ||
                (conversation.participant2Type === "user" && conversation.participant2Id === userIdStr);
            if (!isParticipant && user.role !== "admin") {
                return res.status(403).json({ message: "Not authorized" });
            }
            const messages = await storage.getMessages(conversationId, limit, before);
            const enriched = await chatService.enrichMessages(messages);
            res.status(200).json(enriched);
        }
        catch (err) {
            console.error("Get messages error:", err);
            res.status(500).json({ message: err.message || "Internal server error" });
        }
    });
    // Create or get conversation
    app.post("/api/chat/conversations", async (req, res) => {
        try {
            const userId = req.session.userId;
            if (!userId)
                return res.status(401).json({ message: "Not logged in" });
            const { withEntityType, withEntityId, title, conversationType, supportTicketId } = req.body;
            if (!withEntityType || !withEntityId) {
                return res.status(400).json({ message: "Missing required fields" });
            }
            const conversation = await storage.findOrCreateConversation("user", String(userId), withEntityType, String(withEntityId), { title, conversationType, supportTicketId });
            res.status(200).json(conversation);
        }
        catch (err) {
            console.error("Create conversation error:", err);
            res.status(500).json({ message: err.message || "Internal server error" });
        }
    });
    // Send message (REST fallback if WebSocket not available)
    app.post("/api/chat/conversations/:id/messages", async (req, res) => {
        try {
            const userId = req.session.userId;
            if (!userId)
                return res.status(401).json({ message: "Not logged in" });
            const conversationId = parseInt(req.params.id);
            const { content, messageType } = req.body;
            if (!content) {
                return res.status(400).json({ message: "Content is required" });
            }
            // Verify user is participant
            const conversation = await storage.getConversation(conversationId);
            if (!conversation) {
                return res.status(404).json({ message: "Conversation not found" });
            }
            const userIdStr = String(userId);
            const isParticipant = (conversation.participant1Type === "user" && conversation.participant1Id === userIdStr) ||
                (conversation.participant2Type === "user" && conversation.participant2Id === userIdStr);
            if (!isParticipant) {
                return res.status(403).json({ message: "Not authorized" });
            }
            const message = await storage.createMessage({
                conversationId,
                senderType: "user",
                senderId: userIdStr,
                content,
                messageType: messageType || "text",
            });
            const enriched = await chatService.enrichMessages([message]);
            // Broadcast via WebSocket if recipient is online (using the broadcastToConversation function)
            // Note: broadcastToConversation is defined in the WebSocket section
            // We'll just skip this for now in REST as it's a fallback
            res.status(201).json(enriched[0]);
        }
        catch (err) {
            console.error("Send message error:", err);
            res.status(500).json({ message: err.message || "Internal server error" });
        }
    });
    // Mark conversation as read
    app.post("/api/chat/conversations/:id/read", async (req, res) => {
        try {
            const userId = req.session.userId;
            if (!userId)
                return res.status(401).json({ message: "Not logged in" });
            const conversationId = parseInt(req.params.id);
            await storage.markConversationAsRead(conversationId, "user", String(userId));
            // Broadcast read receipt (using the broadcastToConversation function if available)
            // Note: broadcastToConversation is defined in the WebSocket section
            // We'll just skip this for now in REST as it's a fallback
            res.status(200).json({ success: true });
        }
        catch (err) {
            console.error("Mark read error:", err);
            res.status(500).json({ message: err.message || "Internal server error" });
        }
    });
    // ═══════════════════════════════════════════════
    // ONBOARDING ROUTES - Vendor & Manpower Verification
    // ═══════════════════════════════════════════════
    // Create vendor (admin onboarding)
    app.post(api.ops.createVendor.path, async (req, res) => {
        try {
            const userId = req.session.userId;
            if (!userId)
                return res.status(401).json({ message: "Not logged in" });
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const input = api.ops.createVendor.input.parse(req.body);
            // Convert null values to undefined for TS compatibility
            const sanitized = Object.fromEntries(Object.entries(input).map(([k, v]) => [k, v === null ? undefined : v]));
            const vendor = await onboardingService.createVendor(sanitized);
            res.status(201).json(vendor);
        }
        catch (err) {
            if (err instanceof z.ZodError) {
                return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
            }
            if (err.message === "Email already exists") {
                return res.status(400).json({ message: err.message });
            }
            res.status(500).json({ message: "Internal server error" });
        }
    });
    // Vendor onboarding
    app.get(api.ops.pendingVendors.path, async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const vendors = await onboardingService.getPendingVendors();
            res.status(200).json(vendors);
        }
        catch (err) {
            res.status(500).json({ message: "Internal server error" });
        }
    });
    app.get(api.ops.allVendors.path, async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const vendors = await onboardingService.getAllVendors();
            res.status(200).json(vendors);
        }
        catch (err) {
            res.status(500).json({ message: "Internal server error" });
        }
    });
    app.get("/api/ops/onboarding/vendors/:id/documents", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const docs = await onboardingService.getVendorDocuments(parseInt(req.params.id));
            res.status(200).json(docs || {});
        }
        catch (err) {
            res.status(500).json({ message: "Internal server error" });
        }
    });
    app.patch("/api/ops/onboarding/vendors/:id/verify", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const vendor = await onboardingService.verifyVendor(parseInt(req.params.id));
            broadcastOnboardingRefresh({ entity: "vendor", action: "verified", id: parseInt(req.params.id, 10) });
            res.status(200).json(vendor);
        }
        catch (err) {
            res.status(500).json({ message: "Internal server error" });
        }
    });
    app.patch("/api/ops/onboarding/vendors/:id/reject", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const { reason } = api.ops.rejectVendor.input.parse(req.body);
            const vendor = await onboardingService.rejectVendor(parseInt(req.params.id), reason);
            broadcastOnboardingRefresh({ entity: "vendor", action: "rejected", id: parseInt(req.params.id, 10) });
            res.status(200).json(vendor);
        }
        catch (err) {
            if (err instanceof z.ZodError) {
                return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
            }
            res.status(500).json({ message: "Internal server error" });
        }
    });
    // Manpower onboarding
    app.get(api.ops.pendingManpower.path, async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const workers = await onboardingService.getPendingManpower();
            res.status(200).json(workers);
        }
        catch (err) {
            res.status(500).json({ message: "Internal server error" });
        }
    });
    app.get(api.ops.allManpower.path, async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const workers = await onboardingService.getAllManpower();
            res.status(200).json(workers);
        }
        catch (err) {
            res.status(500).json({ message: "Internal server error" });
        }
    });
    app.get("/api/ops/onboarding/manpower/:id/documents", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const docs = await onboardingService.getManpowerDocuments(req.params.id);
            res.status(200).json(docs || {});
        }
        catch (err) {
            res.status(500).json({ message: "Internal server error" });
        }
    });
    app.patch("/api/ops/onboarding/manpower/:id/verify", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const worker = await onboardingService.verifyManpowerWorker(req.params.id);
            broadcastOnboardingRefresh({ entity: "manpower", action: "verified", id: Number(req.params.id) });
            res.status(200).json(worker);
        }
        catch (err) {
            res.status(500).json({ message: "Internal server error" });
        }
    });
    app.patch("/api/ops/onboarding/manpower/:id/reject", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const { reason } = api.ops.rejectManpower.input.parse(req.body);
            const worker = await onboardingService.rejectManpowerWorker(req.params.id, reason);
            broadcastOnboardingRefresh({ entity: "manpower", action: "rejected", id: Number(req.params.id) });
            res.status(200).json(worker);
        }
        catch (err) {
            if (err instanceof z.ZodError) {
                return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
            }
            res.status(500).json({ message: "Internal server error" });
        }
    });
    // Driver onboarding
    app.get("/api/ops/onboarding/drivers", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const drivers = await onboardingService.getPendingDrivers();
            res.status(200).json(drivers);
        }
        catch (err) {
            res.status(500).json({ message: "Internal server error" });
        }
    });
    app.get("/api/ops/onboarding/drivers/all", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const drivers = await onboardingService.getAllDrivers();
            res.status(200).json(drivers);
        }
        catch (err) {
            res.status(500).json({ message: "Internal server error" });
        }
    });
    app.get("/api/ops/onboarding/drivers/:id/details", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const details = await onboardingService.getDriverOnboardingDetails(parseInt(req.params.id, 10));
            res.status(200).json(details || {});
        }
        catch (err) {
            res.status(500).json({ message: "Internal server error" });
        }
    });
    app.get("/api/ops/onboarding/drivers/:id/documents", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const docs = await onboardingService.getDriverDocuments(parseInt(req.params.id, 10));
            res.status(200).json(docs || {});
        }
        catch (err) {
            res.status(500).json({ message: "Internal server error" });
        }
    });
    app.patch("/api/ops/onboarding/drivers/:id/verify", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const driver = await onboardingService.verifyDriver(parseInt(req.params.id, 10));
            broadcastOnboardingRefresh({ entity: "driver", action: "verified", id: parseInt(req.params.id, 10) });
            res.status(200).json(driver);
        }
        catch (err) {
            res.status(500).json({ message: "Internal server error" });
        }
    });
    app.patch("/api/ops/onboarding/drivers/:id/reject", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const reason = String(req.body?.reason || "").trim();
            if (!reason) {
                return res.status(400).json({ message: "reason is required" });
            }
            const driver = await onboardingService.rejectDriver(parseInt(req.params.id, 10), reason);
            broadcastOnboardingRefresh({ entity: "driver", action: "rejected", id: parseInt(req.params.id, 10) });
            res.status(200).json(driver);
        }
        catch (err) {
            res.status(500).json({ message: "Internal server error" });
        }
    });
    // ═══════════════════════════════════════════════
    // COMMISSION SETTINGS ROUTES
    // ═══════════════════════════════════════════════
    // Get global commission rates
    app.get("/api/ops/settings/commission", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const vendorCommission = (await storage.getSetting("vendor_commission_rate")) || "0";
            const manpowerCommission = (await storage.getSetting("manpower_commission_rate")) || "0";
            const driverCommission = (await storage.getSetting("driver_commission_rate")) || "0";
            res.json({ vendorCommission, manpowerCommission, driverCommission });
        }
        catch {
            res.status(500).json({ message: "Internal server error" });
        }
    });
    // Update global commission rates
    app.put("/api/ops/settings/commission", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const { vendorCommission, manpowerCommission, driverCommission } = api.ops.updateCommissionSettings.input.parse(req.body);
            const vc = parseFloat(vendorCommission);
            const mc = parseFloat(manpowerCommission);
            const dc = parseFloat(driverCommission);
            if (vc < 0 || vc > 100 || mc < 0 || mc > 100 || dc < 0 || dc > 100)
                return res.status(400).json({ message: "Commission rate must be between 0 and 100" });
            await storage.upsertSetting("vendor_commission_rate", vendorCommission);
            await storage.upsertSetting("manpower_commission_rate", manpowerCommission);
            await storage.upsertSetting("driver_commission_rate", driverCommission);
            res.json({ vendorCommission, manpowerCommission, driverCommission });
        }
        catch (err) {
            if (err instanceof z.ZodError) {
                return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
            }
            res.status(500).json({ message: "Internal server error" });
        }
    });
    // ═══════════════════════════════════════════════
    // BANNER MANAGEMENT ROUTES
    // ═══════════════════════════════════════════════
    // Public: get active banners (for buyer app)
    app.get(api.ops.activeBanners.path, async (req, res) => {
        try {
            const page = typeof req.query.page === 'string' ? req.query.page : undefined;
            const activeBanners = await storage.getActiveBanners(page);
            res.status(200).json(activeBanners);
        }
        catch (err) {
            res.status(500).json({ message: "Internal server error" });
        }
    });
    // Admin: list all banners
    app.get(api.ops.listBanners.path, async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const allBanners = await storage.getBanners();
            res.status(200).json(allBanners);
        }
        catch (err) {
            res.status(500).json({ message: "Internal server error" });
        }
    });
    // Admin: create banner
    app.post(api.ops.createBanner.path, async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const input = api.ops.createBanner.input.parse(req.body);
            const bannerData = { ...input };
            const targetPages = Array.isArray(input.targetPages)
                ? input.targetPages
                : typeof input.targetPages === "string"
                    ? [input.targetPages]
                    : [];
            // Ensure targetPages is always a string (required by DB)
            bannerData.targetPages = targetPages.length ? targetPages.join(',') : 'all';
            if (input.startDate)
                bannerData.startDate = new Date(input.startDate);
            if (input.endDate)
                bannerData.endDate = new Date(input.endDate);
            console.log('Creating banner with data:', JSON.stringify(bannerData, null, 2));
            const banner = await storage.createBanner(bannerData);
            res.status(201).json(banner);
        }
        catch (err) {
            if (err instanceof z.ZodError) {
                return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
            }
            console.error('Create banner error:', err?.message || err);
            console.error('Full error:', err);
            res.status(500).json({ message: err?.message || "Failed to create banner" });
        }
    });
    // Admin: update banner
    app.patch("/api/ops/banners/:id", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const input = api.ops.updateBanner.input.parse(req.body);
            const updateData = { ...input };
            const targetPages = Array.isArray(input.targetPages)
                ? input.targetPages
                : typeof input.targetPages === "string"
                    ? [input.targetPages]
                    : [];
            if (targetPages.length)
                updateData.targetPages = targetPages.join(',');
            if (input.startDate)
                updateData.startDate = new Date(input.startDate);
            if (input.endDate)
                updateData.endDate = new Date(input.endDate);
            const banner = await storage.updateBanner(parseInt(req.params.id), updateData);
            res.status(200).json(banner);
        }
        catch (err) {
            if (err instanceof z.ZodError) {
                return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
            }
            console.error('Update banner error:', err);
            res.status(500).json({ message: err?.message || "Failed to update banner" });
        }
    });
    // Admin: delete banner
    app.delete("/api/ops/banners/:id", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            await storage.deleteBanner(parseInt(req.params.id));
            res.status(200).json({ message: "Banner deleted" });
        }
        catch (err) {
            console.error('Delete banner error:', err);
            res.status(500).json({ message: err?.message || "Failed to delete banner" });
        }
    });
    // Vendor document upload (vendor self-serve)
    app.post("/api/vendor/documents", upload.single("document"), async (req, res) => {
        try {
            const userId = req.session.userId;
            if (!userId)
                return res.status(401).json({ message: "Not logged in" });
            const user = await authService.getMe(userId);
            if (user.role !== "vendor")
                return res.status(401).json({ message: "Not a vendor" });
            if (!req.file)
                return res.status(400).json({ message: "No document file provided" });
            const documentUrl = getUploadUrl(req, req.file.filename);
            const { docType } = req.body;
            const docUpdate = {};
            if (docType === 'gst')
                docUpdate.gstUrl = documentUrl;
            else if (docType === 'pan')
                docUpdate.panUrl = documentUrl;
            else if (docType === 'aadhar')
                docUpdate.aadharUrl = documentUrl;
            else if (docType === 'business_license')
                docUpdate.businessLicenseUrl = documentUrl;
            else
                return res.status(400).json({ message: "Invalid document type" });
            const { storage } = await import("./storage");
            const profileRes = await pool.query(`SELECT id
           FROM vendor_profiles
          WHERE user_id = $1
          LIMIT 1`, [userId]).catch(() => ({ rows: [] }));
            const vendorProfileId = Number(profileRes.rows?.[0]?.id || 0);
            if (!vendorProfileId) {
                return res.status(404).json({ message: "Vendor profile not found for this user" });
            }
            const docs = await storage.upsertVendorDocuments(vendorProfileId, docUpdate);
            res.status(201).json(docs);
        }
        catch (err) {
            res.status(500).json({ message: "Internal server error" });
        }
    });
    // ═══════════════════════════════════════════════
    // ANALYTICS ROUTES
    // ═══════════════════════════════════════════════
    app.get("/api/ops/analytics", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const analytics = await storage.getAnalytics();
            res.status(200).json(analytics);
        }
        catch (err) {
            console.error("Analytics error:", err);
            res.status(500).json({ message: "Internal server error" });
        }
    });
    // ═══════════════════════════════════════════════
    // GPS LOCATION TRACKING ROUTES
    // ═══════════════════════════════════════════════
    // Get all latest locations (admin)
    app.get("/api/ops/locations", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const locations = await storage.getLatestLocations();
            res.status(200).json(locations);
        }
        catch (err) {
            res.status(500).json({ message: "Internal server error" });
        }
    });
    // Update driver location (+ broadcast via WebSocket)
    app.post("/api/drivers/:id/location", async (req, res) => {
        try {
            const { latitude, longitude, heading, speed } = req.body;
            if (latitude == null || longitude == null) {
                return res.status(400).json({ message: "latitude and longitude are required" });
            }
            const location = await storage.upsertLocation({
                entityType: "driver",
                entityId: String(req.params.id),
                latitude: String(latitude),
                longitude: String(longitude),
                heading: String(heading || 0),
                speed: String(speed || 0),
            });
            broadcastLocation(location);
            res.status(200).json(location);
        }
        catch (err) {
            res.status(500).json({ message: "Internal server error" });
        }
    });
    // Update worker location (+ broadcast via WebSocket)
    app.post("/api/workers/:id/location", async (req, res) => {
        try {
            const { latitude, longitude, heading, speed } = req.body;
            if (latitude == null || longitude == null) {
                return res.status(400).json({ message: "latitude and longitude are required" });
            }
            const location = await storage.upsertLocation({
                entityType: "worker",
                entityId: req.params.id,
                latitude: String(latitude),
                longitude: String(longitude),
                heading: String(heading || 0),
                speed: String(speed || 0),
            });
            broadcastLocation(location);
            res.status(200).json(location);
        }
        catch (err) {
            res.status(500).json({ message: "Internal server error" });
        }
    });
    // ═══════════════════════════════════════════════
    // VEHICLE PRICING & DELIVERY CHARGE ROUTES
    // ═══════════════════════════════════════════════
    // Public: Get delivery charge estimate for a specific vehicle type
    app.post("/api/delivery/estimate", async (req, res) => {
        try {
            const { vehicleType, distanceKm } = req.body;
            if (!vehicleType || distanceKm == null) {
                return res.status(400).json({ message: "vehicleType and distanceKm are required" });
            }
            const estimate = await pricingService.getDeliveryEstimate(vehicleType, Number(distanceKm));
            res.status(200).json(estimate);
        }
        catch (err) {
            res.status(400).json({ message: err.message || "Failed to calculate delivery estimate" });
        }
    });
    // Public: Get delivery charge estimates for ALL vehicle types
    app.post("/api/delivery/estimate-all", async (req, res) => {
        try {
            const { distanceKm } = req.body;
            if (distanceKm == null) {
                return res.status(400).json({ message: "distanceKm is required" });
            }
            const estimates = await pricingService.getAllDeliveryEstimates(Number(distanceKm));
            res.status(200).json(estimates);
        }
        catch (err) {
            res.status(500).json({ message: err.message || "Failed to calculate delivery estimates" });
        }
    });
    // Public: Get all active vehicle pricing (for displaying options to clients)
    app.get("/api/delivery/vehicle-types", async (req, res) => {
        try {
            const pricing = await pricingService.listAllPricing();
            res.status(200).json(pricing.filter(p => p.isActive));
        }
        catch (err) {
            res.status(500).json({ message: "Failed to fetch vehicle types" });
        }
    });
    // Admin: Get all vehicle pricing
    app.get("/api/ops/pricing", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const pricing = await pricingService.listAllPricing();
            res.status(200).json(pricing);
        }
        catch (err) {
            res.status(500).json({ message: "Internal server error" });
        }
    });
    // Admin: Create vehicle pricing
    app.post("/api/ops/pricing", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const { vehicleType, displayName, baseFare, ratePerKm, minKm } = req.body;
            if (!vehicleType || !displayName || baseFare == null || ratePerKm == null) {
                return res.status(400).json({ message: "vehicleType, displayName, baseFare, and ratePerKm are required" });
            }
            const pricing = await pricingService.createPricing({
                vehicleType,
                displayName,
                baseFare: String(baseFare),
                ratePerKm: String(ratePerKm),
                minKm: String(minKm || 0),
            });
            res.status(201).json(pricing);
        }
        catch (err) {
            res.status(500).json({ message: err.message || "Internal server error" });
        }
    });
    // Admin: Update vehicle pricing
    app.patch("/api/ops/pricing/:id", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const { displayName, baseFare, ratePerKm, minKm, isActive } = req.body;
            const updateData = {};
            if (displayName !== undefined)
                updateData.displayName = displayName;
            if (baseFare !== undefined)
                updateData.baseFare = String(baseFare);
            if (ratePerKm !== undefined)
                updateData.ratePerKm = String(ratePerKm);
            if (minKm !== undefined)
                updateData.minKm = String(minKm);
            if (isActive !== undefined)
                updateData.isActive = isActive;
            const pricing = await pricingService.updatePricing(parseInt(req.params.id), updateData);
            res.status(200).json(pricing);
        }
        catch (err) {
            res.status(500).json({ message: err.message || "Internal server error" });
        }
    });
    // Admin: Delete (deactivate) vehicle pricing
    app.delete("/api/ops/pricing/:id", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            await pricingService.deletePricing(parseInt(req.params.id));
            res.status(200).json({ message: "Pricing deleted" });
        }
        catch (err) {
            res.status(500).json({ message: "Internal server error" });
        }
    });
    // Admin: Seed default pricing (one-time setup)
    app.post("/api/ops/pricing/seed", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const seeded = await pricingService.seedDefaultPricing();
            res.status(201).json({ message: `Seeded ${seeded.length} pricing entries`, seeded });
        }
        catch (err) {
            res.status(500).json({ message: err.message || "Internal server error" });
        }
    });
    // ═══════════════════════════════════════════════
    // MANPOWER/SERVICE PRICING ROUTES (like Urban Company)
    // ═══════════════════════════════════════════════
    // Public: Get service estimate
    app.post("/api/manpower/estimate", async (req, res) => {
        try {
            const { serviceCode, hours } = req.body;
            if (!serviceCode || hours == null) {
                return res.status(400).json({ message: "serviceCode and hours are required" });
            }
            const estimate = await manpowerPricingService.getServiceEstimate(serviceCode, Number(hours));
            res.status(200).json(estimate);
        }
        catch (err) {
            res.status(400).json({ message: err.message || "Failed to calculate estimate" });
        }
    });
    // Public: Get all services by category, with workers for each service
    app.get("/api/manpower/services", async (req, res) => {
        try {
            const grouped = await manpowerPricingService.getAllServicesGroupedWithWorkers();
            res.status(200).json(grouped);
        }
        catch (err) {
            res.status(500).json({ message: "Failed to fetch services" });
        }
    });
    // Public: Get service categories
    app.get("/api/manpower/categories", async (req, res) => {
        try {
            const categories = await manpowerPricingService.getCategories();
            res.status(200).json(categories);
        }
        catch (err) {
            res.status(500).json({ message: "Failed to fetch categories" });
        }
    });
    // Public: Get services for a category with estimates
    app.post("/api/manpower/category-estimates", async (req, res) => {
        try {
            const { category, hours } = req.body;
            if (!category) {
                return res.status(400).json({ message: "category is required" });
            }
            const estimates = await manpowerPricingService.getCategoryEstimates(category, Number(hours) || 1);
            res.status(200).json(estimates);
        }
        catch (err) {
            res.status(500).json({ message: err.message || "Failed to fetch estimates" });
        }
    });
    // Admin: Get all manpower pricing
    app.get("/api/ops/manpower-pricing", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const pricing = await manpowerPricingService.listAllPricing();
            res.status(200).json(pricing);
        }
        catch (err) {
            if (err?.message === "User not found") {
                return res.status(401).json({ message: "Not logged in" });
            }
            res.status(500).json({ message: "Internal server error" });
        }
    });
    // Admin: Create manpower pricing
    app.post("/api/ops/manpower-pricing", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const { serviceCategory, serviceName, serviceCode, description, basePrice, ratePerHour, minHours, estimatedDuration } = req.body;
            if (!serviceCategory || !serviceName || !serviceCode || basePrice == null || ratePerHour == null) {
                return res.status(400).json({ message: "serviceCategory, serviceName, serviceCode, basePrice, and ratePerHour are required" });
            }
            const pricing = await manpowerPricingService.createPricing({
                serviceCategory,
                serviceName,
                serviceCode,
                description,
                basePrice: String(basePrice),
                ratePerHour: String(ratePerHour),
                minHours: String(minHours || 1),
                estimatedDuration,
            });
            // Fire-and-forget ops update notification
            notificationService
                .publishPricingUpdate("created", {
                serviceCode: pricing.serviceCode,
                serviceName: pricing.serviceName,
                serviceCategory: pricing.serviceCategory,
                actorUserId: userId,
            })
                .catch(() => undefined);
            res.status(201).json(pricing);
        }
        catch (err) {
            res.status(500).json({ message: err.message || "Internal server error" });
        }
    });
    // Admin: Update manpower pricing
    app.patch("/api/ops/manpower-pricing/:id", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const { serviceCategory, serviceName, description, basePrice, ratePerHour, minHours, estimatedDuration, isActive } = req.body;
            const updateData = {};
            if (serviceCategory !== undefined)
                updateData.serviceCategory = serviceCategory;
            if (serviceName !== undefined)
                updateData.serviceName = serviceName;
            if (description !== undefined)
                updateData.description = description;
            if (basePrice !== undefined)
                updateData.basePrice = String(basePrice);
            if (ratePerHour !== undefined)
                updateData.ratePerHour = String(ratePerHour);
            if (minHours !== undefined)
                updateData.minHours = String(minHours);
            if (estimatedDuration !== undefined)
                updateData.estimatedDuration = estimatedDuration;
            if (isActive !== undefined)
                updateData.isActive = isActive;
            const pricing = await manpowerPricingService.updatePricing(parseInt(req.params.id), updateData);
            notificationService
                .publishPricingUpdate("updated", {
                serviceCode: pricing.serviceCode,
                serviceName: pricing.serviceName,
                serviceCategory: pricing.serviceCategory,
                actorUserId: userId,
            })
                .catch(() => undefined);
            res.status(200).json(pricing);
        }
        catch (err) {
            res.status(500).json({ message: err.message || "Internal server error" });
        }
    });
    // Admin: Delete manpower pricing
    app.delete("/api/ops/manpower-pricing/:id", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const pricingId = parseInt(req.params.id);
            const all = await manpowerPricingService.listAllPricing();
            const current = all.find((p) => p.id === pricingId);
            await manpowerPricingService.deletePricing(pricingId);
            if (current) {
                notificationService
                    .publishPricingUpdate("deleted", {
                    serviceCode: current.serviceCode,
                    serviceName: current.serviceName,
                    serviceCategory: current.serviceCategory,
                    actorUserId: userId,
                })
                    .catch(() => undefined);
            }
            res.status(200).json({ message: "Service pricing deleted" });
        }
        catch (err) {
            res.status(500).json({ message: "Internal server error" });
        }
    });
    // Admin: Delete ALL manpower pricing
    app.delete("/api/ops/manpower-pricing", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            await manpowerPricingService.deleteAllPricing();
            res.status(200).json({ success: true, message: "All service pricing deleted" });
        }
        catch (err) {
            res.status(500).json({ message: "Internal server error" });
        }
    });
    // Admin: Seed default manpower pricing
    app.post("/api/ops/manpower-pricing/seed", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const seeded = await manpowerPricingService.seedDefaultPricing();
            if (seeded.length > 0) {
                notificationService
                    .publish({
                    title: "Default Manpower Pricing Seeded",
                    message: `${seeded.length} default service pricing entries were added.`,
                    targetApp: "all",
                    targetUsers: "all",
                    type: "update",
                    status: "sent",
                    createdBy: userId,
                    linkUrl: "/ops/manpower-pricing",
                })
                    .catch(() => undefined);
            }
            res.status(201).json({ message: `Seeded ${seeded.length} service pricing entries`, seeded });
        }
        catch (err) {
            res.status(500).json({ message: err.message || "Internal server error" });
        }
    });
    // ═══════════════════════════════════════════════
    // NOTIFICATION ROUTES
    // ═══════════════════════════════════════════════
    // Admin: Get all notifications
    app.get("/api/ops/notifications", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const notifications = await notificationService.listAll();
            res.status(200).json(notifications);
        }
        catch (err) {
            if (err?.message === "User not found") {
                return res.status(401).json({ message: "Not logged in" });
            }
            res.status(500).json({ message: "Internal server error" });
        }
    });
    // Admin: Get notification stats
    app.get("/api/ops/notifications/stats", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const stats = await notificationService.getStats();
            res.status(200).json(stats);
        }
        catch (err) {
            res.status(500).json({ message: "Internal server error" });
        }
    });
    // Admin: Create notification
    app.post("/api/ops/notifications", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const { title, message, targetApp, targetUsers, type, imageUrl, linkUrl, scheduledAt, status } = req.body;
            if (!title || !message || !targetApp) {
                return res.status(400).json({ message: "title, message, and targetApp are required" });
            }
            const notification = await notificationService.publish({
                title,
                message,
                targetApp,
                targetUsers: targetUsers || "all",
                type: type || "info",
                imageUrl,
                linkUrl,
                scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
                status: status || "draft",
                createdBy: userId,
            });
            res.status(201).json(notification);
        }
        catch (err) {
            res.status(500).json({ message: err.message || "Internal server error" });
        }
    });
    // Admin: Broadcast notification to multiple apps in parallel
    app.post("/api/ops/notifications/broadcast", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const { title, message, targetApps, targetUsers, type, imageUrl, linkUrl, scheduledAt, status } = req.body;
            if (!title || !message || !Array.isArray(targetApps) || targetApps.length === 0) {
                return res.status(400).json({ message: "title, message, and targetApps are required" });
            }
            const notifications = await notificationService.createBroadcast({
                title,
                message,
                targetApps,
                targetUsers: targetUsers || "all",
                type: type || "info",
                imageUrl,
                linkUrl,
                scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
                status: status || "draft",
                createdBy: userId,
            });
            res.status(201).json(notifications);
        }
        catch (err) {
            res.status(500).json({ message: err.message || "Internal server error" });
        }
    });
    // Admin: Update notification
    app.patch("/api/ops/notifications/:id", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const { title, message, targetApp, targetUsers, type, imageUrl, linkUrl, scheduledAt, status } = req.body;
            const updateData = {};
            if (title !== undefined)
                updateData.title = title;
            if (message !== undefined)
                updateData.message = message;
            if (targetApp !== undefined)
                updateData.targetApp = targetApp;
            if (targetUsers !== undefined)
                updateData.targetUsers = targetUsers;
            if (type !== undefined)
                updateData.type = type;
            if (imageUrl !== undefined)
                updateData.imageUrl = imageUrl;
            if (linkUrl !== undefined)
                updateData.linkUrl = linkUrl;
            if (scheduledAt !== undefined)
                updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
            if (status !== undefined)
                updateData.status = status;
            const notification = await notificationService.update(parseInt(req.params.id), updateData);
            res.status(200).json(notification);
        }
        catch (err) {
            res.status(500).json({ message: err.message || "Internal server error" });
        }
    });
    // Admin: Delete notification
    app.delete("/api/ops/notifications/:id", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            await notificationService.delete(parseInt(req.params.id));
            res.status(200).json({ message: "Notification deleted" });
        }
        catch (err) {
            res.status(500).json({ message: "Internal server error" });
        }
    });
    // Admin: Send notification immediately
    app.post("/api/ops/notifications/:id/send", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const notification = await notificationService.send(parseInt(req.params.id));
            res.status(200).json(notification);
        }
        catch (err) {
            res.status(400).json({ message: err.message || "Failed to send notification" });
        }
    });
    // Admin: Schedule notification
    app.post("/api/ops/notifications/:id/schedule", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const { scheduledAt } = req.body;
            if (!scheduledAt) {
                return res.status(400).json({ message: "scheduledAt is required" });
            }
            const notification = await notificationService.schedule(parseInt(req.params.id), new Date(scheduledAt));
            res.status(200).json(notification);
        }
        catch (err) {
            res.status(400).json({ message: err.message || "Failed to schedule notification" });
        }
    });
    // Admin: Cancel notification
    app.post("/api/ops/notifications/:id/cancel", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const notification = await notificationService.cancel(parseInt(req.params.id));
            res.status(200).json(notification);
        }
        catch (err) {
            res.status(400).json({ message: err.message || "Failed to cancel notification" });
        }
    });
    // Admin: Process due scheduled notifications now
    app.post("/api/ops/notifications/process-scheduled", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const user = await authService.getMe(userId);
            if (user.role !== "admin")
                return res.status(401).json({ message: "Not an admin" });
            const results = await notificationService.processScheduledNotifications();
            res.status(200).json({ processed: results.length, results });
        }
        catch (err) {
            res.status(500).json({ message: err.message || "Failed to process notifications" });
        }
    });
    // Public: Get notifications for an app (for app users)
    app.get("/api/notifications/:app", async (req, res) => {
        try {
            const userId = req.session.userId;
            const notifications = await notificationService.getForAppAndUser(req.params.app, userId);
            res.status(200).json(notifications);
        }
        catch (err) {
            res.status(500).json({ message: "Failed to fetch notifications" });
        }
    });
    // User: Mark notification as read
    app.post("/api/notifications/:id/read", async (req, res) => {
        const userId = req.session.userId;
        if (!userId)
            return res.status(401).json({ message: "Not logged in" });
        try {
            const read = await notificationService.markAsRead(parseInt(req.params.id), userId);
            res.status(200).json(read);
        }
        catch (err) {
            res.status(500).json({ message: "Failed to mark notification as read" });
        }
    });
    // ═══════════════════════════════════════════════
    // WEBSOCKET: Real-time tracking
    // ═══════════════════════════════════════════════
    const wss = new WebSocketServer({ server: httpServer, path: "/ws/tracking" });
    wss.on("connection", (ws) => {
        trackingClients.add(ws);
        console.log(`[WS] Tracking client connected (total: ${trackingClients.size})`);
        // Send current locations immediately on connect
        storage.getLatestLocations().then((locations) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "initial_locations", data: locations }));
            }
        });
        ws.on("close", () => {
            trackingClients.delete(ws);
            console.log(`[WS] Tracking client disconnected (total: ${trackingClients.size})`);
        });
        ws.on("error", () => {
            trackingClients.delete(ws);
        });
    });
    const chatClients = new Map(); // "entityType:entityId" -> ChatClient
    function getChatClientKey(entityType, entityId) {
        return `${entityType}:${entityId}`;
    }
    function broadcastToConversation(conversationId, message, excludeKey) {
        const msg = JSON.stringify(message);
        chatClients.forEach((client, key) => {
            if (key !== excludeKey &&
                client.conversationIds.has(conversationId) &&
                client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(msg);
            }
        });
    }
    const wssChat = new WebSocketServer({
        server: httpServer,
        path: "/ws/chat"
    });
    wssChat.on("connection", async (ws, req) => {
        console.log("[WS Chat] Client attempting to connect");
        // Parse session cookie for authentication
        // Using express-session's session ID parsing
        const cookies = req.headers.cookie?.split(';').reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split('=');
            acc[key] = value;
            return acc;
        }, {});
        // For now, require entity type and ID in query params
        // In production, validate session properly
        const url = new URL(req.url || "", `http://${req.headers.host}`);
        const entityType = url.searchParams.get("entityType");
        const entityId = url.searchParams.get("entityId");
        if (!entityType || !entityId) {
            console.log("[WS Chat] Missing auth params");
            ws.close(1008, "Unauthorized");
            return;
        }
        const clientKey = getChatClientKey(entityType, entityId);
        // Get user's conversations
        const conversations = await storage.getConversations(entityType, entityId);
        const conversationIds = new Set(conversations.map((c) => c.id));
        const client = {
            ws,
            entityType,
            entityId,
            conversationIds,
        };
        chatClients.set(clientKey, client);
        console.log(`[WS Chat] ${clientKey} connected (conversations: ${conversationIds.size})`);
        // Send initial state
        ws.send(JSON.stringify({
            type: "connected",
            data: { entityType, entityId, conversations },
        }));
        ws.on("message", async (data) => {
            try {
                const payload = JSON.parse(data.toString());
                if (payload.type === "send_message") {
                    const { conversationId, content, messageType } = payload.data;
                    // Create message in DB
                    const message = await storage.createMessage({
                        conversationId,
                        senderType: entityType,
                        senderId: entityId,
                        content,
                        messageType: messageType || "text",
                    });
                    // Enrich with sender info
                    const enriched = await chatService.enrichMessages([message]);
                    // Broadcast to conversation participants
                    broadcastToConversation(conversationId, { type: "new_message", data: enriched[0] }, clientKey);
                    // Send confirmation to sender
                    ws.send(JSON.stringify({
                        type: "message_sent",
                        data: enriched[0],
                    }));
                }
                else if (payload.type === "mark_read") {
                    const { conversationId } = payload.data;
                    await storage.markConversationAsRead(conversationId, entityType, entityId);
                    // Notify other participant
                    broadcastToConversation(conversationId, { type: "messages_read", data: { conversationId, by: clientKey } }, clientKey);
                }
                else if (payload.type === "typing") {
                    const { conversationId, isTyping } = payload.data;
                    // Broadcast typing indicator (no DB storage for performance)
                    broadcastToConversation(conversationId, { type: "typing_indicator", data: { conversationId, entityType, entityId, isTyping } }, clientKey);
                }
                else if (payload.type === "join_conversation") {
                    // Add new conversation to client's subscriptions
                    const { conversationId } = payload.data;
                    client.conversationIds.add(conversationId);
                    // Send conversation messages
                    const messages = await storage.getMessages(conversationId);
                    const enriched = await chatService.enrichMessages(messages);
                    ws.send(JSON.stringify({
                        type: "conversation_messages",
                        data: { conversationId, messages: enriched },
                    }));
                }
            }
            catch (err) {
                console.error("[WS Chat] Message error:", err);
                ws.send(JSON.stringify({ type: "error", message: "Invalid message" }));
            }
        });
        ws.on("close", () => {
            chatClients.delete(clientKey);
            console.log(`[WS Chat] ${clientKey} disconnected`);
        });
        ws.on("error", (err) => {
            console.error(`[WS Chat] ${clientKey} error:`, err);
            chatClients.delete(clientKey);
        });
    });
    return httpServer;
}
