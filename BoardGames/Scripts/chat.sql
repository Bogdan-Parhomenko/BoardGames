-- chat.sql

-- Типы чатов: личный или групповой (для события)
CREATE TYPE chat_type AS ENUM ('private', 'event');

-- Таблица чатов
CREATE TABLE chats (
    chat_id       SERIAL PRIMARY KEY,
    chat_type     chat_type NOT NULL DEFAULT 'private',
    event_id      INTEGER,                    -- для групповых чатов события
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_chat_event
        FOREIGN KEY (event_id)
        REFERENCES game_events(event_id)
        ON DELETE CASCADE
);

-- Участники чата
CREATE TABLE chat_participants (
    chat_id       INTEGER NOT NULL,
    user_id       INTEGER NOT NULL,
    joined_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    is_deleted    BOOLEAN NOT NULL DEFAULT FALSE,  -- пользователь удалил чат у себя
    last_read_at  TIMESTAMP,                       -- для отслеживания непрочитанных

    PRIMARY KEY (chat_id, user_id),

    CONSTRAINT fk_participant_chat
        FOREIGN KEY (chat_id)
        REFERENCES chats(chat_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_participant_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

-- Сообщения
CREATE TABLE messages (
    message_id    SERIAL PRIMARY KEY,
    chat_id       INTEGER NOT NULL,
    sender_id     INTEGER NOT NULL,
    content       TEXT NOT NULL,
    sent_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    is_deleted    BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT fk_message_chat
        FOREIGN KEY (chat_id)
        REFERENCES chats(chat_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_message_sender
        FOREIGN KEY (sender_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

-- Индексы для быстрого поиска
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_sent_at ON messages(sent_at DESC);
CREATE INDEX idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX idx_chats_event_id ON chats(event_id);