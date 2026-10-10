CREATE TABLE `billing_customers` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `billing_customers_customer_id_unique` ON `billing_customers` (`customer_id`);