"""Reflex Database Migration & Seed CLI Runner.

Executes all numbered SQL migrations in `backend/app/database/migrations/` in ascending order.
Optionally loads seed data if `--seed` is supplied.
"""
import asyncio
import glob
import os
import sys

from app.database.connection import DatabaseConnection


async def run_all_migrations(include_seed: bool = False):
    print("Connecting to PostgreSQL database...")
    await DatabaseConnection.init()

    migrations_dir = os.path.join(os.path.dirname(__file__), "migrations")
    migration_files = sorted(glob.glob(os.path.join(migrations_dir, "*.sql")))

    if not migration_files:
        print("No migration files found in", migrations_dir)
        await DatabaseConnection.close()
        return

    print(f"Found {len(migration_files)} migration files. Applying...")
    for file_path in migration_files:
        file_name = os.path.basename(file_path)
        print(f"  -> Applying migration: {file_name} ...", end=" ", flush=True)
        with open(file_path, "r", encoding="utf-8") as f:
            sql = f.read()
        try:
            await DatabaseConnection.execute(sql)
            print("OK")
        except Exception as e:
            print(f"FAILED: {e}")
            await DatabaseConnection.close()
            sys.exit(1)

    if include_seed:
        seed_path = os.path.join(os.path.dirname(__file__), "seed.sql")
        if os.path.exists(seed_path):
            print("  -> Applying seed data from seed.sql ...", end=" ", flush=True)
            with open(seed_path, "r", encoding="utf-8") as f:
                seed_sql = f.read()
            try:
                await DatabaseConnection.execute(seed_sql)
                print("OK")
            except Exception as e:
                print(f"FAILED: {e}")
                await DatabaseConnection.close()
                sys.exit(1)

    print("All database migrations applied successfully!")
    await DatabaseConnection.close()

if __name__ == "__main__":
    include_seed = "--seed" in sys.argv
    asyncio.run(run_all_migrations(include_seed=include_seed))
