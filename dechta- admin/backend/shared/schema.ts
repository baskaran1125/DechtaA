import { pgTable, text, serial, integer, numeric, timestamp, uuid, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["buyer", "vendor", "admin"] }).notNull(),
  verificationStatus: text("verification_status", { enum: ["pending", "verified", "rejected"] }).default("verified").notNull(),
  rejectionReason: text("rejection_reason"),
  phone: text("phone"),
  ownerName: text("owner_name"),
  whatsappNumber: text("whatsapp_number"),
  businessAddress: text("business_address"),
  warehouseAddress: text("warehouse_address"),
  googleMapsLocation: text("google_maps_location"),
  yearsOfBusinessExperience: text("years_of_business_experience"),
  businessType: text("business_type"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const catalogItems = pgTable("catalog_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  brand: text("brand"),
  detailedDescription: text("detailed_description"),
  productQuality: text("product_quality"),
  warranty: text("warranty"),
  hsnCode: text("hsn_code"),
  stock: integer("stock").default(0),
  unit: text("unit").default("pcs"),
  isBulk: boolean("is_bulk").default(false),
  bulkDiscount: numeric("bulk_discount"),
  mrp: numeric("mrp"),
  sellingPrice: numeric("selling_price"),
  gstPercent: numeric("gst_percent").default("18"),
  lengthCm: numeric("length_cm"),
  widthCm: numeric("width_cm"),
  heightCm: numeric("height_cm"),
  weightKg: numeric("weight_kg"),
  selfDelivery: boolean("self_delivery").default(false),
  vehicleType: text("vehicle_type"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  uuid: uuid("uuid"),
  vendorId: integer("vendor_id"),
  catalogItemId: integer("catalog_item_id"),
  productName: text("product_name"),
  category: text("category"),
  description: text("description"),
  imageUrl: text("image_url"),
  stock: integer("stock"),
  mrp: numeric("mrp"),
  sellingPrice: numeric("selling_price"),
  costPrice: numeric("cost_price"),
  gstPercent: numeric("gst_percent"),
  discountPercent: numeric("discount_percent"),
  isBulk: boolean("is_bulk"),
  bulkDiscount: numeric("bulk_discount"),
  approvalStatus: text("approval_status"),
  rejectionReason: text("rejection_reason"),
  isActive: boolean("is_active"),
  statusActive: boolean("status_active"),
  searchTags: text("search_tags"),
  ftsVector: text("fts_vector"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  name: text("name"),
  detailedDescription: text("detailed_description"),
  stockQuantity: integer("stock_quantity"),
  unit: text("unit"),
  weightKg: numeric("weight_kg"),
  images: text("images"),
  brand: text("brand"),
  warranty: text("warranty"),
  totalPrice: numeric("total_price"),
  status: text("status"),
  isBoosted: boolean("is_boosted"),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  buyerId: integer("user_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  status: text("status", { enum: ["pending", "ordered", "dispatched", "delivered", "completed", "cancelled"] }).default("pending").notNull(),
  assignedDriverId: integer("assigned_driver_id"),
});

export const drivers = pgTable("drivers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  vehicleType: text("vehicle_type").notNull(),
  vehicleNumber: text("vehicle_number").notNull(),
  licenseNumber: text("license_number").notNull(),
  status: text("status", { enum: ["active", "inactive", "suspended"] }).default("active").notNull(),
  // New extended fields
  photoUrl: text("photo_url"),
  driverType: text("driver_type"),
  bankAccountNumber: text("bank_account_number"),
  bankIFSC: text("bank_ifsc"),
  bankName: text("bank_name"),
  bankBranch: text("bank_branch"),
  location: text("location"),
  serviceRating: numeric("service_rating").default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const driverDocuments = pgTable("driver_documents", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").notNull(),
  photoUrl: text("photo_url"),
  aadharUrl: text("aadhar_url"),
  addressProofUrl: text("address_proof_url"),
  rcBookUrl: text("rc_book_url"),
  licenseUrl: text("license_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const workerSkills = pgTable("worker_skills", {
  id: uuid("id").defaultRandom().primaryKey(),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  state: text("state"),
  city: text("city"),
  area: text("area"),
  referralCode: text("referral_code"),
  rating: numeric("rating").default("0"),
  reviewsCount: numeric("reviews_count").default("0"),
  isApproved: boolean("is_approved").default(false),
  isOnline: boolean("is_online").default(false),
  isFrozen: boolean("is_frozen").default(false),
  approvedBy: uuid("approved_by"),
  // New extended fields
  qualification: text("qualification"),
  aadharNumber: text("aadhar_number"),
  panNumber: text("pan_number"),
  serviceAddress: text("service_address"),
  bankAccountNumber: text("bank_account_number"),
  bankIFSC: text("bank_ifsc"),
  bankName: text("bank_name"),
  bankBranch: text("bank_branch"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const workerDetails = pgTable("worker_details", {
  id: uuid("id").defaultRandom().primaryKey(),
  workerId: uuid("worker_id").notNull(),
  skillName: text("skill_name"),
  experience: text("experience"),
  category: text("category"),
});

export const walletTable = pgTable("wallets", {
  workerId: uuid("worker_id").primaryKey(),
  totalEarned: numeric("total_earned").default("0"),
  platformFees: numeric("platform_fees").default("0"),
  walletBalance: numeric("wallet_balance").default("0"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  company: text("company"),
  area: text("area").notNull(),
  address: text("address"),
  serviceType: text("service_type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  jobType: text("job_type").notNull(),
  status: text("status", { enum: ["pending", "booked", "ongoing", "in-progress", "completed", "cancelled"] }).default("pending").notNull(),
  assignedDriverId: integer("assigned_driver_id"),
  assignedWorkerId: uuid("assigned_worker_id"),
  deadline: timestamp("deadline"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  status: text("status", { enum: ["open", "in-progress", "resolved", "closed"] }).default("open").notNull(),
  priority: text("priority", { enum: ["low", "medium", "high", "urgent"] }).default("medium").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const vendorDocuments = pgTable("vendor_documents", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").notNull(),
  gstNumber: text("gst_number"),
  panNumber: text("pan_number"),
  udyamRegistrationNumber: text("udyam_registration_number"),
  bankAccountDetails: text("bank_account_details"),
  gstUrl: text("gst_url"),
  panUrl: text("pan_url"),
  aadharUrl: text("aadhar_url"),
  cancelledChequeUrl: text("cancelled_cheque_url"),
  gstCertificateUrl: text("gst_certificate_url"),
  shopLicenseUrl: text("shop_license_url"),
  businessLicenseUrl: text("business_license_url"),
  panImageUrl: text("pan_image_url"),
  registrationCertificateUrl: text("registration_certificate_url"),
  passbookCancelledChequeUrl: text("passbook_cancelled_cheque_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const workerDocuments = pgTable("worker_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  workerId: text("worker_id").notNull(),
  photoUrl: text("photo_url"),
  aadharUrl: text("aadhar_url"),
  panUrl: text("pan_url"),
  skillCertificateUrl: text("skill_certificate_url"),
  bankMandateUrl: text("bank_mandate_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const banners = pgTable("banners", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  imageUrl: text("image_url").notNull(),
  linkUrl: text("link_url"),
  targetPages: text("target_pages").default("all").notNull(),
  position: text("position", { enum: ["hero", "sidebar", "inline", "popup"] }).default("hero").notNull(),
  active: text("active", { enum: ["true", "false"] }).default("true").notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const locationUpdates = pgTable("location_updates", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  latitude: numeric("latitude").notNull(),
  longitude: numeric("longitude").notNull(),
  heading: numeric("heading").default("0"),
  speed: numeric("speed").default("0"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Vehicle pricing for delivery charges calculation
export const vehiclePricing = pgTable("vehicle_pricing", {
  id: serial("id").primaryKey(),
  vehicleType: text("vehicle_type").notNull().unique(), // 2W, 3W, 4W-750kg, 4W-1.4ton, 4W-1.7ton, 4W-2.5ton
  displayName: text("display_name").notNull(), // "Two Wheeler", "Three Wheeler", etc.
  baseFare: numeric("base_fare").notNull(), // Base/minimum fare
  ratePerKm: numeric("rate_per_km").notNull(), // Rate per kilometer
  minKm: numeric("min_km").default("0"), // Minimum km included in base fare
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Manpower/Service pricing (like Urban Company)
export const manpowerPricing = pgTable("manpower_pricing", {
  id: serial("id").primaryKey(),
  serviceCategory: text("service_category").notNull(), // Cleaning, Plumbing, Electrical, Carpentry, Painting, AC Repair, etc.
  serviceName: text("service_name").notNull(), // Specific service: "Deep House Cleaning", "Tap Repair", etc.
  serviceCode: text("service_code").notNull().unique(), // Unique code: CLN-001, PLB-001, etc.
  description: text("description"), // Service description
  basePrice: numeric("base_price").notNull(), // Minimum charge
  ratePerHour: numeric("rate_per_hour").notNull(), // Hourly rate after minimum hours
  minHours: numeric("min_hours").default("1"), // Minimum hours included in base price
  estimatedDuration: text("estimated_duration"), // e.g., "2-3 hours"
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notifications for all apps
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  targetApp: text("target_app").notNull(), // 'all', 'client', 'vendor', 'driver', 'manpower'
  targetUsers: text("target_users"), // 'all' or comma-separated user IDs
  type: text("type", { enum: ["info", "promo", "alert", "update"] }).default("info").notNull(),
  imageUrl: text("image_url"),
  linkUrl: text("link_url"),
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  status: text("status", { enum: ["draft", "scheduled", "sent", "cancelled"] }).default("draft").notNull(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Track which users have read notifications
export const notificationReads = pgTable("notification_reads", {
  id: serial("id").primaryKey(),
  notificationId: integer("notification_id").references(() => notifications.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  readAt: timestamp("read_at").defaultNow(),
});

// Chat conversations
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  // Polymorphic participants
  participant1Type: text("participant1_type").notNull(), // 'user', 'client', 'worker', 'driver'
  participant1Id: text("participant1_id").notNull(), // Store all as text to handle UUIDs
  participant2Type: text("participant2_type").notNull(),
  participant2Id: text("participant2_id").notNull(),
  // Context
  title: text("title"), // Optional: "Order #123 Support"
  conversationType: text("conversation_type", {
    enum: ["support", "order", "job", "direct"]
  }).default("direct").notNull(),
  // Links to existing entities
  supportTicketId: integer("support_ticket_id").references(() => supportTickets.id),
  relatedEntityType: text("related_entity_type"), // 'order', 'job', null
  relatedEntityId: integer("related_entity_id"),
  // Metadata
  lastMessageAt: timestamp("last_message_at"),
  status: text("status", {
    enum: ["active", "archived", "closed"]
  }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Chat messages
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id).notNull(),
  // Polymorphic sender
  senderType: text("sender_type").notNull(), // 'user', 'client', 'worker', 'driver'
  senderId: text("sender_id").notNull(),
  // Message content
  content: text("content").notNull(),
  messageType: text("message_type", {
    enum: ["text", "image", "file", "system"]
  }).default("text").notNull(),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  // Read receipt
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Typing indicators
export const typingIndicators = pgTable("typing_indicators", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id).notNull(),
  userType: text("user_type").notNull(),
  userId: text("user_id").notNull(),
  lastTypingAt: timestamp("last_typing_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertCatalogItemSchema = createInsertSchema(catalogItems).omit({
  id: true,
  createdAt: true,
}).extend({
  vendorId: z.number().optional()
});
export const insertProductSchema = createInsertSchema(products).omit({ id: true, vendorId: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, status: true, buyerId: true });
export const insertDriverSchema = createInsertSchema(drivers).omit({ id: true, createdAt: true });
export const insertDriverDocumentSchema = createInsertSchema(driverDocuments).omit({ id: true, createdAt: true });
export const insertManpowerSchema = createInsertSchema(workerSkills).omit({ id: true, createdAt: true, updatedAt: true });
export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true });
export const insertJobSchema = createInsertSchema(jobs).omit({ id: true, createdAt: true });
export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBannerSchema = createInsertSchema(banners).omit({ id: true, createdAt: true });
export const insertLocationUpdateSchema = createInsertSchema(locationUpdates).omit({ id: true, updatedAt: true });
export const insertVehiclePricingSchema = createInsertSchema(vehiclePricing).omit({ id: true, createdAt: true, updatedAt: true });
export const insertManpowerPricingSchema = createInsertSchema(manpowerPricing).omit({ id: true, createdAt: true, updatedAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true, sentAt: true });
export const insertNotificationReadSchema = createInsertSchema(notificationReads).omit({ id: true, readAt: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertTypingIndicatorSchema = createInsertSchema(typingIndicators).omit({ id: true, lastTypingAt: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type CatalogItem = typeof catalogItems.$inferSelect;
export type InsertCatalogItem = z.infer<typeof insertCatalogItemSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Driver = typeof drivers.$inferSelect;
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type DriverDocument = typeof driverDocuments.$inferSelect;
export type InsertDriverDocument = z.infer<typeof insertDriverDocumentSchema>;
export type Manpower = typeof workerSkills.$inferSelect;
export type InsertManpower = z.infer<typeof insertManpowerSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type VendorDocument = typeof vendorDocuments.$inferSelect;
export type ManpowerDocument = typeof workerDocuments.$inferSelect;
export type Banner = typeof banners.$inferSelect;
export type InsertBanner = z.infer<typeof insertBannerSchema>;
export type LocationUpdate = typeof locationUpdates.$inferSelect;
export type InsertLocationUpdate = z.infer<typeof insertLocationUpdateSchema>;
export type AppSetting = typeof appSettings.$inferSelect;
export type VehiclePricing = typeof vehiclePricing.$inferSelect;
export type InsertVehiclePricing = z.infer<typeof insertVehiclePricingSchema>;
export type ManpowerPricing = typeof manpowerPricing.$inferSelect;
export type InsertManpowerPricing = z.infer<typeof insertManpowerPricingSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type NotificationRead = typeof notificationReads.$inferSelect;
export type InsertNotificationRead = z.infer<typeof insertNotificationReadSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type TypingIndicator = typeof typingIndicators.$inferSelect;
export type InsertTypingIndicator = z.infer<typeof insertTypingIndicatorSchema>;
