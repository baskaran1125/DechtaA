import { storage } from "../storage";
const SUPPORTED_APPS = ["client", "vendor", "driver", "manpower"];
export class NotificationService {
    parseTargetUsers(targetUsers) {
        if (!targetUsers || targetUsers === "all")
            return null;
        const ids = targetUsers
            .split(",")
            .map((part) => Number(part.trim()))
            .filter((num) => Number.isInteger(num) && num > 0);
        return new Set(ids);
    }
    filterNotificationByUser(notification, userId) {
        if (!userId)
            return true;
        const targets = this.parseTargetUsers(notification.targetUsers);
        if (!targets)
            return true;
        return targets.has(userId);
    }
    /**
     * Get all notifications (for admin)
     */
    async listAll() {
        return await storage.getNotifications();
    }
    /**
     * Get notification by ID
     */
    async getById(id) {
        return await storage.getNotificationById(id);
    }
    /**
     * Get notifications for a specific app
     */
    async getForApp(app) {
        return await this.getForAppAndUser(app);
    }
    /**
     * Get notifications for an app and optional user (targeted delivery)
     */
    async getForAppAndUser(app, userId) {
        const notifications = await storage.getNotificationsForApp(app);
        return notifications.filter((n) => this.filterNotificationByUser(n, userId));
    }
    /**
     * Create a new notification
     */
    async create(data) {
        return await storage.createNotification(data);
    }
    /**
     * Update notification
     */
    async update(id, data) {
        return await storage.updateNotification(id, data);
    }
    /**
     * Delete notification
     */
    async delete(id) {
        return await storage.deleteNotification(id);
    }
    /**
     * Send notification (mark as sent)
     */
    async send(id) {
        const notification = await storage.getNotificationById(id);
        if (!notification) {
            throw new Error("Notification not found");
        }
        if (notification.status === "sent") {
            throw new Error("Notification already sent");
        }
        if (notification.status === "cancelled") {
            throw new Error("Cannot send cancelled notification");
        }
        return await storage.markNotificationSent(id);
    }
    /**
     * Cancel a scheduled notification
     */
    async cancel(id) {
        const notification = await storage.getNotificationById(id);
        if (!notification) {
            throw new Error("Notification not found");
        }
        if (notification.status === "sent") {
            throw new Error("Cannot cancel sent notification");
        }
        return await storage.updateNotification(id, { status: "cancelled" });
    }
    /**
     * Schedule a notification
     */
    async schedule(id, scheduledAt) {
        const notification = await storage.getNotificationById(id);
        if (!notification) {
            throw new Error("Notification not found");
        }
        if (notification.status === "sent") {
            throw new Error("Cannot reschedule sent notification");
        }
        return await storage.updateNotification(id, {
            scheduledAt,
            status: "scheduled",
        });
    }
    /**
     * Get pending scheduled notifications that should be sent
     */
    async getPendingScheduledNotifications() {
        const all = await storage.getNotifications();
        const now = new Date();
        return all.filter((n) => n.status === "scheduled" &&
            n.scheduledAt &&
            new Date(n.scheduledAt) <= now);
    }
    /**
     * Process scheduled notifications (to be called by a cron job)
     */
    async processScheduledNotifications() {
        const pending = await this.getPendingScheduledNotifications();
        const results = await Promise.all(pending.map(async (notification) => {
            try {
                await this.send(notification.id);
                return { id: notification.id, status: "sent" };
            }
            catch {
                return { id: notification.id, status: "error" };
            }
        }));
        return results;
    }
    /**
     * Mark notification as read by user
     */
    async markAsRead(notificationId, userId) {
        return await storage.markNotificationRead(notificationId, userId);
    }
    /**
     * Get notifications for a user
     */
    async getUserNotifications(userId, app) {
        return await storage.getUserNotifications(userId, app);
    }
    /**
     * Create notifications across multiple apps in parallel
     */
    async createBroadcast(data) {
        const uniqueApps = [...new Set(data.targetApps)].filter((app) => SUPPORTED_APPS.includes(app));
        const normalizedStatus = data.status === "sent" ? "draft" : data.status;
        if (uniqueApps.length === 0) {
            throw new Error("At least one valid target app is required");
        }
        const created = await Promise.all(uniqueApps.map((app) => storage.createNotification({
            ...data,
            status: normalizedStatus,
            targetApp: app,
        })));
        if (data.status === "sent") {
            return await Promise.all(created.map((item) => storage.markNotificationSent(item.id)));
        }
        return created;
    }
    /**
     * Create and immediately send/update status for operational updates
     */
    async publish(data) {
        const normalizedStatus = data.status === "sent" ? "draft" : data.status;
        const created = await storage.createNotification({
            ...data,
            status: normalizedStatus,
        });
        if (data.status === "sent") {
            return await storage.markNotificationSent(created.id);
        }
        return created;
    }
    /**
     * Publish a standardized pricing change notification to all apps
     */
    async publishPricingUpdate(action, context) {
        const titleMap = {
            created: "New Manpower Service Pricing Added",
            updated: "Manpower Service Pricing Updated",
            deleted: "Manpower Service Pricing Disabled",
        };
        const message = `${context.serviceName} (${context.serviceCode}) in ${context.serviceCategory} was ${action}.`;
        return await this.publish({
            title: titleMap[action],
            message,
            targetApp: "all",
            targetUsers: "all",
            type: "update",
            status: "sent",
            createdBy: context.actorUserId,
            linkUrl: "/ops/manpower-pricing",
        });
    }
    /**
     * Get notification stats
     */
    async getStats() {
        const all = await storage.getNotifications();
        return {
            total: all.length,
            draft: all.filter((n) => n.status === "draft").length,
            scheduled: all.filter((n) => n.status === "scheduled").length,
            sent: all.filter((n) => n.status === "sent").length,
            cancelled: all.filter((n) => n.status === "cancelled").length,
        };
    }
}
export const notificationService = new NotificationService();
