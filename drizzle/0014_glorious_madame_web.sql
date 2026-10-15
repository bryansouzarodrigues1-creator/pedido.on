CREATE TABLE `ai_budget_reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`kind` text NOT NULL,
	`period_key` text NOT NULL,
	`budget_period` text NOT NULL,
	`cohort` text NOT NULL,
	`units` integer NOT NULL,
	`state` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ai_budget_month_idx` ON `ai_budget_reservations` (`budget_period`,`state`);--> statement-breakpoint
CREATE INDEX `ai_budget_owner_idx` ON `ai_budget_reservations` (`owner_id`,`period_key`);--> statement-breakpoint
ALTER TABLE `image_jobs` ADD `promotion_id` text;--> statement-breakpoint
ALTER TABLE `image_jobs` ADD `source_version` text;--> statement-breakpoint
ALTER TABLE `account_access` ADD `catalog_version` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `asaas_intents` ADD `catalog_version` integer DEFAULT 1 NOT NULL;