import { storage } from "../storage";
import { type InsertManpower } from "../shared/schema";
import { pool } from "../db";

export class ManpowerService {
    async listAll(dateFilter?: { startDate?: Date; endDate?: Date }) {
        return await storage.getManpower(dateFilter);
    }

    async create(data: any) {
        const { skill, experience, category, photoUrl, aadharUrl, panUrl, bankMandateUrl, ...workerData } = data;
        const ensuredPhone = String(workerData.phone || "").trim() || `9${String(Date.now()).slice(-9)}`;
        const ensuredName = String(workerData.fullName || workerData.name || "Worker").trim();

        const userRes = await pool.query(
            `
                INSERT INTO users (phone_number, email, user_type, status, is_verified, is_approved, profile_complete)
                VALUES ($1, $2, 'worker', 'active', true, false, true)
                ON CONFLICT (phone_number)
                DO UPDATE SET email = COALESCE(EXCLUDED.email, users.email)
                RETURNING id, phone_number, email, created_at
            `,
            [ensuredPhone, workerData.email || null]
        );
        const userId = Number(userRes.rows[0].id);

        const profileRes = await pool.query(
            `
                INSERT INTO worker_profiles (user_id, full_name, state, city, area, address, qualification, aadhar_number, pan_number)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (user_id)
                DO UPDATE SET
                    full_name = EXCLUDED.full_name,
                    state = EXCLUDED.state,
                    city = EXCLUDED.city,
                    area = EXCLUDED.area,
                    address = EXCLUDED.address,
                    qualification = EXCLUDED.qualification,
                    aadhar_number = EXCLUDED.aadhar_number,
                    pan_number = EXCLUDED.pan_number,
                    updated_at = NOW()
                RETURNING id, user_id, full_name, state, city, area, address, qualification, aadhar_number, pan_number, created_at
            `,
            [
                userId,
                ensuredName,
                workerData.state || null,
                workerData.city || null,
                workerData.area || null,
                workerData.serviceAddress || workerData.address || null,
                workerData.qualification || null,
                workerData.aadharNumber || null,
                workerData.panNumber || null,
            ]
        );

        if (skill) {
            await pool.query(
                `
                    INSERT INTO worker_skills (user_id, skill_name, skill_category, years_of_experience)
                    VALUES ($1, $2, $3, $4)
                `,
                [
                    userId,
                    String(skill),
                    String(category || "general"),
                    Number(experience || 0),
                ]
            ).catch(() => {});
        }

        const docs: Array<{ type: string; url?: string | null }> = [
            { type: "photo", url: photoUrl },
            { type: "aadhar", url: aadharUrl },
            { type: "pan", url: panUrl },
            { type: "bank_mandate", url: bankMandateUrl },
        ];

        for (const doc of docs) {
            if (!doc.url) continue;
            await pool.query(
                `
                    INSERT INTO user_documents (user_id, document_type, document_url, status)
                    VALUES ($1, $2, $3, 'pending')
                `,
                [userId, doc.type, doc.url]
            );
        }

        const profile = profileRes.rows[0];
        return {
            id: String(profile.id),
            userId,
            fullName: profile.full_name,
            phone: ensuredPhone,
            state: profile.state,
            city: profile.city,
            area: profile.area,
            serviceAddress: profile.address,
            qualification: profile.qualification,
            aadharNumber: profile.aadhar_number,
            panNumber: profile.pan_number,
            skill: skill || null,
            experience: experience || null,
            category: category || null,
            createdAt: profile.created_at,
        } as InsertManpower;
    }

    async updateStatus(id: string, status: string) {
        return await storage.updateManpowerStatus(id, status);
    }
}

export const manpowerService = new ManpowerService();
