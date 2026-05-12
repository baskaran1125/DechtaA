import { pool } from "./db";
async function main() {
    console.log("Creating new chat tables...");
    const q = `
CREATE TABLE IF NOT EXISTS "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"participant1_type" text NOT NULL,
	"participant1_id" text NOT NULL,
	"participant2_type" text NOT NULL,
	"participant2_id" text NOT NULL,
	"title" text,
	"conversation_type" text DEFAULT 'direct' NOT NULL,
	"support_ticket_id" integer,
	"related_entity_type" text,
	"related_entity_id" integer,
	"last_message_at" timestamp,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"sender_type" text NOT NULL,
	"sender_id" text NOT NULL,
	"content" text NOT NULL,
	"message_type" text DEFAULT 'text' NOT NULL,
	"file_url" text,
	"file_name" text,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "typing_indicators" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"user_type" text NOT NULL,
	"user_id" text NOT NULL,
	"last_typing_at" timestamp DEFAULT now()
);

DO $$ BEGIN
 ALTER TABLE "conversations" ADD CONSTRAINT "conversations_support_ticket_id_support_tickets_id_fk" FOREIGN KEY ("support_ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "typing_indicators" ADD CONSTRAINT "typing_indicators_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
  `;
    try {
        await pool.query(q);
        console.log("Done!");
    }
    catch (err) {
        console.error(err);
    }
    finally {
        process.exit(0);
    }
}
main();
