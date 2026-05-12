-- Database Schema Check Query
-- Run this to see which tables exist and which are missing
-- Copy output and paste it back

SELECT 
  table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = t.table_name
    ) THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END AS status
FROM (
  VALUES 
    -- Core Tables
    ('users'),
    ('orders'),
    ('delivery_trips'),
    ('otp_verification'),
    ('addresses'),
    ('location_updates'),
    ('bank_accounts'),
    ('user_documents'),
    ('jobs'),
    ('catalog_items'),
    ('products'),
    ('vendor_inventory'),
    ('vehicles'),
    ('deliveries'),
    ('wallets'),
    ('transactions'),
    ('ratings'),
    ('support_tickets'),
    ('conversations'),
    ('messages'),
    ('notifications'),
    ('vehicle_pricing'),
    ('service_pricing'),
    ('banners'),
    ('app_settings'),
    ('admin_profiles'),
    ('admin_activity_logs'),
    
    -- Driver Tables
    ('driver_profiles'),
    ('driver_stats'),
    ('driver_vehicles'),
    ('driver_bank_accounts'),
    ('driver_documentss'),
    ('driver_wallets'),
    ('driver_transactions'),
    ('driver_notifications'),
    ('driver_gps_locations'),
    ('driver_chat_messages'),
    ('driver_package_photos'),
    ('driver_login_sessions'),
    ('driver_leaderboard_cache'),
    ('driver_referrals'),
    ('driver_ads'),
    ('driver_achievements'),
    ('driver_sos_alerts'),
    ('driver_order_ignores'),
    ('driver_notification_prefs'),
    ('aviation_ranks'),
    ('driver_payment_orders'),
    ('driver_withdrawal_requests'),
    ('driver_support_tickets'),
    
    -- Vendor Tables
    ('vendors'),
    ('vendor_profiles'),
    ('vendor_products'),
    ('vendor_invoices'),
    ('vendor_wallets'),
    ('vendor_payment_orders'),
    ('vendor_withdrawals'),
    ('vendor_settlements'),
    ('vendor_support_tickets'),
    ('vendor_queries')
) AS t(table_name)
ORDER BY status DESC, table_name;
