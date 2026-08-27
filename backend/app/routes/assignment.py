from fastapi import APIRouter, HTTPException, status
from app.schemas.delivery import AssignRiderRequest, DeliveryRequestResponse
from app.services.delivery_service import DeliveryService

router = APIRouter(prefix="/requests", tags=["Assignment"])

@router.post("/{request_id}/assign", response_model=DeliveryRequestResponse)
async def assign_rider(request_id: int, body: AssignRiderRequest):
    try:
        req = await DeliveryService.assign_rider(
            request_id=request_id,
            assigned_rider_id=body.assigned_rider_id,
            changed_by=body.changed_by
        )
        return req
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
