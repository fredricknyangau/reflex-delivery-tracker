-- Insert 1-2 retailers
INSERT INTO retailers (business_name, phone, address) VALUES
('Nairobi Pharmacy', '0701234567', '123 Moi Avenue, Nairobi'),
('Westlands Hardware', '0702345678', '456 Limuru Road, Westlands');

-- Insert users (retailer_staff, dispatcher, riders)
INSERT INTO users (retailer_id, name, phone, role) VALUES
-- Nairobi Pharmacy
(1, 'Ahmed Mohamed', '0704567890', 'retailer_staff'),
(1, 'Sarah Kipchoge', '0705678901', 'dispatcher'),
(1, 'John Kariuki', '0706789012', 'rider'),
(1, 'Mary Omondi', '0707890123', 'rider'),

-- Westlands Hardware
(2, 'Peter Mwangi', '0708901234', 'retailer_staff'),
(2, 'Alice Kamau', '0709012345', 'dispatcher'),
(2, 'David Otieno', '0700123456', 'rider');