import { storage } from "../storage";
import { pool } from "../db";

export class OnboardingService {
  async getDriverOnboardingDetails(driverId: number) {
    const normalizeDocValue = (value: unknown): string | null => {
      const text = String(value || '').trim();
      if (!text) return null;
      if (text.startsWith('data:')) {
        const duplicateData = text.indexOf(',data:');
        return duplicateData > 0 ? text.slice(0, duplicateData) : text;
      }
      const commaIdx = text.indexOf(',');
      if (commaIdx > 0 && !text.includes('://')) {
        return text.slice(0, commaIdx).trim();
      }
      if (commaIdx > 0 && text.slice(commaIdx + 1).trim().startsWith('http')) {
        return text.slice(0, commaIdx).trim();
      }
      return text;
    };

    const drivers = await storage.getDrivers().catch(() => [] as any[]);
    const driverRow = (drivers || []).find((row: any) => Number(row?.id) === Number(driverId)) || null;

    const profileRes = await pool.query(
      `
        SELECT
          dp.id,
          dp.user_id,
          dp.full_name,
          dp.date_of_birth,
          dp.blood_group,
          dp.tshirt_size,
          dp.emergency_contact,
          dp.preferred_zone,
          dp.avatar_url,
          dp.referral_code,
          dp.is_registered,
          dp.is_approved,
          dp.created_at,
          dp.updated_at,
          u.phone_number,
          u.email,
          u.status AS user_status,
          u.is_approved AS user_is_approved,
          u.verification_status,
          u.rejection_reason
        FROM driver_profiles dp
        LEFT JOIN users u ON u.id = dp.user_id
        WHERE dp.id = $1
        LIMIT 1
      `,
      [driverId]
    ).catch(() => ({ rows: [] as any[] }));

    const profile = profileRes.rows?.[0] || null;
    const profileUserId = profile?.user_id || null;

    const legacyBankRes = await pool.query(
      `
        SELECT account_holder_name, account_number, ifsc_code, bank_branch, upi_id, is_verified
        FROM driver_bank_accounts
        WHERE driver_id = $1
        ORDER BY id DESC
        LIMIT 1
      `,
      [driverId]
    ).catch(() => ({ rows: [] as any[] }));

    const unifiedBankRes = profileUserId
      ? await pool.query(
          `
            SELECT account_holder_name, account_number, ifsc_code, bank_branch, upi_id, is_verified
            FROM bank_accounts
            WHERE user_id = $1
            ORDER BY id DESC
            LIMIT 1
          `,
          [profileUserId]
        ).catch(() => ({ rows: [] as any[] }))
      : { rows: [] as any[] };

    const bank = legacyBankRes.rows?.[0] || unifiedBankRes.rows?.[0] || null;
    const docs = await this.getDriverDocuments(driverId);

    const rawDocRows = profileUserId
      ? await pool.query(
          `
            SELECT document_type, document_url, front_url, back_url, status, rejection_reason
            FROM user_documents
            WHERE user_id = $1
            ORDER BY id DESC
          `,
          [profileUserId]
        ).catch(() => ({ rows: [] as any[] }))
      : { rows: [] as any[] };

    const allDocuments = (rawDocRows.rows || [])
      .map((row: any) => ({
        documentType: String(row?.document_type || '').trim().toLowerCase(),
        documentUrl: normalizeDocValue(row?.document_url),
        frontUrl: normalizeDocValue(row?.front_url),
        backUrl: normalizeDocValue(row?.back_url),
        status: row?.status || null,
        rejectionReason: row?.rejection_reason || null,
      }))
      .filter((row: any) => row.documentType);

    const statusFromUser = String(profile?.verification_status || profile?.user_status || '').toLowerCase();
    const approvedFromProfile = Boolean(profile?.is_approved || profile?.user_is_approved || ['approved', 'verified', 'active'].includes(statusFromUser));

    return {
      id: Number(driverId),
      profile: profile ? {
        id: profile.id,
        userId: profile.user_id,
        fullName: profile.full_name,
        phone: profile.phone_number || null,
        email: profile.email || null,
        dob: profile.date_of_birth || null,
        bloodGroup: profile.blood_group || null,
        tshirtSize: profile.tshirt_size || null,
        emergencyContact: profile.emergency_contact || null,
        preferredZone: profile.preferred_zone || null,
        avatarUrl: profile.avatar_url || null,
        referralCode: profile.referral_code || null,
        isRegistered: !!profile.is_registered,
        isApproved: approvedFromProfile,
        verificationStatus: profile.verification_status || (approvedFromProfile ? 'verified' : 'pending'),
        rejectionReason: profile.rejection_reason || null,
        createdAt: profile.created_at || null,
        updatedAt: profile.updated_at || null,
      } : null,
      driver: driverRow ? {
        id: driverRow.id,
        name: driverRow.name || null,
        email: driverRow.email || null,
        phone: driverRow.phone || null,
        vehicleType: driverRow.vehicleType || driverRow.vehicle_type || null,
        vehicleNumber: driverRow.vehicleNumber || driverRow.vehicle_number || null,
        licenseNumber: driverRow.licenseNumber || driverRow.license_number || null,
        vehicleModelId: driverRow.vehicleModelId || driverRow.vehicle_model_id || null,
        vehicleModelName: driverRow.vehicleModelName || driverRow.vehicle_model_name || null,
        vehicleWeight: driverRow.vehicleWeight || driverRow.vehicle_weight || null,
        vehicleDimensions: driverRow.vehicleDimensions || driverRow.vehicle_dimensions || null,
        bodyType: driverRow.bodyType || driverRow.body_type || null,
        location: driverRow.location || null,
        latitude: driverRow.latitude ?? null,
        longitude: driverRow.longitude ?? null,
        status: driverRow.status || 'active',
        verificationStatus: driverRow.verificationStatus || driverRow.verification_status || null,
        rejectionReason: driverRow.rejectionReason || driverRow.rejection_reason || null,
        photoUrl: driverRow.photoUrl || driverRow.photo_url || null,
        driverType: driverRow.driverType || driverRow.driver_type || null,
        bankAccountNumber: driverRow.bankAccountNumber || driverRow.bank_account_number || null,
        bankIFSC: driverRow.bankIFSC || driverRow.bank_ifsc || null,
        bankName: driverRow.bankName || driverRow.bank_name || null,
        bankBranch: driverRow.bankBranch || driverRow.bank_branch || null,
        serviceRating: driverRow.serviceRating || driverRow.service_rating || '0',
        createdAt: driverRow.createdAt || driverRow.created_at || null,
      } : null,
      vehicle: driverRow ? {
        vehicleType: driverRow.vehicleType || driverRow.vehicle_type || null,
        vehicleNumber: driverRow.vehicleNumber || driverRow.vehicle_number || null,
        licenseNumber: driverRow.licenseNumber || driverRow.license_number || null,
        vehicleModelId: driverRow.vehicleModelId || driverRow.vehicle_model_id || null,
        vehicleModelName: driverRow.vehicleModelName || driverRow.vehicle_model_name || null,
        vehicleWeight: driverRow.vehicleWeight || driverRow.vehicle_weight || null,
        vehicleDimensions: driverRow.vehicleDimensions || driverRow.vehicle_dimensions || null,
        bodyType: driverRow.bodyType || driverRow.body_type || null,
        location: driverRow.location || null,
      } : null,
      bank: bank ? {
        accountHolderName: bank.account_holder_name || null,
        accountNumber: bank.account_number || null,
        ifscCode: bank.ifsc_code || null,
        bankBranch: bank.bank_branch || null,
        upiId: bank.upi_id || null,
        isVerified: !!bank.is_verified,
      } : null,
      documents: {
        ...docs,
        allDocuments,
      },
    };
  }

