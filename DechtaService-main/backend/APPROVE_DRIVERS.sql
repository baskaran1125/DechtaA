/**
 * Direct SQL approach to approve drivers
 * Run directly in PostgreSQL:
 */

-- Approve ALL drivers (simplest approach)
UPDATE driver_profiles 
SET is_approved = true, is_online = true
WHERE is_approved = false;

-- Or approve specific drivers by mobile number
UPDATE driver_profiles 
SET is_approved = true, is_online = true
WHERE mobile_number IN ('9111111111', '9222222222');

-- Verify the update
SELECT id, full_name, mobile_number, is_approved, is_online
FROM driver_profiles
ORDER BY created_at DESC
LIMIT 5;
