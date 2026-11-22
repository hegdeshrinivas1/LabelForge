"""
Raw SQL Analytics Queries.
Each query demonstrates advanced SQL concepts and is executed with parameterized inputs
for performance and security against SQL injection.
"""

# 1. Progress Breakdown
# SQL Concept: Conditional Aggregation (SUM with CASE WHEN)
# Performs a single pass over the tasks table to compute totals and counts per status,
# avoiding multiple separate COUNT queries.
SQL_PROJECT_PROGRESS = """
-- SQL Concept: Conditional Aggregation with single-pass table scan
SELECT
    COUNT(*) AS total_tasks,
    COALESCE(SUM(CASE WHEN t.status = 'PENDING' THEN 1 ELSE 0 END), 0) AS pending_count,
    COALESCE(SUM(CASE WHEN t.status = 'IN_PROGRESS' THEN 1 ELSE 0 END), 0) AS in_progress_count,
    COALESCE(SUM(CASE WHEN t.status = 'SUBMITTED' THEN 1 ELSE 0 END), 0) AS submitted_count,
    COALESCE(SUM(CASE WHEN t.status = 'APPROVED' THEN 1 ELSE 0 END), 0) AS approved_count,
    COALESCE(SUM(CASE WHEN t.status = 'REJECTED' THEN 1 ELSE 0 END), 0) AS rejected_count,
    ROUND(
        CASE 
            WHEN COUNT(*) = 0 THEN 0.0
            ELSE (CAST(SUM(CASE WHEN t.status = 'APPROVED' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*)) * 100.0
        END, 2
    ) AS completion_percentage
FROM tasks t
JOIN data_items di ON t.item_id = di.id
WHERE di.project_id = :project_id;
"""

# 2. Annotator Accuracy
# SQL Concept: Multi-table INNER JOINs with GROUP BY and aggregate ratio calculation
# Calculates accuracy as approved / (approved + rejected) for tasks with review decisions.
SQL_ANNOTATOR_ACCURACY = """
-- SQL Concept: Multi-table JOIN with GROUP BY and conditional ratio calculation
SELECT
    u.id AS user_id,
    u.name AS annotator_name,
    COUNT(r.id) AS total_reviewed,
    COALESCE(SUM(CASE WHEN r.decision = 'APPROVED' THEN 1 ELSE 0 END), 0) AS approved_count,
    COALESCE(SUM(CASE WHEN r.decision = 'REJECTED' THEN 1 ELSE 0 END), 0) AS rejected_count,
    ROUND(
        CASE 
            WHEN COUNT(r.id) = 0 THEN 0.0
            ELSE (CAST(SUM(CASE WHEN r.decision = 'APPROVED' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(r.id)) * 100.0
        END, 2
    ) AS accuracy_percentage
FROM tasks t
JOIN data_items di ON t.item_id = di.id
JOIN users u ON t.assigned_to = u.id
JOIN reviews r ON r.task_id = t.id
WHERE di.project_id = :project_id
GROUP BY u.id, u.name
ORDER BY accuracy_percentage DESC;
"""

# 3. Label Distribution for Approved Tasks
# SQL Concept: LEFT OUTER JOIN with categorical GROUP BY
# Counts occurrences of each label specifically for verified APPROVED annotations,
# ensuring labels with 0 approved annotations still appear in the distribution.
SQL_LABEL_DISTRIBUTION = """
-- SQL Concept: LEFT JOIN with categorical GROUP BY to preserve 0-count classes
SELECT
    l.id AS label_id,
    l.name AS label_name,
    l.color AS label_color,
    COUNT(CASE WHEN t.status = 'APPROVED' THEN a.id ELSE NULL END) AS approved_count
FROM labels l
LEFT JOIN annotations a ON l.id = a.label_id
LEFT JOIN tasks t ON a.task_id = t.id
LEFT JOIN data_items di ON t.item_id = di.id AND di.project_id = :project_id
WHERE l.project_id = :project_id
GROUP BY l.id, l.name, l.color
ORDER BY approved_count DESC;
"""

# 4. Daily Submission Throughput (Last 14 Days)
# SQL Concept: Temporal date truncation / formatting with bounded date filtering and aggregation
# SQLite uses DATE(t.submitted_at) and DATE('now', '-14 days').
# PostgreSQL uses DATE(t.submitted_at) and CURRENT_DATE - INTERVAL '14 days'.
SQL_DAILY_THROUGHPUT_SQLITE = """
-- SQL Concept: Temporal date formatting and grouping over a sliding 14-day window (SQLite)
SELECT
    DATE(t.submitted_at) AS submission_date,
    COUNT(*) AS submissions_count
FROM tasks t
JOIN data_items di ON t.item_id = di.id
WHERE di.project_id = :project_id
  AND t.submitted_at IS NOT NULL
  AND DATE(t.submitted_at) >= DATE('now', '-14 days')
GROUP BY DATE(t.submitted_at)
ORDER BY submission_date ASC;
"""

SQL_DAILY_THROUGHPUT_POSTGRES = """
-- SQL Concept: Temporal date truncation and grouping over a sliding 14-day window (PostgreSQL)
SELECT
    TO_CHAR(t.submitted_at, 'YYYY-MM-DD') AS submission_date,
    COUNT(*) AS submissions_count
FROM tasks t
JOIN data_items di ON t.item_id = di.id
WHERE di.project_id = :project_id
  AND t.submitted_at IS NOT NULL
  AND t.submitted_at >= CURRENT_DATE - INTERVAL '14 days'
GROUP BY TO_CHAR(t.submitted_at, 'YYYY-MM-DD')
ORDER BY submission_date ASC;
"""
