ALTER TABLE `block` ADD `tables` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
DROP INDEX `block_shape`;--> statement-breakpoint
CREATE UNIQUE INDEX `block_shape` ON `block` (`history`,`database_name`,`clause`,`shape`,`tables`);
