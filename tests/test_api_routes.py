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

sys.path.insert(0, os.path.abspath("."))
sys.path.insert(0, os.path.abspath("backend"))

from tests.test_delivery_state_machine import MockDatabaseConnection
import app.services.delivery_service as ds_mod
from app.main import app
from fastapi.testclient import TestClient

ds_mod.DatabaseConnection = MockDatabaseConnection
import app.routes.retailers as ret_mod

ret_mod.DatabaseConnection = MockDatabaseConnection
import app.routes.users as usr_mod

usr_mod.DatabaseConnection = MockDatabaseConnection

client = TestClient(app)


def test_full_api_flow():
    MockDatabaseConnection.reset()
    print("\n--- Starting API Route Tests ---")

    # 1. Test GET /retailers
    res = client.get("/retailers")
    assert res.status_code == 200
    retailers = res.json()
    assert len(retailers) >= 1
    print("1. GET /retailers -> 200 OK")

    # 2. Test GET /users
    res = client.get("/users?role=rider")
    assert res.status_code == 200
    riders = res.json()
    assert len(riders) >= 1
    print("2. GET /users?role=rider -> 200 OK")

    # 3. Test POST /requests
    payload = {
        "retailer_id": 1,
        "created_by": 1,
        "customer_name": "Grace Wanjiku",
        "customer_phone": "0712345678",
        "address": "Westlands, Nairobi",
        "item_description": "Groceries Pack",
    }
    res = client.post("/requests", json=payload)
    assert res.status_code == 201
    req = res.json()
    assert req["status"] == "Requested"
    req_id = req["id"]
    print(f"3. POST /requests -> 201 Created (ID: {req_id})")

    # 4. Test GET /requests/{id}
    res = client.get(f"/requests/{req_id}")
    assert res.status_code == 200
    assert res.json()["id"] == req_id
    print(f"4. GET /requests/{req_id} -> 200 OK")

    # 5. Test POST /requests/{id}/assign
    assign_payload = {"assigned_rider_id": 3, "changed_by": 2}
    res = client.post(f"/requests/{req_id}/assign", json=assign_payload)
    assert res.status_code == 200
    assert res.json()["status"] == "Assigned"
    print(f"5. POST /requests/{req_id}/assign -> 200 OK")

    # 6. Test duplicate assign -> 409 Conflict
    res = client.post(
        f"/requests/{req_id}/assign", json={"assigned_rider_id": 4, "changed_by": 2}
    )
    assert res.status_code == 409
    print("6. Duplicate assignment -> 409 Conflict")

    # 7. Test status transition to Picked Up by assigned rider
    pickup_payload = {"status": "Picked Up", "changed_by": 3}
    res = client.post(f"/requests/{req_id}/status", json=pickup_payload)
    assert res.status_code == 200
    picked_data = res.json()
    assert picked_data["status"] == "Picked Up"
    code = picked_data["confirmation_code"]
    assert code.startswith("RX-")
    print(f"7. POST /requests/{req_id}/status (Picked Up) -> 200 OK (Code: {code})")

    # 8. Test status transition to Delivered with invalid code -> 400 Bad Request
    invalid_deliv_payload = {
        "status": "Delivered",
        "changed_by": 3,
        "confirmation_code": "RX-999999",
    }
    res = client.post(f"/requests/{req_id}/status", json=invalid_deliv_payload)
    assert res.status_code == 400
    print("8. Invalid confirmation code -> 400 Bad Request")

    # 9. Test status transition to Delivered with correct code -> 200 OK
    valid_deliv_payload = {
        "status": "Delivered",
        "changed_by": 3,
        "confirmation_code": code,
    }
    res = client.post(f"/requests/{req_id}/status", json=valid_deliv_payload)
    assert res.status_code == 200
    assert res.json()["status"] == "Delivered"
    print("9. Valid delivery confirmation -> 200 OK")

    # 10. Test GET /requests/{id}/history
    res = client.get(f"/requests/{req_id}/history")
    assert res.status_code == 200
    history = res.json()
    assert len(history) == 4
    print(f"10. GET /requests/{req_id}/history -> 200 OK ({len(history)} audit events)")

    # 11. Test non-existent request -> 404
    res = client.get("/requests/99999")
    assert res.status_code == 404
    print("11. Non-existent request -> 404 Not Found")

    print("\n=== ALL 11 REST API ROUTE TESTS PASSED CLEANLY! ===")


if __name__ == "__main__":
    test_full_api_flow()
