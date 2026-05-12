import pg from 'pg';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const tables = [
  `CREATE TABLE IF NOT EXISTS "app_settings" ("id" serial PRIMARY KEY NOT NULL,"key" text NOT NULL,"value" text NOT NULL,"updated_at" timestamp DEFAULT now(),CONSTRAINT "app_settings_key_unique" UNIQUE("key"))`,
  `CREATE TABLE IF NOT EXISTS "banners" ("id" serial PRIMARY KEY NOT NULL,"title" text NOT NULL,"subtitle" text,"image_url" text NOT NULL,"link_url" text,"target_pages" text DEFAULT 'all' NOT NULL,"position" text DEFAULT 'hero' NOT NULL,"active" text DEFAULT 'true' NOT NULL,"display_order" integer DEFAULT 0 NOT NULL,"start_date" timestamp,"end_date" timestamp,"created_at" timestamp DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS "catalog_items" ("id" serial PRIMARY KEY NOT NULL,"name" text NOT NULL,"category" text NOT NULL,"description" text NOT NULL,"image_url" text,"brand" text,"detailed_description" text,"product_quality" text,"warranty" text,"hsn_code" text,"stock" integer DEFAULT 0,"unit" text DEFAULT 'pcs',"is_bulk" boolean DEFAULT false,"bulk_discount" numeric,"mrp" numeric,"selling_price" numeric,"gst_percent" numeric DEFAULT '18',"length_cm" numeric,"width_cm" numeric,"height_cm" numeric,"weight_kg" numeric,"self_delivery" boolean DEFAULT false,"vehicle_type" text,"active" boolean DEFAULT true,"created_at" timestamp DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS "clients" ("id" serial PRIMARY KEY NOT NULL,"name" text NOT NULL,"email" text NOT NULL,"phone" text NOT NULL,"company" text,"area" text NOT NULL,"address" text,"service_type" text NOT NULL,"created_at" timestamp DEFAULT now(),CONSTRAINT "clients_email_unique" UNIQUE("email"))`,
  `CREATE TABLE IF NOT EXISTS "support_tickets" ("id" serial PRIMARY KEY NOT NULL,"user_id" integer NOT NULL,"subject" text NOT NULL,"description" text NOT NULL,"status" text DEFAULT 'open' NOT NULL,"priority" text DEFAULT 'medium' NOT NULL,"created_at" timestamp DEFAULT now(),"updated_at" timestamp DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS "conversations" ("id" serial PRIMARY KEY NOT NULL,"participant1_type" text NOT NULL,"participant1_id" text NOT NULL,"participant2_type" text NOT NULL,"participant2_id" text NOT NULL,"title" text,"conversation_type" text DEFAULT 'direct' NOT NULL,"support_ticket_id" integer,"related_entity_type" text,"related_entity_id" integer,"last_message_at" timestamp,"status" text DEFAULT 'active' NOT NULL,"created_at" timestamp DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS "driver_documents" ("id" serial PRIMARY KEY NOT NULL,"driver_id" integer NOT NULL,"photo_url" text,"aadhar_url" text,"address_proof_url" text,"rc_book_url" text,"license_url" text,"created_at" timestamp DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS "drivers" ("id" serial PRIMARY KEY NOT NULL,"name" text NOT NULL,"email" text NOT NULL,"phone" text NOT NULL,"vehicle_type" text NOT NULL,"vehicle_number" text NOT NULL,"license_number" text NOT NULL,"status" text DEFAULT 'active' NOT NULL,"photo_url" text,"driver_type" text,"bank_account_number" text,"bank_ifsc" text,"bank_name" text,"bank_branch" text,"location" text,"service_rating" numeric DEFAULT '0',"created_at" timestamp DEFAULT now(),CONSTRAINT "drivers_email_unique" UNIQUE("email"))`,
  `CREATE TABLE IF NOT EXISTS "jobs" ("id" serial PRIMARY KEY NOT NULL,"client_id" integer NOT NULL,"title" text NOT NULL,"description" text NOT NULL,"job_type" text NOT NULL,"status" text DEFAULT 'pending' NOT NULL,"assigned_driver_id" integer,"assigned_worker_id" uuid,"deadline" timestamp,"created_at" timestamp DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS "location_updates" ("id" serial PRIMARY KEY NOT NULL,"entity_type" text NOT NULL,"entity_id" text NOT NULL,"latitude" numeric NOT NULL,"longitude" numeric NOT NULL,"heading" numeric DEFAULT '0',"speed" numeric DEFAULT '0',"updated_at" timestamp with time zone DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS "manpower_pricing" ("id" serial PRIMARY KEY NOT NULL,"service_category" text NOT NULL,"service_name" text NOT NULL,"service_code" text NOT NULL,"description" text,"base_price" numeric NOT NULL,"rate_per_hour" numeric NOT NULL,"min_hours" numeric DEFAULT '1',"estimated_duration" text,"is_active" boolean DEFAULT true,"created_at" timestamp DEFAULT now(),"updated_at" timestamp DEFAULT now(),CONSTRAINT "manpower_pricing_service_code_unique" UNIQUE("service_code"))`,
  `CREATE TABLE IF NOT EXISTS "messages" ("id" serial PRIMARY KEY NOT NULL,"conversation_id" integer NOT NULL,"sender_type" text NOT NULL,"sender_id" text NOT NULL,"content" text NOT NULL,"message_type" text DEFAULT 'text' NOT NULL,"file_url" text,"file_name" text,"read_at" timestamp,"created_at" timestamp DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS "notifications" ("id" serial PRIMARY KEY NOT NULL,"title" text NOT NULL,"message" text NOT NULL,"target_app" text NOT NULL,"target_users" text,"type" text DEFAULT 'info' NOT NULL,"image_url" text,"link_url" text,"scheduled_at" timestamp,"sent_at" timestamp,"status" text DEFAULT 'draft' NOT NULL,"created_by" integer,"created_at" timestamp DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS "notification_reads" ("id" serial PRIMARY KEY NOT NULL,"notification_id" integer NOT NULL,"user_id" integer NOT NULL,"read_at" timestamp DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS "orders" ("id" serial PRIMARY KEY NOT NULL,"user_id" integer NOT NULL,"product_id" integer NOT NULL,"quantity" integer NOT NULL,"status" text DEFAULT 'pending' NOT NULL,"assigned_driver_id" integer)`,
  `CREATE TABLE IF NOT EXISTS "products" ("id" serial PRIMARY KEY NOT NULL,"vendor_id" integer NOT NULL,"catalog_item_id" integer NOT NULL,"price" numeric NOT NULL,"selling_price" numeric DEFAULT '0',"hsn_code" text,"gst" numeric DEFAULT '0',"stock" integer DEFAULT 0,"approval_status" text DEFAULT 'pending' NOT NULL,"rejection_reason" text)`,
  `CREATE TABLE IF NOT EXISTS "typing_indicators" ("id" serial PRIMARY KEY NOT NULL,"conversation_id" integer NOT NULL,"user_type" text NOT NULL,"user_id" text NOT NULL,"last_typing_at" timestamp DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS "users" ("id" serial PRIMARY KEY NOT NULL,"name" text NOT NULL,"email" text NOT NULL,"password" text NOT NULL,"role" text NOT NULL,"verification_status" text DEFAULT 'verified' NOT NULL,"rejection_reason" text,"phone" text,"owner_name" text,"whatsapp_number" text,"business_address" text,"warehouse_address" text,"google_maps_location" text,"years_of_business_experience" text,"business_type" text,"created_at" timestamp DEFAULT now(),CONSTRAINT "users_email_unique" UNIQUE("email"))`,
  `CREATE TABLE IF NOT EXISTS "vehicle_pricing" ("id" serial PRIMARY KEY NOT NULL,"vehicle_type" text NOT NULL,"display_name" text NOT NULL,"base_fare" numeric NOT NULL,"rate_per_km" numeric NOT NULL,"min_km" numeric DEFAULT '0',"is_active" boolean DEFAULT true,"created_at" timestamp DEFAULT now(),"updated_at" timestamp DEFAULT now(),CONSTRAINT "vehicle_pricing_vehicle_type_unique" UNIQUE("vehicle_type"))`,
  `CREATE TABLE IF NOT EXISTS "vendor_documents" ("id" serial PRIMARY KEY NOT NULL,"vendor_id" integer NOT NULL,"gst_number" text,"pan_number" text,"udyam_registration_number" text,"bank_account_details" text,"gst_url" text,"pan_url" text,"aadhar_url" text,"cancelled_cheque_url" text,"gst_certificate_url" text,"shop_license_url" text,"business_license_url" text,"pan_image_url" text,"registration_certificate_url" text,"passbook_cancelled_cheque_url" text,"created_at" timestamp DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS "wallets" ("worker_id" uuid PRIMARY KEY NOT NULL,"total_earned" numeric DEFAULT '0',"platform_fees" numeric DEFAULT '0',"wallet_balance" numeric DEFAULT '0',"updated_at" timestamp with time zone DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS "worker_details" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,"worker_id" uuid NOT NULL,"skill_name" text,"experience" text,"category" text)`,
  `CREATE TABLE IF NOT EXISTS "worker_skills" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,"full_name" text NOT NULL,"phone" text NOT NULL,"state" text,"city" text,"area" text,"referral_code" text,"rating" numeric DEFAULT '0',"reviews_count" numeric DEFAULT '0',"is_approved" boolean DEFAULT false,"is_online" boolean DEFAULT false,"is_frozen" boolean DEFAULT false,"approved_by" uuid,"qualification" text,"aadhar_number" text,"pan_number" text,"service_address" text,"bank_account_number" text,"bank_ifsc" text,"bank_name" text,"bank_branch" text,"created_at" timestamp with time zone DEFAULT now(),"updated_at" timestamp with time zone DEFAULT now())`,
];

const fks = [
  `ALTER TABLE "conversations" ADD CONSTRAINT "conversations_support_ticket_id_support_tickets_id_fk" FOREIGN KEY ("support_ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE no action ON UPDATE no action`,
  `ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action`,
  `ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE no action ON UPDATE no action`,
  `ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action`,
  `ALTER TABLE "notifications" ADD CONSTRAINT "notifications_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action`,
  `ALTER TABLE "typing_indicators" ADD CONSTRAINT "typing_indicators_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action`,
];

async function run() {
  const client = await pool.connect();
  let created = 0, skipped = 0, errors = 0;
  try {
    for (const sql of tables) {
      try {
        await client.query(sql);
        const name = sql.match(/"(\w+)"/)?.[1];
        console.log(`  OK  ${name}`);
        created++;
      } catch (e) {
        console.error(`  ERR ${e.message.split('\n')[0]}`);
        errors++;
      }
    }
    for (const sql of fks) {
      try {
        await client.query(sql);
      } catch (e) {
        if (!e.message.includes('already exists')) {
          console.error(`  FK ERR: ${e.message.split('\n')[0]}`);
        }
      }
    }
    console.log(`\nDone — ${created} tables ensured, ${errors} errors.`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
