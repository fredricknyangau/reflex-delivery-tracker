from contextlib import asynccontextmanager
import os

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

import asyncpg


class DatabaseConnection:
    """Manages PostgreSQL connection pool and transaction lifecycles for Reflex."""

    _pool: asyncpg.Pool | None = None

    @classmethod
    async def init(cls):
        """Initialize the connection pool."""
        if cls._pool is None:
            db_url = os.getenv("DATABASE_URL")
            if db_url:
                # Handle postgres:// vs postgresql:// for asyncpg
                if db_url.startswith("postgres://"):
                    db_url = db_url.replace("postgres://", "postgresql://", 1)
                cls._pool = await asyncpg.create_pool(
                    dsn=db_url,
                    min_size=int(os.getenv("DB_MIN_SIZE", 5)),
                    max_size=int(os.getenv("DB_MAX_SIZE", 20)),
                    command_timeout=60,
                )
            else:
                cls._pool = await asyncpg.create_pool(
                    host=os.getenv("DB_HOST", "localhost"),
                    port=int(os.getenv("DB_PORT", 5432)),
                    user=os.getenv("DB_USER", "postgres"),
                    password=os.getenv("DB_PASSWORD", ""),
                    database=os.getenv("DB_NAME", "reflex"),
                    min_size=int(os.getenv("DB_MIN_SIZE", 5)),
                    max_size=int(os.getenv("DB_MAX_SIZE", 20)),
                    command_timeout=60,
                )
            print("Database connection pool initialized")

    @classmethod
    async def close(cls):
        """Close the connection pool."""
        if cls._pool:
            await cls._pool.close()
            cls._pool = None
            print("Database connection pool closed")

    @classmethod
    @asynccontextmanager
    async def connection(cls):
        """Acquire a dedicated connection from the pool."""
        if cls._pool is None:
            raise RuntimeError("Database pool not initialized. Call init() first.")
        async with cls._pool.acquire() as conn:
            yield conn

    @classmethod
    @asynccontextmanager
    async def transaction(cls):
        """Acquire a connection from the pool and start an atomic transaction block."""
        if cls._pool is None:
            raise RuntimeError("Database pool not initialized. Call init() first.")
        async with cls._pool.acquire() as conn:
            async with conn.transaction():
                yield conn

    @classmethod
    async def execute(cls, query: str, *args, conn: asyncpg.Connection | None = None):
        """Execute a query that returns no results (INSERT, UPDATE, DELETE)."""
        if conn is not None:
            return await conn.execute(query, *args)
        if cls._pool is None:
            raise RuntimeError("Database pool not initialized. Call init() first.")

        async with cls._pool.acquire() as connection:
            return await connection.execute(query, *args)

    @classmethod
    async def fetch(cls, query: str, *args, conn: asyncpg.Connection | None = None):
        """Fetch all rows from a query."""
        if conn is not None:
            return await conn.fetch(query, *args)
        if cls._pool is None:
            raise RuntimeError("Database pool not initialized. Call init() first.")

        async with cls._pool.acquire() as connection:
            return await connection.fetch(query, *args)

    @classmethod
    async def fetchrow(cls, query: str, *args, conn: asyncpg.Connection | None = None):
        """Fetch a single row from a query."""
        if conn is not None:
            return await conn.fetchrow(query, *args)
        if cls._pool is None:
            raise RuntimeError("Database pool not initialized. Call init() first.")

        async with cls._pool.acquire() as connection:
            return await connection.fetchrow(query, *args)

    @classmethod
    async def fetchval(cls, query: str, *args, conn: asyncpg.Connection | None = None):
        """Fetch a single value from a query."""
        if conn is not None:
            return await conn.fetchval(query, *args)
        if cls._pool is None:
            raise RuntimeError("Database pool not initialized. Call init() first.")

        async with cls._pool.acquire() as connection:
            return await connection.fetchval(query, *args)


# For direct SQL execution in migrations
async def run_migration(migration_file_path: str):
    """Run a migration file against the database."""
    await DatabaseConnection.init()

    with open(migration_file_path, "r", encoding="utf-8") as f:
        sql = f.read()

    try:
        await DatabaseConnection.execute(sql)
        print(f"Migration {migration_file_path} completed successfully")
    except Exception as e:
        print(f"Migration {migration_file_path} failed: {e}")
        raise
    finally:
        await DatabaseConnection.close()
