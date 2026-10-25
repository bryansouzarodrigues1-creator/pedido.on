CREATE TABLE `admin_shared_menus` (
	`id` text PRIMARY KEY NOT NULL,
	`created_by` text NOT NULL,
	`request_id` text NOT NULL,
	`content_hash` text NOT NULL,
	`label` text NOT NULL,
	`object_key` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`disabled_at` integer,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_shared_menus_request_idx` ON `admin_shared_menus` (`request_id`);--> statement-breakpoint
CREATE INDEX `admin_shared_menus_created_idx` ON `admin_shared_menus` (`created_at`);