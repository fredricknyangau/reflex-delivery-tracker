from fastapi import APIRouter, HTTPException, status
from app.schemas.delivery import UpdateStatusRequest, DeliveryRequestResponse
from app.services.delivery_service import DeliveryService

router = APIRouter(prefix="/requests", tags=["Status"])

@router.post("/{request_id}/status", response_model=DeliveryRequestResponse)
async def update_delivery_status(request_id: int, body: UpdateStatusRequest):
    try:
        new_status = body.status
        if new_status == "Picked Up":
            return await DeliveryService.mark_picked_up(
                request_id=request_id,
                changed_by=body.changed_by
            )
        elif new_status == "Delivered":
            return await DeliveryService.mark_delivered(
                request_id=request_id,
                changed_by=body.changed_by,
                confirmation_code=body.confirmation_code
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid target status '{new_status}'. Allowed transitions: 'Picked Up', 'Delivered'."
            )
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
