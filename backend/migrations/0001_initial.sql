-- Users, sessions, trusted browsers, habits with their daily log, and goals.
-- Every id is a uuid from the backend (crypto.randomUUID). Every DATETIME is
-- UTC and written by the backend; `updated_at` has no default, so a write that
-- forgets it fails instead of leaving it stale.

CREATE TABLE `users` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    -- Always stored lower-cased and trimmed; the unique index is what stops a duplicate account.
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    -- Encrypted with APP_KEY (src/lib/crypto.ts). Set by setup, before it is confirmed.
    `mfa_secret` VARCHAR(255) NULL,
    -- MFA is on only when this is set. A secret without it is an unfinished setup.
    `mfa_confirmed_at` DATETIME(3) NULL,
    -- The last TOTP step accepted. A code at or below it is a replay.
    `mfa_last_counter` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- A session. It has no expiry by design: it lives until logout or a password change/reset.
CREATE TABLE `access_tokens` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `token_hash` CHAR(64) NOT NULL,
    `last_used_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL,

    INDEX `access_tokens_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `access_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- A browser that may skip the MFA prompt. No expiry either; revoked from the Account page.
CREATE TABLE `trusted_devices` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `token_hash` CHAR(64) NOT NULL,
    `user_agent` VARCHAR(255) NOT NULL,
    `last_used_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL,

    INDEX `trusted_devices_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `trusted_devices_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Deleting a habit sets `archived_at` (and archives its goals): its log is user data.
CREATE TABLE `habits` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `type` ENUM('build', 'break') NOT NULL,
    -- A key from the icon set in src/modules/habits/schemas.ts; the SPA draws it.
    `icon` VARCHAR(32) NOT NULL,
    -- The first day the habit counts, in the user's time zone.
    `started_on` DATE NOT NULL,
    `archived_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `habits_user_id_archived_at_idx`(`user_id`, `archived_at`),
    PRIMARY KEY (`id`),
    CONSTRAINT `habits_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- One row per habit per day. Build: done that day. Break: relapsed that day.
CREATE TABLE `habit_logs` (
    `id` CHAR(36) NOT NULL,
    `habit_id` CHAR(36) NOT NULL,
    `date` DATE NOT NULL,
    `created_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `habit_logs_habit_id_date_key`(`habit_id`, `date`),
    PRIMARY KEY (`id`),
    CONSTRAINT `habit_logs_habit_id_fkey` FOREIGN KEY (`habit_id`) REFERENCES `habits`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `goals` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `habit_id` CHAR(36) NOT NULL,
    `title` VARCHAR(120) NOT NULL,
    -- The streak, in days, that completes the goal. Optional: a goal can be open-ended.
    `target_days` INTEGER NULL,
    `notes` VARCHAR(500) NULL,
    `archived_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `goals_user_id_archived_at_idx`(`user_id`, `archived_at`),
    INDEX `goals_habit_id_idx`(`habit_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `goals_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `goals_habit_id_fkey` FOREIGN KEY (`habit_id`) REFERENCES `habits`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
