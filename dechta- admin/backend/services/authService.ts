import { storage } from "../storage";
import { type InsertUser } from "../shared/schema";
import { pool } from "../db";

export class AuthService {
    private getFallbackAdminIdentity() {
        const email = (process.env.ADMIN_EMAIL || "arjunan@gmail.com").trim().toLowerCase();
        const password = process.env.ADMIN_PASSWORD || "Aju@2005";
        const name = (process.env.ADMIN_NAME || "Arjunan").trim();

        return {
            id: -1,
            name,
            email,
            password,
            role: "admin",
            verificationStatus: "verified",
            rejectionReason: null,
            phone: process.env.ADMIN_PHONE_NUMBER || null,
        };
    }

    private mapAuthUser(row: any) {
        return {
            id: Number(row.id),
            name: row.name || row.full_name || row.owner_name || row.business_name || row.email || `User #${row.id}`,
            email: row.email || null,
            password: row.password || row.password_hash || null,
            role: row.role || row.user_type || "buyer",
            verificationStatus: row.verification_status || (row.is_approved ? "verified" : "pending"),
            rejectionReason: row.rejection_reason || null,
            phone: row.phone || row.phone_number || null,
        };
    }

    private async findAdminByEmail(email: string) {
        try {
            const result = await pool.query(
                `SELECT * FROM users
                 WHERE LOWER(email) = LOWER($1)
                   AND (LOWER(COALESCE(role::text, '')) = 'admin' OR LOWER(COALESCE(user_type::text, '')) = 'admin')
                 LIMIT 1`,
                [email],
            );
            if (!result.rows[0]) return null;
            return this.mapAuthUser(result.rows[0]);
        } catch {
            return null;
        }
    }

    private async upsertFallbackAdmin(email: string, password: string, name: string) {
        const columnsResult = await pool.query(
            `SELECT column_name
             FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'users'`,
        );
        const columns = new Set((columnsResult.rows || []).map((row: any) => String(row.column_name)));

        const fields: string[] = [];
        const values: any[] = [];
        const push = (columnName: string, value: any) => {
            if (columns.has(columnName)) {
                fields.push(columnName);
                values.push(value);
            }
        };

        push("name", name);
        push("full_name", name);
        push("email", email);
        push("password", password);
        push("password_hash", password);
        push("role", "admin");
        push("user_type", "admin");
        push("phone_number", process.env.ADMIN_PHONE_NUMBER || "9000000000");
        push("phone", process.env.ADMIN_PHONE_NUMBER || "9000000000");
        push("status", "active");
        push("is_approved", true);
        push("is_verified", true);
        push("verification_status", "verified");
        push("profile_complete", true);

        if (!fields.includes("email")) {
            return null;
        }

        const placeholders = fields.map((_, idx) => `$${idx + 1}`).join(", ");
        const updateAssignments: string[] = [];

        if (columns.has("name")) updateAssignments.push(`name = EXCLUDED.name`);
        if (columns.has("full_name")) updateAssignments.push(`full_name = EXCLUDED.full_name`);
        if (columns.has("password")) updateAssignments.push(`password = EXCLUDED.password`);
        if (columns.has("password_hash")) updateAssignments.push(`password_hash = EXCLUDED.password_hash`);
        if (columns.has("role")) updateAssignments.push(`role = EXCLUDED.role`);
        if (columns.has("user_type")) updateAssignments.push(`user_type = EXCLUDED.user_type`);
        if (columns.has("verification_status")) updateAssignments.push(`verification_status = EXCLUDED.verification_status`);
        if (columns.has("is_approved")) updateAssignments.push(`is_approved = EXCLUDED.is_approved`);
        if (columns.has("is_verified")) updateAssignments.push(`is_verified = EXCLUDED.is_verified`);
        if (columns.has("profile_complete")) updateAssignments.push(`profile_complete = EXCLUDED.profile_complete`);

        const query = `
            INSERT INTO users (${fields.join(", ")})
            VALUES (${placeholders})
            ON CONFLICT (email) DO UPDATE SET ${updateAssignments.length > 0 ? updateAssignments.join(", ") : "email = EXCLUDED.email"}
            RETURNING *`;

        const result = await pool.query(query, values);
        if (!result.rows[0]) return null;
        return this.mapAuthUser(result.rows[0]);
    }

    async register(data: InsertUser) {
        const existingUser = await storage.getUserByEmail(data.email);
        if (existingUser) {
            throw new Error("Email already exists");
        }
        return await storage.createUser(data);
    }

    async login(email: string, password: string) {
        const normalizedEmail = email.trim().toLowerCase();
        const user = await storage.getUserByEmail(normalizedEmail);

        if (user && user.password === password) {
            return user;
        }

        const fallbackAdminEmail = (process.env.ADMIN_EMAIL || "arjunan@gmail.com").trim().toLowerCase();
        const fallbackAdminPassword = process.env.ADMIN_PASSWORD || "Aju@2005";
        const fallbackAdminName = (process.env.ADMIN_NAME || "Arjunan").trim();

        const isFallbackAdminLogin = normalizedEmail === fallbackAdminEmail && password === fallbackAdminPassword;
        if (isFallbackAdminLogin) {
            if (user && user.role === "admin") {
                return user;
            }

            const existingAdmin = await this.findAdminByEmail(fallbackAdminEmail);
            if (existingAdmin) {
                return existingAdmin;
            }

            try {
                const provisionedAdmin = await this.upsertFallbackAdmin(
                    fallbackAdminEmail,
                    fallbackAdminPassword,
                    fallbackAdminName,
                );
                if (provisionedAdmin) {
                    return provisionedAdmin;
                }
            } catch (error) {
                console.error("authService.login fallback admin provisioning error:", error);
            }

            return this.getFallbackAdminIdentity();
        }

        throw new Error("Invalid email or password");
    }

    async getMe(userId: number) {
        if (userId === -1) {
            return this.getFallbackAdminIdentity();
        }

        const user = await storage.getUser(userId);
        if (!user) {
            throw new Error("User not found");
        }
        return user;
    }
}

export const authService = new AuthService();
