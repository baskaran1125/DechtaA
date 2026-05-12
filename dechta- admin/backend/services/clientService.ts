import { storage } from "../storage";
import { type InsertClient } from "../shared/schema";
import { pool } from "../db";

export class ClientService {
    async listAll(dateFilter?: { startDate?: Date; endDate?: Date }) {
        return await storage.getClients(dateFilter);
    }

    async create(data: InsertClient) {
        const ensuredPhone = String((data as any).phone || "").trim() || `9${String(Date.now()).slice(-9)}`;
        const ensuredName = String((data as any).name || (data as any).fullName || "Client").trim();
        const email = (data as any).email || null;

        const userRes = await pool.query(
            `
                INSERT INTO users (phone_number, email, user_type, status, is_verified, is_approved, profile_complete)
                VALUES ($1, $2, 'client', 'active', true, true, true)
                ON CONFLICT (phone_number)
                DO UPDATE SET email = COALESCE(EXCLUDED.email, users.email)
                RETURNING id, phone_number, email, created_at
            `,
            [ensuredPhone, email]
        );
        const userId = Number(userRes.rows[0].id);

        const profileRes = await pool.query(
            `
                INSERT INTO client_profiles (user_id, full_name, company, service_preference)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (user_id)
                DO UPDATE SET
                    full_name = EXCLUDED.full_name,
                    company = EXCLUDED.company,
                    service_preference = EXCLUDED.service_preference,
                    updated_at = NOW()
                RETURNING id, user_id, full_name, company, service_preference, created_at
            `,
            [
                userId,
                ensuredName,
                (data as any).company || null,
                (data as any).serviceType || (data as any).servicePreference || "vendor",
            ]
        );

        const profile = profileRes.rows[0];
        return {
            id: Number(profile.id),
            name: profile.full_name,
            email,
            phone: ensuredPhone,
            company: profile.company,
            area: (data as any).area || null,
            address: (data as any).address || null,
            serviceType: profile.service_preference || "vendor",
            createdAt: profile.created_at,
        } as any;
    }
}

export const clientService = new ClientService();
