from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class CreateDeliveryRequest(BaseModel):
    retailer_id: int
    created_by: int
    customer_name: str
    customer_phone: str
    address: str
    item_description: str

class AssignRiderRequest(BaseModel):
    assigned_rider_id: int
    changed_by: int

class UpdateStatusRequest(BaseModel):
    status: str
    changed_by: int
    confirmation_code: Optional[str] = None

class DeliveryRequestResponse(BaseModel):
    id: int
    retailer_id: int
    created_by: int
    customer_name: str
    customer_phone: str
    address: str
    item_description: str
    status: str
    assigned_rider_id: Optional[int] = None
    confirmation_code: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class StatusEventResponse(BaseModel):
    id: int
    delivery_request_id: int
    status: str
    changed_by: int
    changed_by_name: Optional[str] = None
    changed_by_role: Optional[str] = None
    changed_at: Optional[datetime] = None
