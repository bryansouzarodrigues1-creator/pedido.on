CREATE TABLE `account_activity` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`area` text NOT NULL,
	`day` text NOT NULL,
	`opens` integer DEFAULT 0 NOT NULL,
	`actions` integer DEFAULT 0 NOT NULL,
	`first_at` text NOT NULL,
	`last_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_activity_day_idx` ON `account_activity` (`owner_id`,`area`,`day`);--> statement-breakpoint
CREATE INDEX `account_activity_time_idx` ON `account_activity` (`last_at`);