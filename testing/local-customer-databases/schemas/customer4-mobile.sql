-- Mobile App API Schema
-- Customer 4: Shared tier ($59/mo)
-- Use case: Mobile app backend (10K users, 500K API calls)

-- App users table
CREATE TABLE app_users (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    username VARCHAR(100) UNIQUE,
    device_id VARCHAR(255),
    platform VARCHAR(20), -- ios, android, web
    app_version VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- User sessions table
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES app_users(id),
    session_token VARCHAR(255) UNIQUE NOT NULL,
    device_info JSONB,
    ip_address INET,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- API logs table
CREATE TABLE api_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES app_users(id),
    session_id INTEGER REFERENCES sessions(id),
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL, -- GET, POST, PUT, DELETE
    status_code INTEGER,
    response_time_ms INTEGER,
    request_size INTEGER,
    response_size INTEGER,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Push notifications table
CREATE TABLE push_notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES app_users(id),
    title VARCHAR(255) NOT NULL,
    body TEXT,
    data JSONB,
    status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed, read
    sent_at TIMESTAMP,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User content table
CREATE TABLE user_content (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES app_users(id),
    content_type VARCHAR(50), -- photo, video, text, audio
    title VARCHAR(255),
    content TEXT,
    media_url VARCHAR(500),
    metadata JSONB,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User interactions table
CREATE TABLE interactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES app_users(id),
    content_id INTEGER REFERENCES user_content(id),
    interaction_type VARCHAR(50), -- like, share, comment, view
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_app_users_email ON app_users(email);
CREATE INDEX idx_app_users_uuid ON app_users(uuid);
CREATE INDEX idx_app_users_last_active ON app_users(last_active);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(session_token);
CREATE INDEX idx_api_logs_user ON api_logs(user_id);
CREATE INDEX idx_api_logs_endpoint ON api_logs(endpoint);
CREATE INDEX idx_api_logs_created ON api_logs(created_at);
CREATE INDEX idx_push_notifications_user ON push_notifications(user_id);
CREATE INDEX idx_push_notifications_status ON push_notifications(status);
CREATE INDEX idx_user_content_user ON user_content(user_id);
CREATE INDEX idx_interactions_user ON interactions(user_id);
CREATE INDEX idx_interactions_content ON interactions(content_id);
