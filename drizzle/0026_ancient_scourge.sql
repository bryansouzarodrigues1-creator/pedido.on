CREATE TABLE `ai_job_receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`restaurant_id` text NOT NULL,
	`kind` text NOT NULL,
	`purpose` text NOT NULL,
	`provider` text NOT NULL,
	`model` text,
	`input_tokens` integer,
	`output_tokens` integer,
	`cost_microusd` integer,
	`response_status` integer,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ai_receipts_shop_time_idx` ON `ai_job_receipts` (`restaurant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `ai_receipts_owner_time_idx` ON `ai_job_receipts` (`owner_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `account_trials` ADD `offer_version` integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE `asaas_payments` ADD `net_amount` integer;--> statement-breakpoint
ALTER TABLE `asaas_payments` ADD `payment_date` text;