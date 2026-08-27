from fastapi import APIRouter, HTTPException, Query, status
from typing import Optional, List
from app.schemas.delivery import CreateDeliveryRequest, DeliveryRequestResponse, StatusEventResponse
from app.services.delivery_service import DeliveryService

router = APIRouter(prefix="/requests", tags=["Requests"])

@router.post("", response_model=DeliveryRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_delivery_request(body: CreateDeliveryRequest):
    try:
        req = await DeliveryService.create_request(
            retailer_id=body.retailer_id,
            created_by=body.created_by,
            customer_name=body.customer_name,
            customer_phone=body.customer_phone,
            address=body.address,
            item_description=body.item_description
        )
        return req
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("", response_model=List[DeliveryRequestResponse])
async def list_delivery_requests(
    retailer_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    assigned_to: Optional[int] = Query(None)
):
    return await DeliveryService.list_requests(
        retailer_id=retailer_id,
        status=status,
        assigned_to=assigned_to
    )

@router.get("/{request_id}", response_model=DeliveryRequestResponse)
async def get_delivery_request(request_id: int):
    req = await DeliveryService.get_request(request_id)
    if not req:
        raise HTTPException(status_code=404, detail=f"Delivery request {request_id} not found.")
    return req

@router.get("/{request_id}/history", response_model=List[StatusEventResponse])
async def get_delivery_history(request_id: int):
    history = await DeliveryService.get_history(request_id)
    if history is None:
        raise HTTPException(status_code=404, detail=f"Delivery request {request_id} not found.")
    return history
