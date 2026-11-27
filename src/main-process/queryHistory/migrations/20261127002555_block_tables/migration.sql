ALTER TABLE `block` ADD `tables` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
UPDATE `block` SET `tables` = (SELECT json_group_array(`table`) FROM (SELECT DISTINCT `value` AS `table` FROM json_each(`block`.`aliases`) ORDER BY `table`));--> statement-breakpoint
DROP INDEX `block_shape`;--> statement-breakpoint
CREATE UNIQUE INDEX `block_shape` ON `block` (`history`,`database_name`,`clause`,`shape`,`tables`);
