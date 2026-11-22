from datetime import datetime
from enum import Enum
from typing import Optional, List, Any, Generic, TypeVar
from pydantic import BaseModel, EmailStr, Field, ConfigDict

# =====================================================
# Enums
# =====================================================

class UserRole(str, Enum):
    ADMIN = "admin"
    ANNOTATOR = "annotator"
    REVIEWER = "reviewer"


class TaskStatus(str, Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    SUBMITTED = "SUBMITTED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class ReviewDecision(str, Enum):
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


# =====================================================
# Generic Response Wrappers
# =====================================================

T = TypeVar("T")

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    limit: int
    total_pages: int


class MessageResponse(BaseModel):
    message: str


# =====================================================
# User & Auth Schemas
# =====================================================

class UserBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Full name of user")
    email: EmailStr = Field(..., description="Unique email address")


class UserRegister(UserBase):
    password: str = Field(..., min_length=8, description="Password with minimum 8 characters")


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: int
    role: UserRole
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    exp: Optional[int] = None


# =====================================================
# Label Schemas
# =====================================================

class LabelBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    color: str = Field(default="#4F46E5", max_length=20, description="Hex color code, e.g., #4F46E5")


class LabelCreate(LabelBase):
    pass


class LabelResponse(LabelBase):
    id: int
    project_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =====================================================
# Project Schemas
# =====================================================

class ProjectBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    description: Optional[str] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    description: Optional[str] = None


class ProjectSummary(ProjectBase):
    id: int
    created_by: int
    created_at: datetime
    total_tasks: Optional[int] = 0
    completed_tasks: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)


class ProjectDetail(ProjectSummary):
    labels: List[LabelResponse] = []


# =====================================================
# Ingestion & Assignment Schemas
# =====================================================

class UploadSummary(BaseModel):
    inserted: int
    skipped: int
    total_processed: int


class AssignTasks(BaseModel):
    annotator_ids: List[int] = Field(..., min_length=1, description="List of user IDs with role 'annotator'")


class AssignResult(BaseModel):
    assigned_count: int
    distribution: dict[int, int]  # user_id -> count of tasks assigned


# =====================================================
# Task & Annotation Schemas
# =====================================================

class DataItemResponse(BaseModel):
    id: int
    project_id: int
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AnnotationResponse(BaseModel):
    id: int
    task_id: int
    label_id: int
    label: Optional[LabelResponse] = None
    annotated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReviewResponse(BaseModel):
    id: int
    task_id: int
    reviewer_id: int
    decision: ReviewDecision
    comment: Optional[str] = None
    reviewed_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TaskListItem(BaseModel):
    id: int
    item_id: int
    content: str
    project_id: int
    project_name: Optional[str] = None
    project_description: Optional[str] = None
    status: TaskStatus
    assigned_to: Optional[int] = None
    submitted_at: Optional[datetime] = None
    updated_at: datetime
    label: Optional[LabelResponse] = None
    latest_review_comment: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TaskDetail(BaseModel):
    id: int
    item: DataItemResponse
    project_name: Optional[str] = None
    project_description: Optional[str] = None
    status: TaskStatus
    assigned_to: Optional[int] = None
    annotation: Optional[AnnotationResponse] = None
    latest_review: Optional[ReviewResponse] = None
    available_labels: List[LabelResponse] = []

    model_config = ConfigDict(from_attributes=True)


class AnnotateTask(BaseModel):
    label_id: int


class ReviewSubmit(BaseModel):
    decision: ReviewDecision
    comment: Optional[str] = None


# =====================================================
# Stats & Analytics Schemas
# =====================================================

class ProgressStats(BaseModel):
    total_tasks: int
    pending_count: int
    in_progress_count: int
    submitted_count: int
    approved_count: int
    rejected_count: int
    completion_percentage: float


class AnnotatorAccuracy(BaseModel):
    user_id: int
    annotator_name: str
    total_reviewed: int
    approved_count: int
    rejected_count: int
    accuracy_percentage: float


class LabelDistribution(BaseModel):
    label_id: int
    label_name: str
    label_color: str
    approved_count: int


class DailyThroughput(BaseModel):
    submission_date: str
    submissions_count: int


class ProjectStats(BaseModel):
    progress: ProgressStats
    annotator_accuracy: List[AnnotatorAccuracy]
    label_distribution: List[LabelDistribution]
    daily_throughput: List[DailyThroughput]
