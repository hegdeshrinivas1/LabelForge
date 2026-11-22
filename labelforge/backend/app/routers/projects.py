import math
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import Project, Label, User, Task, DataItem
from app.auth import get_current_user, require_role
from app.schemas import (
    ProjectCreate,
    ProjectUpdate,
    ProjectSummary,
    ProjectDetail,
    LabelCreate,
    LabelResponse,
    PaginatedResponse,
    MessageResponse,
    UploadSummary,
    AssignTasks,
    AssignResult,
    ProjectStats
)
from app.services.ingest_service import process_text_upload
from app.services.assign_service import assign_project_tasks_round_robin
from app.services.stats_service import get_project_statistics_raw_sql
from app.services.export_service import export_approved_dataset

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.post(
    "",
    response_model=ProjectDetail,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new annotation project (Admin only)"
)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role("admin"))
):
    """Create a new project with a unique name and optional description."""
    existing = db.query(Project).filter(Project.name == payload.name.strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Project with name '{payload.name}' already exists"
        )

    project = Project(
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else None,
        created_by=admin_user.id
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    return ProjectDetail(
        id=project.id,
        name=project.name,
        description=project.description,
        created_by=project.created_by,
        created_at=project.created_at,
        total_tasks=0,
        completed_tasks=0,
        labels=[]
    )


@router.get(
    "",
    response_model=PaginatedResponse[ProjectSummary],
    summary="List all projects with pagination and progress summary"
)
def list_projects(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve a paginated list of projects with task progress indicators."""
    total_projects = db.query(func.count(Project.id)).scalar() or 0
    total_pages = math.ceil(total_projects / limit) if total_projects > 0 else 1

    projects = (
        db.query(Project)
        .order_by(Project.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    items: List[ProjectSummary] = []
    for p in projects:
        # Calculate task totals
        total_tasks = (
            db.query(func.count(Task.id))
            .join(DataItem, Task.item_id == DataItem.id)
            .filter(DataItem.project_id == p.id)
            .scalar() or 0
        )
        completed_tasks = (
            db.query(func.count(Task.id))
            .join(DataItem, Task.item_id == DataItem.id)
            .filter(DataItem.project_id == p.id, Task.status == "APPROVED")
            .scalar() or 0
        )

        items.append(
            ProjectSummary(
                id=p.id,
                name=p.name,
                description=p.description,
                created_by=p.created_by,
                created_at=p.created_at,
                total_tasks=total_tasks,
                completed_tasks=completed_tasks
            )
        )

    return PaginatedResponse[ProjectSummary](
        items=items,
        total=total_projects,
        page=page,
        limit=limit,
        total_pages=total_pages
    )


@router.get(
    "/{project_id}",
    response_model=ProjectDetail,
    summary="Get project details, labels, and task counts"
)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve full project metadata, label scheme, and task statistics."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )

    total_tasks = (
        db.query(func.count(Task.id))
        .join(DataItem, Task.item_id == DataItem.id)
        .filter(DataItem.project_id == project.id)
        .scalar() or 0
    )
    completed_tasks = (
        db.query(func.count(Task.id))
        .join(DataItem, Task.item_id == DataItem.id)
        .filter(DataItem.project_id == project.id, Task.status == "APPROVED")
        .scalar() or 0
    )

    labels = (
        db.query(Label)
        .filter(Label.project_id == project.id)
        .order_by(Label.id.asc())
        .all()
    )

    return ProjectDetail(
        id=project.id,
        name=project.name,
        description=project.description,
        created_by=project.created_by,
        created_at=project.created_at,
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        labels=[LabelResponse.model_validate(l) for l in labels]
    )


@router.put(
    "/{project_id}",
    response_model=ProjectDetail,
    summary="Update project name or description (Admin only)"
)
def update_project(
    project_id: int,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role("admin"))
):
    """Update metadata for an existing project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )

    if payload.name is not None:
        name_clean = payload.name.strip()
        # Ensure name uniqueness among other projects
        duplicate = db.query(Project).filter(Project.name == name_clean, Project.id != project_id).first()
        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Another project named '{name_clean}' already exists"
            )
        project.name = name_clean

    if payload.description is not None:
        project.description = payload.description.strip()

    db.commit()
    db.refresh(project)

    return get_project(project_id=project.id, db=db, current_user=admin_user)


