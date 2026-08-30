import asyncio
from contextlib import asynccontextmanager
import os
import sys
import types
from unittest.mock import MagicMock

if "dotenv" not in sys.modules:
    dummy_dotenv = types.ModuleType("dotenv")
    dummy_dotenv.load_dotenv = lambda *args, **kwargs: None
    sys.modules["dotenv"] = dummy_dotenv

if "asyncpg" not in sys.modules:
    dummy_asyncpg = types.ModuleType("asyncpg")
    dummy_asyncpg.Pool = MagicMock()
    sys.modules["asyncpg"] = dummy_asyncpg

sys.path.insert(0, os.path.abspath("backend"))

from app.services.delivery_service import DeliveryService


class MockDatabaseConnection:
    retailers = [
        {
            "id": 1,
            "business_name": "Test Retailer",
            "phone": "0700000000",
            "address": "Nairobi",
        }
    ]
    users = [
        {
            "id": 1,
            "retailer_id": 1,
            "name": "Alice Retailer",
            "phone": "0711111111",
            "role": "retailer_staff",
        },
        {
            "id": 2,
            "retailer_id": 1,
            "name": "Bob Dispatcher",
            "phone": "0722222222",
            "role": "dispatcher",
        },
        {
            "id": 3,
            "retailer_id": 1,
            "name": "Brian Rider",
            "phone": "0733333333",
            "role": "rider",
        },
        {
            "id": 4,
            "retailer_id": 1,
            "name": "Other Rider",
            "phone": "0744444444",
            "role": "rider",
        },
    ]
    delivery_requests = {}
    status_events = []
    next_request_id = 1
    next_event_id = 1

    @classmethod
    def reset(cls):
        cls.delivery_requests = {}
        cls.status_events = []
        cls.next_request_id = 1
        cls.next_event_id = 1

    @classmethod
    @asynccontextmanager
    async def transaction(cls):
        yield cls

    @classmethod
    @asynccontextmanager
    async def connection(cls):
        yield cls

    @classmethod
    async def fetchrow(cls, query: str, *args, conn=None):
        q = query.strip().upper()
        if "FROM RETAILERS WHERE ID" in q:
            rid = args[0]
            return next((r for r in cls.retailers if r["id"] == rid), None)
        if "FROM USERS WHERE ID" in q:
            uid = args[0]
            return next((u for u in cls.users if u["id"] == uid), None)
        if "INSERT INTO DELIVERY_REQUESTS" in q:
            rid, created_by, name, phone, addr, desc = args
            req_id = cls.next_request_id
            cls.next_request_id += 1
            record = {
                "id": req_id,
                "retailer_id": rid,
                "created_by": created_by,
                "customer_name": name,
                "customer_phone": phone,
                "address": addr,
                "item_description": desc,
                "status": "Requested",
                "assigned_rider_id": None,
                "confirmation_code": None,
                "created_at": "2026-08-27T12:00:00Z",
                "updated_at": "2026-08-27T12:00:00Z",
            }
            cls.delivery_requests[req_id] = record
            return record

        if "UPDATE DELIVERY_REQUESTS" in q:
            if "DELIVERED" in q and "STATUS" in q and "SET" in q:
                req_id, rider_id, code = args
                req = cls.delivery_requests.get(req_id)
                if (
                    req
                    and req["status"] == "Picked Up"
                    and req["assigned_rider_id"] == rider_id
                    and req["confirmation_code"] == code
                ):
                    req["status"] = "Delivered"
                    return req
                return None

            if "PICKED UP" in q and "STATUS" in q and "SET" in q:
                code, req_id, rider_id = args
                req = cls.delivery_requests.get(req_id)
                if (
                    req
                    and req["status"] == "Assigned"
                    and req["assigned_rider_id"] == rider_id
                ):
                    req["status"] = "Picked Up"
                    req["confirmation_code"] = code
                    return req
                return None

            if "ASSIGNED" in q and "STATUS" in q and "SET" in q:
                rider_id, req_id = args
                req = cls.delivery_requests.get(req_id)
                if req and req["status"] == "Requested":
                    req["status"] = "Assigned"
                    req["assigned_rider_id"] = rider_id
                    return req
                return None

        if "SELECT * FROM DELIVERY_REQUESTS WHERE ID" in q:
            req_id = args[0]
            return cls.delivery_requests.get(req_id)
        if "SELECT ID, STATUS, ASSIGNED_RIDER_ID FROM DELIVERY_REQUESTS WHERE ID" in q:
            req_id = args[0]
            return cls.delivery_requests.get(req_id)
        if "SELECT ID FROM DELIVERY_REQUESTS WHERE ID" in q:
            req_id = args[0]
            req = cls.delivery_requests.get(args[0])
            return {"id": args[0]} if req else None
        return None

    @classmethod
    async def execute(cls, query: str, *args, conn=None):
        q = query.strip().upper()
        if "INSERT INTO STATUS_EVENTS" in q:
            if len(args) == 2:
                req_id, changed_by = args
                if "REQUESTED" in q:
                    status_val = "Requested"
                elif "ASSIGNED" in q:
                    status_val = "Assigned"
                elif "PICKED UP" in q:
                    status_val = "Picked Up"
                else:
                    status_val = "Delivered"
            else:
                req_id, status_val, changed_by = args

            event = {
                "id": cls.next_event_id,
                "delivery_request_id": req_id,
                "status": status_val,
                "changed_by": changed_by,
                "changed_at": "2026-08-27T12:00:00Z",
            }
            cls.next_event_id += 1
            cls.status_events.append(event)
            return "INSERT 1"
        return "OK"

    @classmethod
    async def fetch(cls, query: str, *args, conn=None):
        q = query.strip().upper()
        if "FROM STATUS_EVENTS" in q:
            req_id = args[0]
            res = []
            for ev in cls.status_events:
                if ev["delivery_request_id"] == req_id:
                    u = next(
                        (u for u in cls.users if u["id"] == ev["changed_by"]),
                        {"name": "Unknown", "role": "unknown"},
                    )
                    res.append(
                        {
                            "id": ev["id"],
                            "delivery_request_id": ev["delivery_request_id"],
                            "status": ev["status"],
                            "changed_by": ev["changed_by"],
                            "changed_by_name": u["name"],
                            "changed_by_role": u["role"],
                            "changed_at": ev["changed_at"],
                        }
                    )
            return res
        if "FROM RETAILERS" in q:
            return cls.retailers
        if "FROM USERS" in q:
            role_param = None
            if "WHERE" in q and "ROLE =" in q:
                pass
            return cls.users
        if "FROM DELIVERY_REQUESTS" in q:
            return list(cls.delivery_requests.values())
        return []


