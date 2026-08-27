from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from app.database.connection import DatabaseConnection

router = APIRouter(prefix="/retailers", tags=["Retailers"])

@router.get("", response_model=List[Dict[str, Any]])
async def list_retailers():
    rows = await DatabaseConnection.fetch("SELECT * FROM retailers ORDER BY id")
    return [dict(r) for r in rows]
