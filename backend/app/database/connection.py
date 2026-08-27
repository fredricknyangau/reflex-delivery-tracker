import asyncpg
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

class DatabaseConnection:
    """Manages PostgreSQL connection pool for the Reflex application."""
    
    _pool: Optional[asyncpg.Pool] = None
    
    @classmethod
    async def init(cls):
        """Initialize the connection pool."""
        if cls._pool is None:
            cls._pool = await asyncpg.create_pool(
                host=os.getenv("DB_HOST", "localhost"),
                port=int(os.getenv("DB_PORT", 5432)),
                user=os.getenv("DB_USER", "postgres"),
                password=os.getenv("DB_PASSWORD", ""),
                database=os.getenv("DB_NAME", "reflex"),
                min_size=5,
                max_size=20,
                command_timeout=60,
            )
            print("✅ Database connection pool initialized")
    
    @classmethod
    async def close(cls):
        """Close the connection pool."""
        if cls._pool:
            await cls._pool.close()
            cls._pool = None
            print("✅ Database connection pool closed")
    
    @classmethod
    async def execute(cls, query: str, *args):
        """Execute a query that returns no results (INSERT, UPDATE, DELETE)."""
        if cls._pool is None:
            raise RuntimeError("Database pool not initialized. Call init() first.")
        
        async with cls._pool.acquire() as connection:
            return await connection.execute(query, *args)
    
    @classmethod
    async def fetch(cls, query: str, *args):
        """Fetch all rows from a query."""
        if cls._pool is None:
            raise RuntimeError("Database pool not initialized. Call init() first.")
        
        async with cls._pool.acquire() as connection:
            return await connection.fetch(query, *args)
    
    @classmethod
    async def fetchrow(cls, query: str, *args):
        """Fetch a single row from a query."""
        if cls._pool is None:
            raise RuntimeError("Database pool not initialized. Call init() first.")
        
        async with cls._pool.acquire() as connection:
            return await connection.fetchrow(query, *args)
    
    @classmethod
    async def fetchval(cls, query: str, *args):
        """Fetch a single value from a query."""
        if cls._pool is None:
            raise RuntimeError("Database pool not initialized. Call init() first.")
        
        async with cls._pool.acquire() as connection:
            return await connection.fetchval(query, *args)


# For direct SQL execution in migrations
async def run_migration(migration_file_path: str):
    """Run a migration file against the database."""
    await DatabaseConnection.init()
    
    with open(migration_file_path, 'r') as f:
        sql = f.read()
    
    try:
        await DatabaseConnection.execute(sql)
        print(f"✅ Migration {migration_file_path} completed successfully")
    except Exception as e:
        print(f"❌ Migration {migration_file_path} failed: {e}")
        raise
    finally:
        await DatabaseConnection.close()