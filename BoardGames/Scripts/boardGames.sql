CREATE TABLE users (
    user_id        SERIAL PRIMARY KEY,           
    login          VARCHAR(50)  NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,       
    full_name      VARCHAR(100) NOT NULL,        
    description    TEXT,                         
    phone          VARCHAR(20),                  
    city           VARCHAR(100),                 
    photo          VARCHAR(255)                  
);

CREATE TABLE game_categories (
    category_id    SERIAL PRIMARY KEY,           
    name           VARCHAR(100) NOT NULL UNIQUE, 
    description    TEXT                          
);

CREATE TABLE game_events (
    event_id          SERIAL PRIMARY KEY,    
    creator_id        INTEGER NOT NULL,     
    title             VARCHAR(150) NOT NULL, 
    description       TEXT,                  
    event_date        DATE NOT NULL,         
    event_time        TIME NOT NULL,         
    duration_minutes  INTEGER,              
    address           VARCHAR(255) NOT NULL,
    max_players       INTEGER CHECK (max_players > 0),

    CONSTRAINT fk_game_events_creator
        FOREIGN KEY (creator_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

CREATE TABLE user_event_participations (
    user_id    INTEGER NOT NULL,  
    event_id   INTEGER NOT NULL, 
    comment    TEXT,            

    PRIMARY KEY (user_id, event_id),

    CONSTRAINT fk_participation_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_participation_event
        FOREIGN KEY (event_id)
        REFERENCES game_events(event_id)
        ON DELETE CASCADE
);

CREATE TABLE event_game_categories (
    event_id    INTEGER NOT NULL,
    category_id INTEGER NOT NULL, 

    PRIMARY KEY (event_id, category_id),

    CONSTRAINT fk_event_category_event
        FOREIGN KEY (event_id)
        REFERENCES game_events(event_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_event_category_category
        FOREIGN KEY (category_id)
        REFERENCES game_categories(category_id)
        ON DELETE CASCADE
);

CREATE TABLE favorite_events (
    favorite_event_id SERIAL PRIMARY KEY,    
    creator_id        INTEGER NOT NULL,      
    title             VARCHAR(150) NOT NULL, 
    description       TEXT,                  
    address           VARCHAR(255) NOT NULL, 

    CONSTRAINT fk_favorite_creator
        FOREIGN KEY (creator_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);