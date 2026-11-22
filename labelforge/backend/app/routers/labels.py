from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.database import get_db
from app.models import Label, User, Annotation
from app.auth import require_role
from app.schemas import MessageResponse

router = APIRouter(prefix="/labels", tags=["Labels"])


@router.delete(
    "/{label_id}",
    response_model=MessageResponse,
    summary="Delete a label (Admin only)"
)
def delete_label(
    label_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role("admin"))
):
    """
    Delete a label by its ID.
    - Restricted to 'admin' role.
    - Prohibited if the label is actively referenced by existing task annotations.
    """
    label = db.query(Label).filter(Label.id == label_id).first()
    if not label:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Label with ID {label_id} not found"
        )

    # Check for active annotation references
    active_ref = db.query(Annotation).filter(Annotation.label_id == label_id).first()
    if active_ref:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete label: it is currently used by one or more annotations."
        )

    try:
        db.delete(label)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete label due to database integrity constraints."
        )

    return MessageResponse(message=f"Label '{label.name}' deleted successfully")
