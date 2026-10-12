ALTER TABLE `delivery_checks` ADD `neighborhood` text;--> statement-breakpoint
ALTER TABLE `delivery_checks` ADD `zone_id` text;--> statement-breakpoint
ALTER TABLE `delivery_checks` ADD `delivery_fee` integer;--> statement-breakpoint
ALTER TABLE `orders` ADD `accepted_at` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `accepted_eta_minutes` integer;