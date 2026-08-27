CREATE TABLE delivery_requests (
    id SERIAL PRIMARY KEY,
    retailer_id INTEGER NOT NULL REFERENCES retailers(id),
    created_by INTEGER NOT NULL REFERENCES users(id),
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    address TEXT NOT NULL,
    item_description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Requested'
        CHECK (status IN ('Requested', 'Assigned', 'Picked Up', 'Delivered')),
    assigned_rider_id INTEGER REFERENCES users(id),
    confirmation_code TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);