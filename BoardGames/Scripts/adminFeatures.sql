-- Роль пользователя
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';

-- Уведомления
CREATE TABLE IF NOT EXISTS notifications (
    notification_id   SERIAL PRIMARY KEY,
    user_id           INTEGER NOT NULL,
    title             VARCHAR(200) NOT NULL,
    message           TEXT NOT NULL,
    is_read           BOOLEAN NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_notification_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Бан на отзывы
CREATE TABLE IF NOT EXISTS review_bans (
    ban_id            SERIAL PRIMARY KEY,
    user_id           INTEGER NOT NULL,
    banned_by         INTEGER NOT NULL,
    reason            TEXT NOT NULL,
    banned_at         TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at        TIMESTAMP,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_review_ban_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_review_ban_admin
        FOREIGN KEY (banned_by)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_review_bans_user_id ON review_bans(user_id);

-- Бан пользователей целиком
CREATE TABLE IF NOT EXISTS user_bans (
    ban_id            SERIAL PRIMARY KEY,
    user_id           INTEGER NOT NULL,
    banned_by         INTEGER NOT NULL,
    reason            TEXT NOT NULL,
    banned_at         TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at        TIMESTAMP,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_user_ban_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_user_ban_admin
        FOREIGN KEY (banned_by)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_bans_user_id ON user_bans(user_id);

-- Жалобы
CREATE TABLE IF NOT EXISTS complaints (
    complaint_id      SERIAL PRIMARY KEY,
    reporter_id       INTEGER NOT NULL,
    complaint_type    VARCHAR(20) NOT NULL,
    target_event_id   INTEGER,
    target_review_id  INTEGER,
    reason            TEXT NOT NULL,
    status            VARCHAR(20) NOT NULL DEFAULT 'pending',
    admin_comment     TEXT,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    resolved_at       TIMESTAMP,

    CONSTRAINT fk_complaint_reporter
        FOREIGN KEY (reporter_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_complaint_event
        FOREIGN KEY (target_event_id)
        REFERENCES game_events(event_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_complaint_review
        FOREIGN KEY (target_review_id)
        REFERENCES user_reviews(review_id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints(created_at DESC);

ALTER TABLE review_bans ADD COLUMN IF NOT EXISTS unbanned_by_name VARCHAR(100);
ALTER TABLE review_bans ADD COLUMN IF NOT EXISTS unbanned_at TIMESTAMP;
ALTER TABLE user_bans ADD COLUMN IF NOT EXISTS unbanned_by_name VARCHAR(100);
ALTER TABLE user_bans ADD COLUMN IF NOT EXISTS unbanned_at TIMESTAMP;

--UPDATE users SET role = 'admin' WHERE user_id = 3;