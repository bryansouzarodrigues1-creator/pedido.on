CREATE TABLE `image_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`restaurant_id` text NOT NULL,
	`request_id` text NOT NULL,
	`input_hash` text NOT NULL,
	`token_hash` text NOT NULL,
	`prompt` text NOT NULL,
	`asset` text NOT NULL,
	`state` text NOT NULL,
	`period_key` text NOT NULL,
	`result_url` text,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `image_jobs_request_idx` ON `image_jobs` (`owner_id`,`restaurant_id`,`request_id`);--> statement-breakpoint
CREATE INDEX `image_jobs_owner_period_idx` ON `image_jobs` (`owner_id`,`period_key`);--> statement-breakpoint
CREATE INDEX `image_jobs_created_idx` ON `image_jobs` (`created_at`);