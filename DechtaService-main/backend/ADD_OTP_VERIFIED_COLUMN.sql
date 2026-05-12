-- Quick fix: Add missing otp_verified column to delivery_trips
ALTER TABLE IF EXISTS delivery_trips
ADD COLUMN IF NOT EXISTS otp_verified BOOLEAN DEFAULT FALSE;

-- Also add other potentially missing columns
ALTER TABLE IF EXISTS delivery_trips
ADD COLUMN IF NOT EXISTS delivery_otp VARCHAR(4);

ALTER TABLE IF EXISTS delivery_trips
ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(15, 2) DEFAULT 0.00;

ALTER TABLE IF EXISTS delivery_trips
ADD COLUMN IF NOT EXISTS distance_text VARCHAR(50);

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'delivery_trips' 
ORDER BY ordinal_position;

SELECT 'Columns added successfully!' AS status;
