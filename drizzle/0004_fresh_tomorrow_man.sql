CREATE TABLE `order_events` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`version` integer NOT NULL,
	`actor_id` text,
	`action` text NOT NULL,
	`message` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `order_events_version_idx` ON `order_events` (`order_id`,`version`);--> statement-breakpoint
CREATE TABLE `order_receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`object_key` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `order_receipts_object_key_unique` ON `order_receipts` (`object_key`);--> statement-breakpoint
CREATE INDEX `order_receipts_order_idx` ON `order_receipts` (`order_id`);--> statement-breakpoint
ALTER TABLE `orders` ADD `tracking_hash` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `payment_status` text DEFAULT 'pay_on_delivery' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `pix_snapshot` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `receipt_id` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `receipt_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `version` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `estimated_at` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `approved_at` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `decision_reason` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `updated_at` text;