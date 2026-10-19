CREATE TABLE `store_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`request_id` text NOT NULL,
	`reporter_hash` text NOT NULL,
	`category` text NOT NULL,
	`detail` text NOT NULL,
	`contact` text DEFAULT '' NOT NULL,
	`order_reference` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text NOT NULL,
	`reviewed_at` text,
	`reviewed_by` text,
	`resolution` text DEFAULT '' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `store_reports_request_idx` ON `store_reports` (`restaurant_id`,`reporter_hash`,`request_id`);--> statement-breakpoint
CREATE INDEX `store_reports_queue_idx` ON `store_reports` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `store_verification_events` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`reason` text NOT NULL,
	`identity_hash` text NOT NULL,
	`version` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `store_verification_events_version_idx` ON `store_verification_events` (`restaurant_id`,`version`);--> statement-breakpoint
CREATE TABLE `store_verifications` (
	`restaurant_id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`identity_hash` text NOT NULL,
	`identity_json` text NOT NULL,
	`request_note` text NOT NULL,
	`requested_at` text NOT NULL,
	`reviewed_at` text,
	`reviewed_by` text,
	`reason` text DEFAULT '' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `store_verifications_queue_idx` ON `store_verifications` (`status`,`requested_at`);