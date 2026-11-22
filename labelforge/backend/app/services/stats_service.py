from typing import List
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.config import get_settings
from app.schemas import (
    ProgressStats,
    AnnotatorAccuracy,
    LabelDistribution,
    DailyThroughput,
    ProjectStats
)
from app.sql.queries import (
    SQL_PROJECT_PROGRESS,
    SQL_ANNOTATOR_ACCURACY,
    SQL_LABEL_DISTRIBUTION,
    SQL_DAILY_THROUGHPUT_SQLITE,
    SQL_DAILY_THROUGHPUT_POSTGRES
)

settings = get_settings()


def get_project_statistics_raw_sql(project_id: int, db: Session) -> ProjectStats:
    """
    Compute project statistics using raw parameterized SQL queries.
    Demonstrates pure SQL aggregations, conditional pivoting, joins, and temporal windowing.
    """
    params = {"project_id": project_id}

    # 1. Query Progress (Single Table Scan via Conditional Aggregation)
    progress_row = db.execute(text(SQL_PROJECT_PROGRESS), params).mappings().first()
    if progress_row:
        progress = ProgressStats(
            total_tasks=progress_row["total_tasks"] or 0,
            pending_count=progress_row["pending_count"] or 0,
            in_progress_count=progress_row["in_progress_count"] or 0,
            submitted_count=progress_row["submitted_count"] or 0,
            approved_count=progress_row["approved_count"] or 0,
            rejected_count=progress_row["rejected_count"] or 0,
            completion_percentage=float(progress_row["completion_percentage"] or 0.0)
        )
    else:
        progress = ProgressStats(
            total_tasks=0,
            pending_count=0,
            in_progress_count=0,
            submitted_count=0,
            approved_count=0,
            rejected_count=0,
            completion_percentage=0.0
        )

    # 2. Query Annotator Accuracy (Multi-table Joins)
    accuracy_rows = db.execute(text(SQL_ANNOTATOR_ACCURACY), params).mappings().all()
    annotator_accuracy: List[AnnotatorAccuracy] = [
        AnnotatorAccuracy(
            user_id=row["user_id"],
            annotator_name=row["annotator_name"],
            total_reviewed=row["total_reviewed"] or 0,
            approved_count=row["approved_count"] or 0,
            rejected_count=row["rejected_count"] or 0,
            accuracy_percentage=float(row["accuracy_percentage"] or 0.0)
        )
        for row in accuracy_rows
    ]

    # 3. Query Label Distribution (LEFT JOIN for Class Balance)
    label_rows = db.execute(text(SQL_LABEL_DISTRIBUTION), params).mappings().all()
    label_distribution: List[LabelDistribution] = [
        LabelDistribution(
            label_id=row["label_id"],
            label_name=row["label_name"],
            label_color=row["label_color"],
            approved_count=row["approved_count"] or 0
        )
        for row in label_rows
    ]

    # 4. Query Daily Throughput (Temporal Grouping over 14 Days)
    is_postgres = settings.DATABASE_URL.startswith("postgresql")
    throughput_sql = SQL_DAILY_THROUGHPUT_POSTGRES if is_postgres else SQL_DAILY_THROUGHPUT_SQLITE
    throughput_rows = db.execute(text(throughput_sql), params).mappings().all()
    daily_throughput: List[DailyThroughput] = [
        DailyThroughput(
            submission_date=str(row["submission_date"]),
            submissions_count=row["submissions_count"] or 0
        )
        for row in throughput_rows
    ]

    return ProjectStats(
        progress=progress,
        annotator_accuracy=annotator_accuracy,
        label_distribution=label_distribution,
        daily_throughput=daily_throughput
    )