@router.delete(
    "/{project_id}",
    response_model=MessageResponse,
    summary="Delete a project and its associated data (Admin only)"
)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role("admin"))
):
    """Delete a project. Cascades to associated labels, data items, and tasks."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )

    name = project.name
    db.delete(project)
    db.commit()

    return MessageResponse(message=f"Project '{name}' and all associated tasks deleted successfully")


# =====================================================
# Label Sub-Endpoints
# =====================================================

@router.post(
    "/{project_id}/labels",
    response_model=LabelResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a label to a project (Admin only)"
)
def add_label_to_project(
    project_id: int,
    payload: LabelCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role("admin"))
):
    """
    Define a new colored label for a project.
    - Name must be unique within the project.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )

    clean_name = payload.name.strip()
    existing_label = db.query(Label).filter(
        Label.project_id == project_id,
        func.lower(Label.name) == clean_name.lower()
    ).first()

    if existing_label:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Label '{clean_name}' already exists in this project"
        )

    label = Label(
        project_id=project_id,
        name=clean_name,
        color=payload.color.strip()
    )
    db.add(label)
    db.commit()
    db.refresh(label)

    return label


@router.get(
    "/{project_id}/labels",
    response_model=List[LabelResponse],
    summary="Get all labels configured for a project"
)
def get_project_labels(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all classification labels defined for a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )

    return db.query(Label).filter(Label.project_id == project_id).order_by(Label.id.asc()).all()


# =====================================================
# Upload & Task Ingestion
# =====================================================

@router.post(
    "/{project_id}/upload",
    response_model=UploadSummary,
    status_code=status.HTTP_201_CREATED,
    summary="Upload CSV or JSON dataset and generate annotation tasks (Admin only)"
)
async def upload_project_data(
    project_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role("admin"))
):
    """
    Ingest text data from a CSV or JSON file:
    - Supported extensions: .csv, .json
    - Required field/column: 'text'
    - Maximum 5,000 rows
    - Deduplicates against existing project data and internal batch duplicates
    - Instantiates DataItems and linked PENDING Tasks
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )

    inserted, skipped, total = await process_text_upload(
        project_id=project_id,
        file=file,
        db=db,
        max_rows=5000
    )

    return UploadSummary(
        inserted=inserted,
        skipped=skipped,
        total_processed=total
    )


# =====================================================
# Round-Robin Task Assignment
# =====================================================

@router.post(
    "/{project_id}/assign",
    response_model=AssignResult,
    summary="Distribute unassigned tasks across annotators (Admin only)"
)
def assign_tasks(
    project_id: int,
    payload: AssignTasks,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role("admin"))
):
    """
    Perform round-robin task assignment of unassigned tasks in the project.
    - Validates annotator IDs.
    - Updates task status tracking and timestamps.
    """
    return assign_project_tasks_round_robin(
        project_id=project_id,
        annotator_ids=payload.annotator_ids,
        db=db
    )


# =====================================================
# Real-Time Raw SQL Analytics & Dataset Export
# =====================================================

@router.get(
    "/{project_id}/stats",
    response_model=ProjectStats,
    summary="Get real-time project statistics computed via raw SQL (Admin/Reviewer)"
)
def get_project_stats(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "reviewer"]))
):
    """
    Retrieve real-time project metrics:
    - Overall task progress breakdown and completion rate
    - Annotator accuracy rates (approved vs rejected)
    - Label distribution across approved items
    - 14-day daily submission throughput velocity
    Computed using optimized raw parameterized SQL queries.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )

    return get_project_statistics_raw_sql(project_id=project_id, db=db)


@router.get(
    "/{project_id}/export",
    summary="Export verified approved dataset in CSV or JSON format (Admin only)"
)
def export_dataset(
    project_id: int,
    format: str = Query("csv", pattern="^(csv|json)$", description="Export format: 'csv' or 'json'"),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role("admin"))
):
    """
    Download a clean, machine-learning-ready dataset.
    - Strictly filters for tasks in APPROVED status.
    - Exports text, applied label, annotator info, and review timestamp.
    """
    return export_approved_dataset(
        project_id=project_id,
        export_format=format,
        db=db
    )

