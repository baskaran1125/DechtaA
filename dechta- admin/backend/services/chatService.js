import { storage } from "../storage";
export class ChatService {
    async getUserInfo(entityType, entityId) {
        // Helper to get user display info for any entity type
        if (entityType === "user") {
            const user = await storage.getUser(parseInt(entityId));
            return {
                id: entityId,
                type: entityType,
                name: user?.name || user?.email || "User",
                avatar: null,
            };
        }
        else if (entityType === "client") {
            const client = await storage.getClient(parseInt(entityId));
            return {
                id: entityId,
                type: entityType,
                name: client?.fullName || client?.name || "Client",
                avatar: null,
            };
        }
        else if (entityType === "worker") {
            const worker = await storage.getManpowerById(entityId);
            return {
                id: entityId,
                type: entityType,
                name: worker?.fullName || "Worker",
                avatar: null,
            };
        }
        else if (entityType === "driver") {
            const driver = await storage.getDriver(parseInt(entityId));
            return {
                id: entityId,
                type: entityType,
                name: driver?.fullName || driver?.name || "Driver",
                avatar: null,
            };
        }
        return null;
    }
    async enrichConversations(conversations, forEntityType, forEntityId) {
        return await Promise.all(conversations.map(async (convo) => {
            // Determine the "other" participant
            const isParticipant1 = convo.participant1Type === forEntityType &&
                convo.participant1Id === forEntityId;
            const otherType = isParticipant1 ? convo.participant2Type : convo.participant1Type;
            const otherId = isParticipant1 ? convo.participant2Id : convo.participant1Id;
            const otherUser = await this.getUserInfo(otherType, otherId);
            return {
                ...convo,
                otherParticipant: otherUser,
            };
        }));
    }
    async enrichMessages(messages) {
        return await Promise.all(messages.map(async (msg) => {
            const sender = await this.getUserInfo(msg.senderType, msg.senderId);
            return {
                ...msg,
                sender,
            };
        }));
    }
    async createMessageFromSupport(conversationId, content, messageType = "text") {
        return await storage.createMessage({
            conversationId,
            senderType: "user", // System/admin user
            senderId: "0", // Special admin ID
            content,
            messageType: messageType,
        });
    }
}
export const chatService = new ChatService();
