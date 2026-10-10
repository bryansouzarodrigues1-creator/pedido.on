CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`request_id` text NOT NULL,
	`customer` text NOT NULL,
	`phone` text NOT NULL,
	`data` text NOT NULL,
	`total` integer NOT NULL,
	`status` text DEFAULT 'awaiting' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `orders_restaurant_idx` ON `orders` (`restaurant_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_request_idx` ON `orders` (`restaurant_id`,`request_id`);--> statement-breakpoint
CREATE TABLE `restaurants` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`data` text NOT NULL,
	`published_data` text,
	`revision` integer DEFAULT 1 NOT NULL,
	`live_revision` integer DEFAULT 0 NOT NULL,
	`published` integer DEFAULT false NOT NULL,
	`plan` text DEFAULT 'essencial' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `restaurants_slug_unique` ON `restaurants` (`slug`);--> statement-breakpoint
CREATE INDEX `restaurants_owner_idx` ON `restaurants` (`owner_id`);