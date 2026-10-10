CREATE TABLE `account_profiles` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`provider` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ai_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`restaurant_id` text NOT NULL,
	`input_hash` text NOT NULL,
	`usage_id` text NOT NULL,
	`state` text NOT NULL,
	`credits` integer NOT NULL,
	`result` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ai_jobs_owner_idx` ON `ai_jobs` (`owner_id`);--> statement-breakpoint
CREATE INDEX `ai_jobs_created_idx` ON `ai_jobs` (`created_at`);--> statement-breakpoint
CREATE TABLE `ai_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`period_key` text NOT NULL,
	`credits` integer DEFAULT 0 NOT NULL,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_usage_owner_period_idx` ON `ai_usage` (`owner_id`,`period_key`);--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`scope` text NOT NULL,
	`sealed_tokens` text NOT NULL,
	`token_expires_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`refresh_lock` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `auth_sessions_owner_idx` ON `auth_sessions` (`owner_id`);--> statement-breakpoint
CREATE INDEX `auth_sessions_expiry_idx` ON `auth_sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `rate_buckets` (
	`id` text PRIMARY KEY NOT NULL,
	`hits` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `rate_buckets_expiry_idx` ON `rate_buckets` (`expires_at`);--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `paid_plan` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `paid_through` integer DEFAULT 0 NOT NULL;