async def test_suite():
    import app.services.delivery_service as ds_mod

    ds_mod.DatabaseConnection = MockDatabaseConnection

    MockDatabaseConnection.reset()
    print("1. Testing create_request...")
    req = await DeliveryService.create_request(
        1, 1, "Margaret Nduta", "0700112233", "Ngong Road", "Cooking Oil"
    )
    assert req["status"] == "Requested"
    assert req["id"] == 1
    print("   - Created request ID 1 (status: Requested)")

    print("2. Testing assign_rider...")
    assigned = await DeliveryService.assign_rider(1, 3, 2)
    assert assigned["status"] == "Assigned"
    assert assigned["assigned_rider_id"] == 3
    print("   - Assigned rider 3 (status: Assigned)")

    print("3. Testing atomic duplicate assignment failure...")
    try:
        await DeliveryService.assign_rider(1, 4, 2)
        assert False, "Should have failed duplicate assignment"
    except ValueError as e:
        print(f"   - Duplicate assignment rejected cleanly: {e}")

    print("4. Testing pickup by wrong rider (should be rejected)...")
    try:
        await DeliveryService.mark_picked_up(1, 4)
        assert False, "Should have rejected wrong rider pickup"
    except PermissionError as e:
        print(f"   - Wrong rider pickup rejected: {e}")

    print("5. Testing pickup by assigned rider...")
    picked = await DeliveryService.mark_picked_up(1, 3)
    assert picked["status"] == "Picked Up"
    assert picked["confirmation_code"].startswith("RX-")
    code = picked["confirmation_code"]
    print(f"   - Picked up successfully, confirmation_code = {code}")

    print("6. Testing delivery with wrong confirmation code...")
    try:
        await DeliveryService.mark_delivered(1, 3, "RX-000000")
        assert False, "Should have rejected wrong code"
    except ValueError as e:
        print(f"   - Wrong confirmation code rejected: {e}")

    current = await DeliveryService.get_request(1)
    assert current["status"] == "Picked Up"

    print("7. Testing delivery with correct confirmation code...")
    delivered = await DeliveryService.mark_delivered(1, 3, code)
    assert delivered["status"] == "Delivered"
    print("   - Delivered successfully (status: Delivered)")

    print("8. Testing history audit log...")
    history = await DeliveryService.get_history(1)
    assert len(history) == 4
    statuses = [h["status"] for h in history]
    assert statuses == ["Requested", "Assigned", "Picked Up", "Delivered"]
    print(f"   - History trail verified: {statuses}")

    print("9. Testing unknown request ID 999...")
    assert await DeliveryService.get_request(999) is None
    print("   - Unknown request returned None")

    print("=== ALL 9 BACKEND UNIT TESTS PASSED CLEANLY! ===")


def test_delivery_state_machine():
    asyncio.run(test_suite())


if __name__ == "__main__":
    asyncio.run(test_suite())
