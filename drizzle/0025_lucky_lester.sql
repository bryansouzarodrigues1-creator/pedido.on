CREATE TABLE `assistant_conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`expires_at` integer NOT NULL,
	`pending_request` text,
	`pending_until` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `assistant_conversations_shop_idx` ON `assistant_conversations` (`restaurant_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `assistant_conversations_expiry_idx` ON `assistant_conversations` (`expires_at`);--> statement-breakpoint
CREATE TABLE `assistant_turns` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`request_id` text NOT NULL,
	`input_hash` text NOT NULL,
	`question` text NOT NULL,
	`answer` text,
	`state` text NOT NULL,
	`source` text DEFAULT 'local' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `assistant_conversations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assistant_turns_request_idx` ON `assistant_turns` (`conversation_id`,`request_id`);--> statement-breakpoint
CREATE INDEX `assistant_turns_conversation_idx` ON `assistant_turns` (`conversation_id`,`created_at`);