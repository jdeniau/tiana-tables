CREATE TABLE `block` (
	`id` integer PRIMARY KEY,
	`history` text NOT NULL,
	`database_name` text NOT NULL,
	`clause` text NOT NULL,
	`shape` text NOT NULL,
	`sql` text NOT NULL,
	`aliases` text NOT NULL,
	`run_count` integer NOT NULL,
	`last_run_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `run` (
	`id` integer PRIMARY KEY,
	`statement_id` integer NOT NULL,
	`sql` text NOT NULL,
	`ran_at` integer NOT NULL,
	CONSTRAINT `fk_run_statement_id_statement_id_fk` FOREIGN KEY (`statement_id`) REFERENCES `statement`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `statement` (
	`id` integer PRIMARY KEY,
	`history` text NOT NULL,
	`database_name` text NOT NULL,
	`shape` text NOT NULL,
	`run_count` integer NOT NULL,
	`last_run_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `block_shape` ON `block` (`history`,`database_name`,`clause`,`shape`);--> statement-breakpoint
CREATE UNIQUE INDEX `run_text` ON `run` (`statement_id`,`sql`);--> statement-breakpoint
CREATE UNIQUE INDEX `statement_shape` ON `statement` (`history`,`database_name`,`shape`);