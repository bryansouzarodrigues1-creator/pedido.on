CREATE TABLE `asaas_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`environment` text NOT NULL,
	`customer_id` text NOT NULL,
	`document_hash` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `asaas_accounts_customer_idx` ON `asaas_accounts` (`environment`,`customer_id`);
--> statement-breakpoint
CREATE TABLE `asaas_events` (
	`id` text PRIMARY KEY NOT NULL,
	`resource_id` text NOT NULL,
	`event` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `asaas_intents` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`environment` text NOT NULL,
	`active_key` text,
	`plan` text NOT NULL,
	`reference` text NOT NULL,
	`document_hash` text NOT NULL,
	`state` text DEFAULT 'new' NOT NULL,
	`customer_id` text DEFAULT '' NOT NULL,
	`subscription_id` text DEFAULT '' NOT NULL,
	`lease_token` text DEFAULT '' NOT NULL,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `asaas_intents_active_key_unique` ON `asaas_intents` (`active_key`);
--> statement-breakpoint
CREATE UNIQUE INDEX `asaas_intents_reference_unique` ON `asaas_intents` (`reference`);
--> statement-breakpoint
CREATE INDEX `asaas_intents_owner_idx` ON `asaas_intents` (`owner_id`,`environment`);
--> statement-breakpoint
CREATE TABLE `asaas_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`subscription_key` text NOT NULL,
	`remote_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`status` text NOT NULL,
	`amount` integer NOT NULL,
	`due_date` text NOT NULL,
	`invoice_url` text DEFAULT '' NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`subscription_key`) REFERENCES `asaas_subscriptions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `asaas_payments_subscription_idx` ON `asaas_payments` (`subscription_key`,`due_date`);
--> statement-breakpoint
CREATE TABLE `asaas_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`environment` text NOT NULL,
	`remote_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`intent_id` text NOT NULL,
	`plan` text NOT NULL,
	`status` text NOT NULL,
	`paid_through` integer DEFAULT 0 NOT NULL,
	`paid_plan` text DEFAULT '' NOT NULL,
	`sync_token` text DEFAULT '' NOT NULL,
	`sync_until` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`intent_id`) REFERENCES `asaas_intents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `asaas_subscriptions_remote_idx` ON `asaas_subscriptions` (`environment`,`remote_id`);
--> statement-breakpoint
CREATE INDEX `asaas_subscriptions_owner_idx` ON `asaas_subscriptions` (`owner_id`,`environment`);
