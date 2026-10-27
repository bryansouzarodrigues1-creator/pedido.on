CREATE TABLE `restaurant_support` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`request_id` text NOT NULL,
	`input_hash` text NOT NULL,
	`actor_id` text NOT NULL,
	`actor_role` text NOT NULL,
	`kind` text NOT NULL,
	`asset` text NOT NULL,
	`product_id` text DEFAULT '' NOT NULL,
	`message` text NOT NULL,
	`url` text DEFAULT '' NOT NULL,
	`state` text DEFAULT 'available' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`updated_by` text NOT NULL,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `restaurant_support_request_idx` ON `restaurant_support` (`restaurant_id`,`request_id`);--> statement-breakpoint
CREATE INDEX `restaurant_support_history_idx` ON `restaurant_support` (`restaurant_id`,`created_at`,`id`);