CREATE TABLE retailers (
    id SERIAL PRIMARY KEY,
    business_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);