from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import UserResponse, UserRole
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/users", tags=["Users"])


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current authenticated user profile"
)
def get_me(current_user: User = Depends(get_current_user)):
    """Return profile details for the currently authenticated user."""
    return current_user


@router.get(
    "",
    response_model=List[UserResponse],
    summary="List all users with optional role filtering (Admin only)"
)
def list_users(
    role: Optional[UserRole] = Query(None, description="Filter users by role"),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role("admin"))
):
    """
    Retrieve all users.
    - Restricted to 'admin' role.
    - Can be filtered by role (e.g. `role=annotator`).
    """
    query = db.query(User)
    if role:
        query = query.filter(User.role == role.value)
    users = query.order_by(User.id.asc()).all()
    return users