  // Create vendor (admin onboarding)
  async createVendor(data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    ownerName?: string;
    whatsappNumber?: string;
    businessAddress?: string;
    warehouseAddress?: string;
    googleMapsLocation?: string;
    yearsOfBusinessExperience?: string;
    businessType?: string;
    gstNumber?: string;
    panNumber?: string;
    udyamRegistrationNumber?: string;
    bankAccountDetails?: string;
    gstUrl?: string;
    panUrl?: string;
    aadharUrl?: string;
    cancelledChequeUrl?: string;
    gstCertificateUrl?: string;
    shopLicenseUrl?: string;
    businessLicenseUrl?: string;
    panImageUrl?: string;
    registrationCertificateUrl?: string;
    passbookCancelledChequeUrl?: string;
  }) {
    if (data.email) {
      const existing = await storage.getUserByEmail(data.email);
      if (existing) throw new Error("Email already exists");
    }

    const {
      gstNumber,
      panNumber,
      udyamRegistrationNumber,
      bankAccountDetails,
      gstUrl,
      panUrl,
      aadharUrl,
      cancelledChequeUrl,
      gstCertificateUrl,
      shopLicenseUrl,
      businessLicenseUrl,
      panImageUrl,
      registrationCertificateUrl,
      passbookCancelledChequeUrl,
      ...userData
    } = data;

    const phone = String(userData.phone || "").trim() || `9${String(Date.now()).slice(-9)}`;
    const ownerName = String(userData.ownerName || userData.name || "Vendor").trim();
    const businessName = String(userData.name || userData.businessType || "Vendor Business").trim();

    const userRes = await pool.query(
      `
        INSERT INTO users (phone_number, email, password_hash, user_type, status, is_verified, is_approved, profile_complete)
        VALUES ($1, $2, $3, 'vendor', 'active', true, false, true)
        ON CONFLICT (phone_number)
        DO UPDATE SET
          email = COALESCE(EXCLUDED.email, users.email),
          password_hash = COALESCE(EXCLUDED.password_hash, users.password_hash)
        RETURNING id, phone_number, email, created_at
      `,
      [phone, userData.email || null, userData.password || null]
    );
    const userId = Number(userRes.rows[0].id);

    const profileRes = await pool.query(
      `
        INSERT INTO vendor_profiles (
          user_id,
          business_name,
          owner_name,
          business_address,
          warehouse_address,
          google_maps_location,
          business_type,
          years_of_experience,
          whatsapp_number,
          gst_number,
          verification_status,
          rejection_reason
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', NULL)
        ON CONFLICT (user_id)
        DO UPDATE SET
          business_name = EXCLUDED.business_name,
          owner_name = EXCLUDED.owner_name,
          business_address = EXCLUDED.business_address,
          warehouse_address = EXCLUDED.warehouse_address,
          google_maps_location = EXCLUDED.google_maps_location,
          business_type = EXCLUDED.business_type,
          years_of_experience = EXCLUDED.years_of_experience,
          whatsapp_number = EXCLUDED.whatsapp_number,
          gst_number = COALESCE(EXCLUDED.gst_number, vendor_profiles.gst_number),
          verification_status = 'pending',
          updated_at = NOW()
        RETURNING id, user_id, business_name, owner_name, verification_status, created_at
      `,
      [
        userId,
        businessName,
        ownerName,
        userData.businessAddress || null,
        userData.warehouseAddress || null,
        userData.googleMapsLocation || null,
        userData.businessType || null,
        userData.yearsOfBusinessExperience ? Number(userData.yearsOfBusinessExperience) : null,
        userData.whatsappNumber || null,
        gstNumber || null,
      ]
    );

    const docRows: Array<{ type: string; url?: string | null }> = [
      { type: "gst", url: gstUrl || gstCertificateUrl },
      { type: "pan", url: panUrl || panImageUrl },
      { type: "aadhar", url: aadharUrl },
      { type: "bank_proof", url: cancelledChequeUrl || passbookCancelledChequeUrl },
      { type: "business_license", url: businessLicenseUrl || shopLicenseUrl || registrationCertificateUrl },
    ];

    for (const doc of docRows) {
      if (!doc.url) continue;
      await pool.query(
        `
          INSERT INTO user_documents (user_id, document_type, document_url, status)
          VALUES ($1, $2, $3, 'pending')
        `,
        [userId, doc.type, doc.url]
      );
    }

    if (bankAccountDetails) {
      await pool.query(
        `
          INSERT INTO app_settings (key, value, value_type, description)
          VALUES ($1, $2, 'string', 'Vendor bank details (temporary compatibility)')
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        `,
        [`vendor_bank_${userId}`, bankAccountDetails]
      ).catch(() => {});
    }

    const profile = profileRes.rows[0];
    return {
      id: Number(profile.id),
      userId,
      businessName: profile.business_name,
      ownerName: profile.owner_name,
      phone,
      email: userData.email || null,
      verificationStatus: profile.verification_status || "pending",
      createdAt: profile.created_at,
    };
  }

  // Vendors
  async getPendingVendors() {
    return await storage.getPendingVendors();
  }

  async getAllVendors() {
    return await storage.getAllVendorsWithStatus();
  }

  async getVendorDocuments(vendorId: number) {
    return await storage.getVendorDocuments(vendorId);
  }

  async verifyVendor(id: number) {
    return await storage.verifyVendor(id);
  }

  async rejectVendor(id: number, reason: string) {
    return await storage.rejectVendor(id, reason);
  }

  // Manpower
  async getPendingManpower() {
    return await storage.getPendingManpower();
  }

  async getAllManpower() {
    return await storage.getAllManpowerWithStatus();
  }

  async getManpowerDocuments(workerId: string) {
    return await storage.getManpowerDocuments(workerId);
  }

  async verifyManpowerWorker(id: string) {
    return await storage.verifyManpowerWorker(id);
  }

  async rejectManpowerWorker(id: string, reason: string) {
    return await storage.rejectManpowerWorker(id, reason);
  }

  // Drivers
  async getPendingDrivers() {
    const drivers = await storage.getDrivers();
    return (drivers || [])
      .map((r: any) => {
        const status = String(r?.status || "").toLowerCase();
        const verificationStatus = String(r?.verificationStatus || r?.verification_status || "").toLowerCase();
        const isRejected = !!(r?.isRejected || r?.is_rejected) || verificationStatus === "rejected" || ["suspended", "banned", "inactive"].includes(status);
        const isApproved = !isRejected && (!!(r?.isApproved || r?.is_approved) || verificationStatus === "verified");
        return {
          id: Number(r.id),
          fullName: r.name || r.fullName || `Driver #${r.id}`,
          phone: r.phone || "",
          email: r.email || null,
          licenseNumber: r.licenseNumber || r.license_number || null,
          vehicleType: r.vehicleType || r.vehicle_type || null,
          vehicleNumber: r.vehicleNumber || r.vehicle_number || null,
          vehicleModelId: r.vehicleModelId || r.vehicle_model_id || null,
          vehicleModelName: r.vehicleModelName || r.vehicle_model_name || null,
          vehicleWeight: r.vehicleWeight || r.vehicle_weight || null,
          vehicleDimensions: r.vehicleDimensions || r.vehicle_dimensions || null,
          bodyType: r.bodyType || r.body_type || null,
          location: r.location || null,
          latitude: r.latitude ?? null,
          longitude: r.longitude ?? null,
          isApproved,
          isRejected,
          verificationStatus: isApproved ? "verified" : (isRejected ? "rejected" : "pending"),
          rejectionReason: r.rejectionReason || r.rejection_reason || null,
          createdAt: r.createdAt || r.created_at || null,
        };
      })
      .filter((r: any) => r.verificationStatus === "pending");
  }

  async getAllDrivers() {
    const drivers = await storage.getDrivers();
    return (drivers || []).map((r: any) => {
      const status = String(r?.status || "").toLowerCase();
      const verificationStatus = String(r?.verificationStatus || r?.verification_status || "").toLowerCase();
      const isRejected = !!(r?.isRejected || r?.is_rejected) || verificationStatus === "rejected" || ["suspended", "banned", "inactive"].includes(status);
      const isApproved = !isRejected && (!!(r?.isApproved || r?.is_approved) || verificationStatus === "verified");
      return {
        id: Number(r.id),
        fullName: r.name || r.fullName || `Driver #${r.id}`,
        phone: r.phone || "",
        email: r.email || null,
        licenseNumber: r.licenseNumber || r.license_number || null,
        vehicleType: r.vehicleType || r.vehicle_type || null,
        vehicleNumber: r.vehicleNumber || r.vehicle_number || null,
        vehicleModelId: r.vehicleModelId || r.vehicle_model_id || null,
        vehicleModelName: r.vehicleModelName || r.vehicle_model_name || null,
        vehicleWeight: r.vehicleWeight || r.vehicle_weight || null,
        vehicleDimensions: r.vehicleDimensions || r.vehicle_dimensions || null,
        bodyType: r.bodyType || r.body_type || null,
        location: r.location || null,
        latitude: r.latitude ?? null,
        longitude: r.longitude ?? null,
        isApproved,
        isRejected,
        verificationStatus: isApproved ? "verified" : (isRejected ? "rejected" : "pending"),
        rejectionReason: r.rejectionReason || r.rejection_reason || null,
        createdAt: r.createdAt || r.created_at || null,
      };
    });
  }

  async getDriverDocuments(driverId: number) {
    const normalizeDocValue = (value: unknown): string | null => {
      const text = String(value || "").trim();
      if (!text) return null;
      if (text.startsWith("data:")) {
        const duplicateData = text.indexOf(",data:");
        return duplicateData > 0 ? text.slice(0, duplicateData) : text;
      }
      const commaIdx = text.indexOf(",");
      if (commaIdx > 0 && !text.includes("://")) {
        return text.slice(0, commaIdx).trim();
      }
      if (commaIdx > 0 && text.slice(commaIdx + 1).trim().startsWith("http")) {
        return text.slice(0, commaIdx).trim();
      }
      return text;
    };

    const [profile] = (await pool.query(
      `SELECT user_id FROM driver_profiles WHERE id = $1 LIMIT 1`,
      [driverId]
    ).catch(() => ({ rows: [] as any[] }))).rows;

    const legacy = await storage.getDriverDocuments(driverId);

    if (!profile?.user_id) {
      return legacy || {};
    }

    const docsRows = (await pool.query(
      `
        SELECT
          document_type,
          document_url,
          front_url,
          back_url
        FROM user_documents
        WHERE user_id = $1
      `,
      [profile.user_id]
    ).catch(async () => {
      return await pool.query(
        `SELECT document_type, document_url, NULL::text AS front_url, NULL::text AS back_url FROM user_documents WHERE user_id = $1`,
        [profile.user_id]
      ).catch(() => ({ rows: [] as any[] }));
    })).rows;

    const map = new Map<string, string>();
    for (const row of docsRows || []) {
      const type = String(row?.document_type || "").toLowerCase();
      if (!type) continue;
      const preferred =
        normalizeDocValue((row as any).front_url) ||
        normalizeDocValue((row as any).document_url) ||
        normalizeDocValue((row as any).back_url);

      if (preferred) {
        map.set(type, preferred);
      }
    }

    return {
      ...(legacy || {}),
      photoUrl: normalizeDocValue(legacy?.photoUrl) || map.get('photo') || map.get('profile_photo') || null,
      aadharUrl: normalizeDocValue(legacy?.aadharUrl) || map.get('aadhar') || map.get('aadhaar') || null,
      addressProofUrl: normalizeDocValue(legacy?.addressProofUrl) || map.get('address_proof') || map.get('address') || map.get('pan') || null,
      rcBookUrl: normalizeDocValue(legacy?.rcBookUrl) || map.get('rc_book') || map.get('vehicle_rc') || map.get('registration') || map.get('rc') || null,
      licenseUrl: normalizeDocValue(legacy?.licenseUrl) || map.get('license') || map.get('driving_license') || null,
    };
  }

  async verifyDriver(id: number) {
    await pool.query(`ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE`).catch(() => ({ rows: [] as any[] }));

    await pool.query(
      `
        UPDATE users u
        SET is_approved = true,
            verification_status = 'verified',
            rejection_reason = NULL,
            status = 'active'
        FROM driver_profiles dp
        WHERE dp.id = $1 AND dp.user_id = u.id
      `,
      [id]
    ).catch(() => {});

    await pool.query(`UPDATE driver_profiles SET is_approved = true WHERE id = $1`, [id]).catch(() => ({ rows: [] as any[] }));
    await this.updateDriverDocumentStatuses(id, 'verified');

    const rows = await this.getAllDrivers();
    return rows.find((r: any) => Number(r.id) === Number(id)) || null;
  }

  async rejectDriver(id: number, reason: string) {
    await pool.query(`ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE`).catch(() => ({ rows: [] as any[] }));

    await pool.query(
      `
        UPDATE users u
        SET is_approved = false,
            verification_status = 'rejected',
            rejection_reason = $2,
            status = 'suspended'
        FROM driver_profiles dp
        WHERE dp.id = $1 AND dp.user_id = u.id
      `,
      [id, reason]
    ).catch(() => {});

    await pool.query(`UPDATE driver_profiles SET is_approved = false WHERE id = $1`, [id]).catch(() => ({ rows: [] as any[] }));
    await this.updateDriverDocumentStatuses(id, 'rejected', reason);

    const rows = await this.getAllDrivers();
    return rows.find((r: any) => Number(r.id) === Number(id)) || null;
  }

  private async updateDriverDocumentStatuses(driverId: number, status: 'verified' | 'rejected', reason: string | null = null) {
    const profileResult = await pool.query(
      `SELECT user_id FROM driver_profiles WHERE id = $1 LIMIT 1`,
      [driverId]
    ).catch(() => ({ rows: [] as any[] }));
    const userId = profileResult.rows?.[0]?.user_id;

    await pool.query(
      `UPDATE driver_documentss SET verification_status = $2 WHERE driver_id = $1`,
      [driverId, status]
    ).catch(() => ({ rows: [] as any[] }));

    if (!userId) return;

    await pool.query(
      `
        UPDATE user_documents
        SET status = $2
        WHERE user_id = $1
          AND document_type IN ('aadhar', 'aadhaar', 'pan', 'license', 'driving_license', 'rc', 'rc_book', 'vehicle_rc', 'registration')
      `,
      [userId, status]
    ).catch(() => ({ rows: [] as any[] }));

    await pool.query(
      `
        UPDATE user_documents
        SET verification_status = $2
        WHERE user_id = $1
          AND document_type IN ('aadhar', 'aadhaar', 'pan', 'license', 'driving_license', 'rc', 'rc_book', 'vehicle_rc', 'registration')
      `,
      [userId, status]
    ).catch(() => ({ rows: [] as any[] }));

    await pool.query(
      `
        UPDATE user_documents
        SET rejection_reason = $2
        WHERE user_id = $1
          AND document_type IN ('aadhar', 'aadhaar', 'pan', 'license', 'driving_license', 'rc', 'rc_book', 'vehicle_rc', 'registration')
      `,
      [userId, reason]
    ).catch(() => ({ rows: [] as any[] }));
  }
}

export const onboardingService = new OnboardingService();
