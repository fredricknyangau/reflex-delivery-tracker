CREATE TABLE status_events (
    id SERIAL PRIMARY KEY,
    delivery_request_id INTEGER NOT NULL REFERENCES delivery_requests(id),
    status TEXT NOT NULL,
    changed_by INTEGER NOT NULL REFERENCES users(id),
    changed_at TIMESTAMP DEFAULT NOW()
);