import { storage } from "../storage";
import { type InsertDriver } from "../shared/schema";
import { pool } from "../db";

export class DriverService {
    async listAll() {
        return await storage.getDrivers();
    }

    async create(data: any) {
        const {
            aadharUrl,
            addressProofUrl,
            rcBookUrl,
            licenseUrl,
            photoUrl: docPhotoUrl,
            name,
            fullName,
            phone,
            email,
            vehicleType,
            vehicleNumber,
            licenseNumber,
            ...driverData
        } = data;

        const ensuredPhone = String(phone || "").trim() || `9${String(Date.now()).slice(-9)}`;
        const ensuredName = String(fullName || name || "Driver").trim();

        const userRes = await pool.query(
            `
                INSERT INTO users (phone_number, email, user_type, status, is_verified, is_approved, profile_complete)
                VALUES ($1, $2, 'driver', 'active', true, true, true)
                ON CONFLICT (phone_number)
                DO UPDATE SET email = COALESCE(EXCLUDED.email, users.email)
                RETURNING id, phone_number, email, user_type, created_at
            `,
            [ensuredPhone, email || null]
        );
        const userId = Number(userRes.rows[0].id);

        const profileRes = await pool.query(
            `
                INSERT INTO driver_profiles (user_id, driver_id, full_name)
                VALUES ($1, $2, $3)
                ON CONFLICT (user_id)
                DO UPDATE SET full_name = EXCLUDED.full_name, updated_at = NOW()
                RETURNING id, user_id, driver_id, full_name, created_at
            `,
            [userId, `DRV-${userId}`, ensuredName]
        );
        const profileId = Number(profileRes.rows[0].id);

        if (vehicleType || vehicleNumber || licenseNumber) {
            await pool.query(
                `
                    INSERT INTO vehicles (driver_id, vehicle_type, vehicle_number, license_plate, registration_number)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (vehicle_number)
                    DO UPDATE SET
                        driver_id = EXCLUDED.driver_id,
                        vehicle_type = EXCLUDED.vehicle_type,
                        license_plate = EXCLUDED.license_plate,
                        registration_number = EXCLUDED.registration_number,
                        updated_at = NOW()
                `,
                [
                    profileId,
                    String(vehicleType || "2w"),
                    String(vehicleNumber || `TEMP-${profileId}`),
                    licenseNumber || null,
                    vehicleNumber || null,
                ]
            ).catch(() => {});
        }

        const docs: Array<{ type: string; url?: string | null }> = [
            { type: "aadhar", url: aadharUrl },
            { type: "address_proof", url: addressProofUrl },
            { type: "license", url: licenseUrl },
            { type: "registration", url: rcBookUrl },
            { type: "photo", url: docPhotoUrl },
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

        return {
            id: profileId,
            userId,
            name: ensuredName,
            fullName: ensuredName,
            phone: ensuredPhone,
            email: email || null,
            vehicleType: vehicleType || null,
            vehicleNumber: vehicleNumber || null,
            licenseNumber: licenseNumber || null,
            ...driverData,
        } as InsertDriver;
    }

    async updateStatus(id: number, status: string) {
        const normalized = String(status || "").toLowerCase();

        await pool.query(`ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE`).catch(() => ({ rows: [] as any[] }));

        // Unified schema stores approval on users joined via driver_profiles.
        if (["verified", "approve", "approved", "active"].includes(normalized)) {
            await pool.query(
                `
                    UPDATE users u
                    SET is_approved = true,
                        status = 'active'
                    FROM driver_profiles dp
                    WHERE dp.id = $1 AND dp.user_id = u.id
                `,
                [id]
            ).catch(() => { });
            await pool.query(`UPDATE driver_profiles SET is_approved = true WHERE id = $1`, [id]).catch(() => ({ rows: [] as any[] }));
        } else if (["rejected", "reject", "suspended", "inactive", "banned"].includes(normalized)) {
            const userStatus = normalized === "inactive" ? "inactive" : "suspended";
            await pool.query(
                `
                    UPDATE users u
                    SET is_approved = false,
                        status = $2
                    FROM driver_profiles dp
                    WHERE dp.id = $1 AND dp.user_id = u.id
                `,
                [id, userStatus]
            ).catch(() => { });
            await pool.query(`UPDATE driver_profiles SET is_approved = false WHERE id = $1`, [id]).catch(() => ({ rows: [] as any[] }));
        }

        try {
            return await storage.updateDriverStatus(id, status);
        } catch {
            const rows = await this.listAll();
            return (rows.find((r: any) => Number(r?.id) === Number(id)) || { id, status: normalized }) as any;
        }
    }
}

export const driverService = new DriverService();
