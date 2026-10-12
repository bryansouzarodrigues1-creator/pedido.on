CREATE TABLE `push_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`subscription_id` text NOT NULL,
	`event_id` text NOT NULL,
	`payload` text NOT NULL,
	`state` text DEFAULT 'queued' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`available_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`last_status` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`subscription_id`) REFERENCES `push_subscriptions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_deliveries_event_idx` ON `push_deliveries` (`event_id`,`subscription_id`);--> statement-breakpoint
CREATE INDEX `push_deliveries_pending_idx` ON `push_deliveries` (`owner_id`,`state`,`available_at`);--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`endpoint_hash` text NOT NULL,
	`sealed_subscription` text NOT NULL,
	`session_id` text,
	`public_key_hash` text NOT NULL,
	`orders` integer DEFAULT 1 NOT NULL,
	`messages` integer DEFAULT 1 NOT NULL,
	`delivery` integer DEFAULT 1 NOT NULL,
	`expires_at` integer NOT NULL,
	`last_status` integer,
	`last_sent_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_subscriptions_endpoint_hash_unique` ON `push_subscriptions` (`endpoint_hash`);--> statement-breakpoint
CREATE INDEX `push_subscriptions_owner_idx` ON `push_subscriptions` (`owner_id`,`expires_at`);