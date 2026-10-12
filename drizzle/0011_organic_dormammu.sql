CREATE TABLE `account_trials` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`registered_at` text NOT NULL,
	`started_at` integer,
	`ends_at` integer
);
