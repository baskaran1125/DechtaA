-- Create delivery_trips table for tracking driver deliveries
CREATE TABLE IF NOT EXISTS delivery_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  driver_id BIGINT NOT NULL,
  status VARCHAR(50) DEFAULT 'accepted',
  payout_amount NUMERIC(15, 2) DEFAULT 0.00,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  arrived_pickup_at TIMESTAMPTZ,
  departed_pickup_at TIMESTAMPTZ,
  arrived_dropoff_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(order_id, driver_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_delivery_trips_driver_id ON delivery_trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_trips_order_id ON delivery_trips(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_trips_status ON delivery_trips(status);
CREATE INDEX IF NOT EXISTS idx_delivery_trips_driver_status ON delivery_trips(driver_id, status);
CREATE INDEX IF NOT EXISTS idx_delivery_trips_started_at ON delivery_trips(started_at DESC);
