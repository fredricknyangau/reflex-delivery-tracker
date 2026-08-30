# Migration Checklist

## Status

- [x] `001_create_retailers.sql` - Retailers table created with PK and tenant contact info
- [x] `002_create_users.sql` - Users table created with role CHECK constraints and retailer FK
- [x] `003_create_delivery_requests.sql` - Core requests table with lifecycle status CHECK and rider assignment FK
- [x] `004_create_status_events.sql` - Append-only audit table with request and user FKs
- [x] `005_add_indexes.sql` - High-frequency filter and FK indexes added
- [x] `seed.sql` - Initial multi-tenant retailers, staff, dispatchers, and riders seeded
- [x] `connection.py` - Async connection pool and transaction context manager implemented
- [x] `migrate.py` - Automated migration CLI runner executing 001–005 in ascending order

## Migration Execution Protocol

1. Start PostgreSQL 16 service (`sudo systemctl start postgresql`)
2. Create `reflex` database (`createdb reflex` or `CREATE DATABASE reflex;`)
3. Run migrations and seed data:
   ```bash
   python backend/app/database/migrate.py --seed
   ```
4. Verify schema and table creation:
   ```sql
   \dt
   \d delivery_requests
   \d status_events
   ```
5. Confirm index presence:
   ```sql
   \di idx_*
   ```

## Expected Result

All 4 tables created with strict referential integrity, check constraints, and performance indexes. Seed data loaded successfully. Database ready for FastAPI production workloads.
