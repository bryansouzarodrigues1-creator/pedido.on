CREATE TABLE `menu_import_assistance` (
 `id` text PRIMARY KEY NOT NULL,
 `restaurant_id` text NOT NULL,
 `owner_id` text NOT NULL,
 `store_url` text NOT NULL,
 `owner_note` text DEFAULT '' NOT NULL,
 `status` text DEFAULT 'requested' NOT NULL,
 `capture_json` text,
 `pairing_hash` text,
 `pairing_expires_at` integer,
 `created_at` text NOT NULL,
 `updated_at` text NOT NULL,
 `received_at` text,
 FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `menu_import_assistance_status_idx` ON `menu_import_assistance` (`status`,`created_at`);
--> statement-breakpoint
CREATE INDEX `menu_import_assistance_owner_idx` ON `menu_import_assistance` (`owner_id`,`created_at`);
