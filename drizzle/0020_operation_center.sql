CREATE TABLE `account_notices` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`event_key` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`path` text NOT NULL,
	`created_at` text NOT NULL,
	`read_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_notices_event_idx` ON `account_notices` (`owner_id`,`event_key`);--> statement-breakpoint
CREATE INDEX `account_notices_owner_idx` ON `account_notices` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `operation_errors` (
	`id` text PRIMARY KEY NOT NULL,
	`area` text NOT NULL,
	`code` text NOT NULL,
	`day` text NOT NULL,
	`hits` integer DEFAULT 1 NOT NULL,
	`last_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `operation_errors_day_idx` ON `operation_errors` (`area`,`code`,`day`);--> statement-breakpoint
CREATE TABLE `site_visits` (
	`id` text PRIMARY KEY NOT NULL,
	`visitor_hash` text NOT NULL,
	`page` text NOT NULL,
	`day` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `site_visits_day_idx` ON `site_visits` (`visitor_hash`,`page`,`day`);--> statement-breakpoint
CREATE INDEX `site_visits_time_idx` ON `site_visits` (`created_at`);