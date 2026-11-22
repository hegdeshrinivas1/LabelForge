# Test Strategy & Quality Assurance Report
## Project: LabelForge

---

### 1. Test Strategy Overview

LabelForge employs an automated testing strategy targeting core business logic, role-based access control, file ingestion, deterministic state transitions, raw SQL analytics, and dataset export integrity.

#### Core Principles:
- **In-Memory SQLite Isolation**: All unit and integration tests run against an in-memory SQLite database (`sqlite:///:memory:`) using SQLAlchemy's `StaticPool`. This guarantees that tests execute in sub-second time without mutating persistent database state or relying on external running services.
- **Transactional Rollback per Test**: Each test function is provided with an isolated database session rolled back upon teardown, ensuring zero cross-test state pollution.
- **FastAPI TestClient**: Tests exercise the full HTTP stack through FastAPI's `TestClient`, validating request serialization, Pydantic validation, dependency injection, and HTTP status codes.
- **Automated CI Integration**: The entire test suite is automatically triggered on every push and pull request via GitHub Actions.

---

### 2. Test Execution & Coverage Matrix

| Test ID | Category | Test Function Name | Objective / Scenario | Expected Status | Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TC-AUTH-01` | Auth | `test_register_success` | Valid registration creates user with role `annotator` without returning password hash | `201 Created` | **PASS** |
| `TC-AUTH-02` | Auth | `test_register_duplicate_email` | Registering an existing email is rejected with duplicate warning | `409 Conflict` | **PASS** |
| `TC-AUTH-03` | Auth | `test_register_short_password` | Passwords shorter than 8 characters fail Pydantic validation | `422 Unprocessable` | **PASS** |
| `TC-AUTH-04` | Auth | `test_login_success` | Valid email/password returns signed JWT bearer token and user profile | `200 OK` | **PASS** |
| `TC-AUTH-05` | Auth | `test_login_invalid_password` | Incorrect password returns authentication failure | `401 Unauthorized` | **PASS** |
| `TC-AUTH-06` | Auth | `test_get_me` | Authenticated user retrieves own profile via Bearer token | `200 OK` | **PASS** |
| `TC-AUTH-07` | RBAC | `test_require_role_admin_forbidden_for_annotator` | Annotator attempting to access admin user list is rejected | `403 Forbidden` | **PASS** |
| `TC-AUTH-08` | RBAC | `test_require_role_admin_allowed_for_admin` | Admin successfully queries user list | `200 OK` | **PASS** |
| `TC-PROJ-01` | Project | `test_create_project_admin` | Admin creates new project with title and description | `201 Created` | **PASS** |
| `TC-PROJ-02` | Project | `test_create_project_forbidden_for_annotator` | Non-admin blocked from project creation | `403 Forbidden` | **PASS** |
| `TC-PROJ-03` | Labels | `test_create_label_and_duplicate_prevention` | Duplicate label name in same project is rejected | `409 Conflict` | **PASS** |
| `TC-DATA-01` | Upload | `test_upload_valid_csv_and_task_spawning` | Uploading CSV inserts items and spawns linked PENDING tasks | `201 Created` | **PASS** |
| `TC-DATA-02` | Upload | `test_upload_csv_skips_empty_and_duplicate_rows` | Deduplication engine skips blank and duplicate text rows | `201 Created` | **PASS** |
| `TC-DATA-03` | Upload | `test_upload_bad_file_extension` | Unsupported file extensions (.txt) are rejected | `400 Bad Request` | **PASS** |
| `TC-DATA-04` | Upload | `test_upload_missing_text_column` | CSV files missing mandatory 'text' header are rejected | `400 Bad Request` | **PASS** |
| `TC-DATA-05` | Assign | `test_round_robin_assignment` | Unassigned tasks distributed evenly among annotators | `200 OK` | **PASS** |
| `TC-WORK-01` | Workflow | `test_full_lifecycle_workflow` | Complete cycle: assign -> annotate -> reject -> re-annotate -> approve | `200 OK` | **PASS** |
| `TC-WORK-02` | Workflow | `test_prevent_self_review_bias` | Reviewer prevented from approving a task assigned to themselves | `403 Forbidden` | **PASS** |
| `TC-WORK-03` | Workflow | `test_rejection_requires_comment` | Rejection without explanatory feedback is blocked | `422 Unprocessable` | **PASS** |
| `TC-WORK-04` | Workflow | `test_invalid_status_transition_conflict` | Re-annotating an already APPROVED task is rejected | `409 Conflict` | **PASS** |
| `TC-STAT-01` | Stats | `test_stats_raw_sql_computation` | Raw SQL aggregations match exact seeded values for progress & accuracy | `200 OK` | **PASS** |
| `TC-EXP-01` | Export | `test_export_only_approved_rows` | CSV & JSON exports strictly filter for APPROVED items; annotator blocked | `200 OK / 403` | **PASS** |

---

### 3. Running Tests Locally

```powershell
cd labelforge/backend
.\venv\Scripts\pytest -v
```
