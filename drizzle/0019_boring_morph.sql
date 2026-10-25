CREATE TABLE `platform_maintenance_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`cursor` text DEFAULT '' NOT NULL,
	`media_deleted` integer DEFAULT 0 NOT NULL,
	`report_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	`completed_at` text
);
