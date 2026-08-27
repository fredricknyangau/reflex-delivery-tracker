import random
import string
from typing import Optional, List, Dict, Any
from app.database.connection import DatabaseConnection

class DeliveryService:
    @staticmethod
    def generate_confirmation_code() -> str:
        digits = "".join(random.choices(string.digits, k=6))
        return f"RX-{digits}"

    @classmethod
    async def create_request(
        cls,
        retailer_id: int,
        created_by: int,
        customer_name: str,
        customer_phone: str,
        address: str,
        item_description: str
    ) -> Dict[str, Any]:
        retailer = await DatabaseConnection.fetchrow("SELECT id FROM retailers WHERE id = $1", retailer_id)
        if not retailer:
            raise KeyError(f"Retailer with id {retailer_id} not found.")

        user = await DatabaseConnection.fetchrow("SELECT id FROM users WHERE id = $1", created_by)
        if not user:
            raise KeyError(f"User with id {created_by} not found.")

        insert_sql = """
            INSERT INTO delivery_requests (
                retailer_id, created_by, customer_name, customer_phone, address, item_description, status
            ) VALUES ($1, $2, $3, $4, $5, $6, 'Requested')
            RETURNING *
        """
        row = await DatabaseConnection.fetchrow(
            insert_sql, retailer_id, created_by, customer_name, customer_phone, address, item_description
        )
        request_dict = dict(row)

        event_sql = """
            INSERT INTO status_events (delivery_request_id, status, changed_by)
            VALUES ($1, 'Requested', $2)
        """
        await DatabaseConnection.execute(event_sql, request_dict['id'], created_by)

        return request_dict

    @classmethod
    async def assign_rider(cls, request_id: int, assigned_rider_id: int, changed_by: int) -> Dict[str, Any]:
        rider = await DatabaseConnection.fetchrow("SELECT id, role FROM users WHERE id = $1", assigned_rider_id)
        if not rider or rider['role'] != 'rider':
            raise ValueError(f"User {assigned_rider_id} is not a valid rider.")

        update_sql = """
            UPDATE delivery_requests
            SET status = 'Assigned', assigned_rider_id = $1, updated_at = NOW()
            WHERE id = $2 AND status = 'Requested'
            RETURNING *
        """
        row = await DatabaseConnection.fetchrow(update_sql, assigned_rider_id, request_id)

        if not row:
            existing = await DatabaseConnection.fetchrow("SELECT id, status, assigned_rider_id FROM delivery_requests WHERE id = $1", request_id)
            if not existing:
                raise KeyError(f"Delivery request {request_id} not found.")
            raise ValueError(f"Delivery request {request_id} is already in status '{existing['status']}' and cannot be assigned.")

        request_dict = dict(row)

        event_sql = """
            INSERT INTO status_events (delivery_request_id, status, changed_by)
            VALUES ($1, 'Assigned', $2)
        """
        await DatabaseConnection.execute(event_sql, request_id, changed_by)

        return request_dict

    @classmethod
    async def mark_picked_up(cls, request_id: int, changed_by: int) -> Dict[str, Any]:
        existing = await DatabaseConnection.fetchrow("SELECT * FROM delivery_requests WHERE id = $1", request_id)
        if not existing:
            raise KeyError(f"Delivery request {request_id} not found.")

        if existing['status'] != 'Assigned':
            raise ValueError(f"Cannot pick up delivery request in status '{existing['status']}'. Must be Assigned.")

        if existing['assigned_rider_id'] != changed_by:
            raise PermissionError(f"User {changed_by} is not the assigned rider for request {request_id}.")

        code = cls.generate_confirmation_code()

        update_sql = """
            UPDATE delivery_requests
            SET status = 'Picked Up', confirmation_code = $1, updated_at = NOW()
            WHERE id = $2 AND status = 'Assigned' AND assigned_rider_id = $3
            RETURNING *
        """
        row = await DatabaseConnection.fetchrow(update_sql, code, request_id, changed_by)
        if not row:
            raise ValueError(f"Failed to transition request {request_id} to Picked Up.")

        request_dict = dict(row)

        event_sql = """
            INSERT INTO status_events (delivery_request_id, status, changed_by)
            VALUES ($1, 'Picked Up', $2)
        """
        await DatabaseConnection.execute(event_sql, request_id, changed_by)

        return request_dict

    @classmethod
    async def mark_delivered(cls, request_id: int, changed_by: int, confirmation_code: Optional[str]) -> Dict[str, Any]:
        existing = await DatabaseConnection.fetchrow("SELECT * FROM delivery_requests WHERE id = $1", request_id)
        if not existing:
            raise KeyError(f"Delivery request {request_id} not found.")

        if existing['status'] != 'Picked Up':
            raise ValueError(f"Cannot deliver request in status '{existing['status']}'. Must be Picked Up.")

        if existing['assigned_rider_id'] != changed_by:
            raise PermissionError(f"User {changed_by} is not the assigned rider for request {request_id}.")

        if not confirmation_code or confirmation_code.strip() != existing['confirmation_code']:
            raise ValueError("Invalid confirmation code.")

        update_sql = """
            UPDATE delivery_requests
            SET status = 'Delivered', updated_at = NOW()
            WHERE id = $1 AND status = 'Picked Up' AND assigned_rider_id = $2 AND confirmation_code = $3
            RETURNING *
        """
        row = await DatabaseConnection.fetchrow(update_sql, request_id, changed_by, confirmation_code.strip())
        if not row:
            raise ValueError("Failed to transition request to Delivered.")

        request_dict = dict(row)

        event_sql = """
            INSERT INTO status_events (delivery_request_id, status, changed_by)
            VALUES ($1, 'Delivered', $2)
        """
        await DatabaseConnection.execute(event_sql, request_id, changed_by)

        return request_dict

    @classmethod
    async def get_request(cls, request_id: int) -> Optional[Dict[str, Any]]:
        row = await DatabaseConnection.fetchrow("SELECT * FROM delivery_requests WHERE id = $1", request_id)
        return dict(row) if row else None

    @classmethod
    async def list_requests(
        cls,
        retailer_id: Optional[int] = None,
        status: Optional[str] = None,
        assigned_to: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        query = "SELECT * FROM delivery_requests WHERE 1=1"
        params = []
        idx = 1

        if retailer_id is not None:
            query += f" AND retailer_id = ${idx}"
            params.append(retailer_id)
            idx += 1

        if status is not None:
            query += f" AND status = ${idx}"
            params.append(status)
            idx += 1

        if assigned_to is not None:
            query += f" AND assigned_rider_id = ${idx}"
            params.append(assigned_to)
            idx += 1

        query += " ORDER BY id DESC"

        rows = await DatabaseConnection.fetch(query, *params)
        return [dict(r) for r in rows]

    @classmethod
    async def get_history(cls, request_id: int) -> Optional[List[Dict[str, Any]]]:
        existing = await DatabaseConnection.fetchrow("SELECT id FROM delivery_requests WHERE id = $1", request_id)
        if not existing:
            return None

        sql = """
            SELECT se.id, se.delivery_request_id, se.status, se.changed_by,
                   u.name AS changed_by_name, u.role AS changed_by_role, se.changed_at
            FROM status_events se
            JOIN users u ON se.changed_by = u.id
            WHERE se.delivery_request_id = $1
            ORDER BY se.changed_at ASC, se.id ASC
        """
        rows = await DatabaseConnection.fetch(sql, request_id)
        return [dict(r) for r in rows]
