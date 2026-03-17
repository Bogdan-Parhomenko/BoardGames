-- Таблица отзывов
CREATE TABLE user_reviews (
    review_id         SERIAL PRIMARY KEY,
    reviewer_id       INTEGER NOT NULL,          -- кто оставил отзыв
    target_user_id    INTEGER NOT NULL,          -- о ком отзыв
    rating            TEXT NOT NULL,             -- оценка
    comment           TEXT NOT NULL,             -- текст отзыва
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_review_reviewer
        FOREIGN KEY (reviewer_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_review_target
        FOREIGN KEY (target_user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    -- Один пользователь может оставить только один отзыв о другом
    CONSTRAINT uq_review_unique UNIQUE (reviewer_id, target_user_id),
    
    -- Нельзя оставить отзыв о себе
    CONSTRAINT chk_review_not_self CHECK (reviewer_id != target_user_id)
);

CREATE INDEX idx_reviews_target_user ON user_reviews(target_user_id);
CREATE INDEX idx_reviews_created_at ON user_reviews(created_at DESC);