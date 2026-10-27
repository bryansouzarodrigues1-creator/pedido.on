CREATE TABLE `trial_campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`restaurant_id` text NOT NULL,
	`trial_started` integer NOT NULL,
	`round` integer NOT NULL,
	`source_version` text NOT NULL,
	`snapshot` text NOT NULL,
	`brief` text NOT NULL,
	`text_request` text NOT NULL,
	`image_requests` text NOT NULL,
	`proposal` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `trial_campaign_owner_round_idx` ON `trial_campaigns` (`owner_id`,`trial_started`,`round`);--> statement-breakpoint
ALTER TABLE `account_access` ADD `tier` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `asaas_intents` ADD `first_due_date` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `image_jobs` ADD `campaign_key` text DEFAULT '' NOT NULL;