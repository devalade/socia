ALTER TABLE `hypotheses` ADD `is_current` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `investigations` ADD `conclusion_justification` text DEFAULT '' NOT NULL;