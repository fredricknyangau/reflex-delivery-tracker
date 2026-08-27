from fastapi import APIRouter, Query
from typing import Optional, List, Dict, Any
from app.database.connection import DatabaseConnection

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("", response_model=List[Dict[str, Any]])
async def list_users(
    role: Optional[str] = Query(None),
    retailer_id: Optional[int] = Query(None)
):
    query = "SELECT * FROM users WHERE 1=1"
    params = []
    idx = 1

    if role is not None:
        query += f" AND role = ${idx}"
        params.append(role)
        idx += 1

    if retailer_id is not None:
        query += f" AND retailer_id = ${idx}"
        params.append(retailer_id)
        idx += 1

    query += " ORDER BY id"
    rows = await DatabaseConnection.fetch(query, *params)
    return [dict(r) for r in rows]
