CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    retailer_id INTEGER NOT NULL REFERENCES retailers(id),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('retailer_staff', 'dispatcher', 'rider')),
    created_at TIMESTAMP DEFAULT NOW()
);