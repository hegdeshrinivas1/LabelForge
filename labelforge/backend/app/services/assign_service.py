from datetime import datetime, timezone
from typing import List, Dict
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models import Task, DataItem, User, Project
from app.schemas import AssignResult


def assign_project_tasks_round_robin(
    project_id: int,
    annotator_ids: List[int],
    db: Session
) -> AssignResult:
    """
    Distribute unassigned tasks in a project among the specified annotators in round-robin fashion.
    
    Validations:
    - Verifies the project exists.
    - Validates that every provided annotator ID exists, is active, and has role 'annotator'.
    - Assigns unassigned tasks, stamps assigned_at UTC timestamp, and commits the transaction.
    """
    # 1. Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )

    # 2. Validate annotators
    unique_ids = list(dict.fromkeys(annotator_ids))  # preserve order, eliminate dupes
    annotators = db.query(User).filter(
        User.id.in_(unique_ids),
        User.role == "annotator",
        User.is_active == True
    ).all()

    found_ids = {u.id for u in annotators}
    invalid_ids = [uid for uid in unique_ids if uid not in found_ids]
    if invalid_ids:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid or inactive annotator ID(s): {invalid_ids}. Users must have role 'annotator'."
        )

    # 3. Query unassigned tasks in this project
    unassigned_tasks = (
        db.query(Task)
        .join(DataItem, Task.item_id == DataItem.id)
        .filter(
            DataItem.project_id == project_id,
            Task.assigned_to.is_(None)
        )
        .order_by(Task.id.asc())
        .all()
    )

    if not unassigned_tasks:
        return AssignResult(
            assigned_count=0,
            distribution={uid: 0 for uid in unique_ids}
        )

    # 4. Round-robin assignment
    distribution: Dict[int, int] = {uid: 0 for uid in unique_ids}
    now = datetime.now(timezone.utc)
    num_annotators = len(unique_ids)

    for idx, task in enumerate(unassigned_tasks):
        assigned_user_id = unique_ids[idx % num_annotators]
        task.assigned_to = assigned_user_id
        task.assigned_at = now
        distribution[assigned_user_id] += 1

    db.commit()

    return AssignResult(
        assigned_count=len(unassigned_tasks),
        distribution=distribution
    )
