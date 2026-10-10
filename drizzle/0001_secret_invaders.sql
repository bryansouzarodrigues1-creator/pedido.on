CREATE TABLE `billing_events` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`subscription_id` text NOT NULL,
	`plan` text NOT NULL,
	`status` text NOT NULL,
	`period_end` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_subscription_id_unique` ON `subscriptions` (`subscription_id`);