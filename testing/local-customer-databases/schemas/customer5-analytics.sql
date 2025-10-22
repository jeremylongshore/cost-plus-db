-- Analytics Platform Schema
-- Customer 5: Shared tier ($59/mo)
-- Use case: Event tracking and analytics (250K events)

-- Tracked properties table
CREATE TABLE properties (
    id SERIAL PRIMARY KEY,
    property_key VARCHAR(255) UNIQUE NOT NULL,
    property_type VARCHAR(50), -- user, event, session
    data_type VARCHAR(20), -- string, number, boolean, datetime
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Events table
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    event_name VARCHAR(255) NOT NULL,
    user_id VARCHAR(255),
    session_id VARCHAR(255),
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    properties JSONB,
    device_type VARCHAR(50),
    browser VARCHAR(100),
    os VARCHAR(100),
    country VARCHAR(2),
    city VARCHAR(100),
    referrer VARCHAR(500),
    utm_source VARCHAR(255),
    utm_medium VARCHAR(255),
    utm_campaign VARCHAR(255)
);

-- Daily metrics table
CREATE TABLE daily_metrics (
    id SERIAL PRIMARY KEY,
    metric_date DATE NOT NULL,
    metric_name VARCHAR(255) NOT NULL,
    value NUMERIC(15,2) NOT NULL,
    properties JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(metric_date, metric_name)
);

-- User cohorts table
CREATE TABLE cohorts (
    id SERIAL PRIMARY KEY,
    cohort_name VARCHAR(255) NOT NULL,
    cohort_date DATE NOT NULL,
    user_count INTEGER DEFAULT 0,
    properties JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Funnel steps table
CREATE TABLE funnel_steps (
    id SERIAL PRIMARY KEY,
    funnel_name VARCHAR(255) NOT NULL,
    step_number INTEGER NOT NULL,
    step_name VARCHAR(255) NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(funnel_name, step_number)
);

-- Funnel conversions table
CREATE TABLE funnel_conversions (
    id SERIAL PRIMARY KEY,
    funnel_name VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    session_id VARCHAR(255),
    step_number INTEGER NOT NULL,
    completed_at TIMESTAMP NOT NULL,
    time_to_complete_seconds INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reports table
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    report_name VARCHAR(255) NOT NULL,
    report_type VARCHAR(50), -- dashboard, trend, cohort, funnel
    config JSONB,
    created_by VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_events_name ON events(event_name);
CREATE INDEX idx_events_user ON events(user_id);
CREATE INDEX idx_events_session ON events(session_id);
CREATE INDEX idx_events_timestamp ON events(timestamp);
CREATE INDEX idx_events_properties ON events USING gin(properties);
CREATE INDEX idx_daily_metrics_date ON daily_metrics(metric_date);
CREATE INDEX idx_daily_metrics_name ON daily_metrics(metric_name);
CREATE INDEX idx_cohorts_date ON cohorts(cohort_date);
CREATE INDEX idx_funnel_conversions_funnel ON funnel_conversions(funnel_name);
CREATE INDEX idx_funnel_conversions_user ON funnel_conversions(user_id);
CREATE INDEX idx_reports_type ON reports(report_type);
