# Software Requirements Specification (SRS)
## Project Name: LabelForge — Collaborative Data Annotation Platform

---

### 1. Introduction & Purpose

#### 1.1 Purpose
LabelForge is a lightweight, high-performance web platform for text data annotation and dataset curation. Designed as a specialized alternative to heavier tools like Label Studio, LabelForge enables data science and machine learning teams to ingest raw textual data, distribute labeling tasks across annotators, enforce multi-tiered quality control through reviewer approval workflows, and export machine-learning-ready datasets.

#### 1.2 Scope
The scope of LabelForge includes:
- Role-based authentication and authorization (Admin, Annotator, Reviewer).
- Project lifecycle management and configurable label taxonomies.
- High-throughput text data ingestion (CSV/JSON) with automated task generation and deduplication.
- Deterministic round-robin task assignment across active annotator pools.
- Ergonomic annotator workbench with single-key shortcuts and reviewer feedback loops.
- Dedicated reviewer validation queue preventing self-review bias.
- Real-time analytical dashboard powered by raw SQL aggregation.
- ML-ready dataset export in CSV and JSON formats restricted to quality-approved samples.

---

### 2. User Roles & Personas

| Role | Description | Core Responsibilities | Access Boundaries |
| :--- | :--- | :--- | :--- |
| **Admin** | Data Manager / Project Lead | Creates projects, defines label schemes, uploads text data, distributes tasks, tracks productivity/accuracy, exports clean data, manages platform users. | Unrestricted platform access across all projects, users, tasks, and system metrics. |
| **Annotator** | Machine Learning Contributor | Consumes assigned text items, applies appropriate categorical labels using UI and keyboard shortcuts, reviews reviewer rejection feedback, and resubmits corrected annotations. | Strictly scoped to tasks assigned directly to their user ID. Cannot see other annotators' tasks or unassigned project pools. |
| **Reviewer** | Quality Assurance Specialist | Inspects submitted annotations across assigned or all projects, validates accuracy against project guidelines, approves valid labels, or rejects suboptimal labels with required explanatory feedback. | Access to all tasks in `SUBMITTED` state. Strictly barred from reviewing tasks where they are the assigned annotator (conflict of interest prevention). |

---

### 3. Workflow & Task State Transition Model

```
                    +------------------------------------+
                    |                                    |
                    v                                    |
+---------+    +-------------+    +-----------+    +-------------+
| PENDING |--->| IN_PROGRESS |--->| SUBMITTED |--->|  REJECTED   |
+---------+    +-------------+    +-----------+    +-------------+
                      |                 |
                      |                 v
                      |          +-------------+
                      +--------->|  APPROVED   |
                                 +-------------+
```

1. **PENDING**: Task created upon data ingestion, unassigned or assigned, awaiting annotator action.
2. **IN_PROGRESS**: Annotator has viewed or begun work on the assigned task.
3. **SUBMITTED**: Annotator has chosen a valid label and submitted the annotation for quality assurance.
4. **APPROVED**: Reviewer verified the annotation meets guidelines. Terminal state ready for export.
5. **REJECTED**: Reviewer flagged inaccurate label with compulsory feedback. State reverts to `IN_PROGRESS` when opened by the annotator for correction.

---

### 4. Functional Requirements

#### 4.1 Authentication & User Management
- **FR-AUTH-01**: System shall authenticate users via email and password using bcrypt-hashed credentials.
- **FR-AUTH-02**: System shall issue a signed JSON Web Token (JWT) with HS256 algorithm and 60-minute expiration upon successful login.
- **FR-AUTH-03**: System shall enforce role-based access control (RBAC) on every protected endpoint via dependency injection.
- **FR-AUTH-04**: System shall allow Admins to query user lists filtered by role (`admin`, `annotator`, `reviewer`).
- **FR-AUTH-05**: System shall prohibit self-assignment of roles during public registration (default role: `annotator`, admin privilege assignment reserved for existing admins or seed configuration).

#### 4.2 Project & Label Management
- **FR-PROJ-01**: Admins shall create, retrieve, update, and delete annotation projects with names and descriptions.
- **FR-PROJ-02**: Admins shall define multi-colored categorical labels per project with unique name constraints per project.
- **FR-PROJ-03**: System shall cascade delete labels and data items when a project is deleted.
- **FR-PROJ-04**: System shall prohibit assigning a label to a task if the label does not belong to the task's parent project.

#### 4.3 Data Ingestion & Assignment
- **FR-DATA-01**: System shall accept data file uploads in `.csv` or `.json` formats with a mandatory `text` field/column up to 5,000 items per request.
- **FR-DATA-02**: Ingestion pipeline shall filter out null, blank, and duplicate text within the uploaded batch and existing project data.
- **FR-DATA-03**: Ingestion response must return an exact operation summary: `{ "inserted": count, "skipped": count }`.
- **FR-DATA-04**: Each inserted `data_item` must automatically instantiate a linked `task` initialized in `PENDING` status.
- **FR-DATA-05**: Admins shall trigger round-robin assignment for all unassigned tasks in a project across a selected list of annotator IDs.

#### 4.4 Annotation Workbench
- **FR-ANNO-01**: Annotators shall view only tasks assigned to them, filterable by status (`PENDING`, `IN_PROGRESS`, `SUBMITTED`, `REJECTED`).
- **FR-ANNO-02**: Annotators shall view the text content, project metadata, and available project labels on the labeling screen.
- **FR-ANNO-03**: Workbench must provide keyboard shortcuts (numeric keys `1`–`9` for label selection, `Enter` for submission).
- **FR-ANNO-04**: When viewing a `REJECTED` task, the interface must prominently display the reviewer's feedback comment.
- **FR-ANNO-05**: Submitting an annotation shall upsert the `annotations` record and transition task status to `SUBMITTED`.

#### 4.5 Quality Control & Review
- **FR-REV-01**: Reviewers shall query a global or project-filtered queue of tasks in `SUBMITTED` status.
- **FR-REV-02**: System shall strictly reject any review attempt where `reviewer_id == task.assigned_to` with HTTP 403 Forbidden.
- **FR-REV-03**: Reviewers can set decision to `APPROVED` or `REJECTED`.
- **FR-REV-04**: When decision is `REJECTED`, a non-empty `comment` string is strictly enforced.
- **FR-REV-05**: Submitting a review records an entry in `reviews` and transitions task status to `APPROVED` or `REJECTED`.

#### 4.6 Analytics & Metrics
- **FR-STAT-01**: System shall compute real-time project progress (total tasks, count per status, completion percentage) using raw SQL conditional aggregation.
- **FR-STAT-02**: System shall compute annotator accuracy percentage (`approved / (approved + rejected) * 100`) using raw SQL joins between `tasks` and `reviews`.
- **FR-STAT-03**: System shall calculate label distribution for all `APPROVED` tasks using raw SQL aggregation.
- **FR-STAT-04**: System shall compute daily throughput trends over the trailing 14 calendar days using raw SQL date truncations and grouping.

#### 4.7 Dataset Export
- **FR-EXP-01**: System shall permit Admins to export project datasets formatted as CSV or JSON.
- **FR-EXP-02**: System shall strictly restrict exported records to tasks with `APPROVED` status, joining `data_items.content`, `labels.name`, `users.name` (annotator), and `reviews.reviewed_at`.

---

### 5. Non-Functional Requirements

- **NFR-PERF-01 (Throughput & Latency)**: Text ingestion of 5,000 records shall complete within 2.5 seconds on local SQLite and 1.2 seconds on PostgreSQL using bulk insertion batching.
- **NFR-PERF-02 (API Response Time)**: 95th percentile response times for task retrieval and submission endpoints shall not exceed 80ms under typical loads.
- **NFR-SEC-01 (Credential Storage)**: Passwords must be hashed using `bcrypt` with a minimum cost factor of 12. Password hashes shall never be serialized in API responses.
- **NFR-SEC-02 (CORS)**: Cross-Origin Resource Sharing shall be explicitly bound to the configured frontend domain (`FRONTEND_URL` in `.env`).
- **NFR-SEC-03 (Injection Prevention)**: All SQL queries executed through SQLAlchemy ORM and raw SQL executions must utilize strict parameter binding; zero dynamic string interpolation.
- **NFR-REL-01 (ACID Compliance)**: Batch uploads, task assignments, and review state transitions must execute inside explicit database transactions that automatically rollback on error.
- **NFR-USAB-01 (Accessibility & Responsiveness)**: The web UI must adhere to WCAG 2.1 AA guidelines, including minimum 4.5:1 text contrast ratios, visible focus indicators, aria labels for screen readers, and responsiveness down to 360px viewport widths.

---

### 6. User Stories & Acceptance Criteria

```
Legend: Given [Precondition] | When [Action/Event] | Then [Expected Result]
```

#### Story 1: User Registration
- **ID**: `US-01`
- **As a**: New contributor
- **I want to**: Register an account with my name, email, and password
- **So that**: I can log in and access assigned annotation tasks
- **Acceptance Criteria**:
  - *Given* a unique email and password of at least 8 characters,
  - *When* I submit the registration form,
  - *Then* the system creates my account with role `annotator`, returns HTTP 201, and hashes my password with bcrypt.
  - *Given* an email that already exists in the system,
  - *When* I attempt to register,
  - *Then* the system rejects the request with HTTP 409 Conflict and an informative error message.

#### Story 2: Secure Authentication
- **ID**: `US-02`
- **As a**: Registered user
- **I want to**: Authenticate using my email and password
- **So that**: I receive an authorization token to access role-specific endpoints
- **Acceptance Criteria**:
  - *Given* valid user credentials,
  - *When* I post to `/api/v1/auth/login`,
  - *Then* the system returns HTTP 200 with a Bearer JWT containing my user ID, role, and a 60-minute expiry timestamp.
  - *Given* invalid credentials,
  - *When* I attempt login,
  - *Then* the system returns HTTP 401 Unauthorized without disclosing whether the email or password was invalid.

#### Story 3: Project Creation
- **ID**: `US-03`
- **As an**: Admin
- **I want to**: Create a new annotation project with a title and guidelines
- **So that**: I can organize textual datasets and target classification goals
- **Acceptance Criteria**:
  - *Given* an authenticated user with role `admin`,
  - *When* I send a POST request to `/api/v1/projects` with `name` and `description`,
  - *Then* the project is created in the database and returned with HTTP 201 Created.
  - *Given* an authenticated user with role `annotator`,
  - *When* they attempt to create a project,
  - *Then* the system blocks the request with HTTP 403 Forbidden.

#### Story 4: Label Taxonomy Definition
- **ID**: `US-04`
- **As an**: Admin
- **I want to**: Define colored category labels for a project
- **So that**: Annotators have a predetermined set of classification targets
- **Acceptance Criteria**:
  - *Given* an existing project ID,
  - *When* an Admin posts a label with `name` and hex `color` to `/api/v1/projects/{id}/labels`,
  - *Then* the label is saved and returned with HTTP 201.
  - *Given* an attempt to add a label with a name that already exists in the same project,
  - *When* submitted,
  - *Then* the database constraint triggers an HTTP 409 Conflict.

#### Story 5: Bulk Text Ingestion
- **ID**: `US-05`
- **As an**: Admin
- **I want to**: Upload CSV or JSON files containing thousands of text samples
- **So that**: Data items and corresponding annotation tasks are generated automatically
- **Acceptance Criteria**:
  - *Given* a CSV or JSON file containing a `text` header/attribute with 500 rows,
  - *When* uploaded to `/api/v1/projects/{id}/upload`,
  - *Then* 500 `data_items` and 500 associated `tasks` in `PENDING` status are created, returning `{ "inserted": 500, "skipped": 0 }` with HTTP 201.
  - *Given* a file containing empty text rows and duplicates,
  - *When* uploaded,
  - *Then* empty and duplicate rows are skipped, and the summary accurately counts `{ "inserted": N, "skipped": M }`.

#### Story 6: Round-Robin Task Assignment
- **ID**: `US-06`
- **As an**: Admin
- **I want to**: Select active annotators and trigger round-robin assignment
- **So that**: Workload is distributed evenly across the team
- **Acceptance Criteria**:
  - *Given* 100 unassigned tasks in a project and a list of 4 annotator IDs,
  - *When* Admin calls POST `/api/v1/projects/{id}/assign`,
  - *Then* each annotator is assigned exactly 25 tasks, `assigned_to` is populated, and status remains `PENDING`.
  - *Given* annotator IDs that do not have the `annotator` role,
  - *When* assignment is triggered,
  - *Then* the system returns HTTP 422 Unprocessable Entity.

#### Story 7: Annotator Task Queue Inspection
- **ID**: `US-07`
- **As an**: Annotator
- **I want to**: View a paginated list of my assigned tasks filtered by status
- **So that**: I can easily see pending, submitted, and rejected tasks
- **Acceptance Criteria**:
  - *Given* an authenticated annotator,
  - *When* querying `/api/v1/tasks/my?status=PENDING&page=1&limit=20`,
  - *Then* the system returns only tasks where `assigned_to == current_user.id` matching the status filter.
  - *Given* tasks belonging to other annotators,
  - *When* querying `/api/v1/tasks/my`,
  - *Then* no other users' tasks are included in the results.

#### Story 8: Task Labeling via Interface
- **ID**: `US-08`
- **As an**: Annotator
- **I want to**: Select a label for a text item and submit it
- **So that**: My annotation is recorded and queued for review
- **Acceptance Criteria**:
  - *Given* an assigned task in `PENDING` or `IN_PROGRESS` status,
  - *When* I POST to `/api/v1/tasks/{id}/annotate` with a valid `label_id`,
  - *Then* an annotation record is created/updated, `task.status` becomes `SUBMITTED`, `submitted_at` is updated to current UTC timestamp, and HTTP 200 is returned.
  - *Given* a label ID belonging to a different project,
  - *When* submitted,
  - *Then* the system rejects it with HTTP 400 Bad Request.

#### Story 9: Keyboard Shortcuts for Ergonomic Labeling
- **ID**: `US-09`
- **As an**: Annotator
- **I want to**: Press numeric keys (1-9) to choose labels and Enter to submit
- **So that**: I can label data rapidly without reaching for the mouse
- **Acceptance Criteria**:
  - *Given* the active labeling screen with 3 configured labels,
  - *When* the user presses key `2`,
  - *Then* the second label is visually selected with an active state border.
  - *When* the user subsequently presses `Enter`,
  - *Then* the submission API call is triggered and the UI advances to the next pending task.

#### Story 10: Correction of Rejected Tasks
- **ID**: `US-10`
- **As an**: Annotator
- **I want to**: View the reviewer's feedback comment on a rejected task and resubmit a corrected label
- **So that**: I can fix errors identified by quality assurance
- **Acceptance Criteria**:
  - *Given* a task in `REJECTED` status with an existing review record,
  - *When* opened by the assigned annotator,
  - *Then* the reviewer's comment is prominently displayed in an alert banner at the top of the card.
  - *When* the annotator submits a new label,
  - *Then* the annotation updates, task status transitions back to `SUBMITTED`, and HTTP 200 is returned.

#### Story 11: Reviewer Queue Retrieval
- **ID**: `US-11`
- **As a**: Reviewer
- **I want to**: Retrieve a list of submitted annotations across projects
- **So that**: I can inspect submissions requiring quality verification
- **Acceptance Criteria**:
  - *Given* tasks in `SUBMITTED` status,
  - *When* a reviewer calls GET `/api/v1/reviews/queue?page=1&limit=25`,
  - *Then* a paginated list of submitted tasks, their text items, and chosen labels is returned.
  - *Given* an annotator trying to access `/api/v1/reviews/queue`,
  - *When* requested,
  - *Then* the system returns HTTP 403 Forbidden.

#### Story 12: Annotation Approval
- **ID**: `US-12`
- **As a**: Reviewer
- **I want to**: Approve an accurate annotation
- **So that**: The task reaches the `APPROVED` terminal state for dataset export
- **Acceptance Criteria**:
  - *Given* a task in `SUBMITTED` status where `task.assigned_to != current_user.id`,
  - *When* reviewer sends POST `/api/v1/tasks/{id}/review` with `{ "decision": "APPROVED" }`,
  - *Then* a review record is logged with `decision="APPROVED"`, `task.status` is set to `APPROVED`, and HTTP 200 is returned.

#### Story 13: Annotation Rejection with Compulsory Feedback
- **ID**: `US-13`
- **As a**: Reviewer
- **I want to**: Reject an inaccurate annotation with an explanatory comment
- **So that**: The annotator understands the mistake and can re-annotate properly
- **Acceptance Criteria**:
  - *Given* a task in `SUBMITTED` status,
  - *When* reviewer sends POST `/api/v1/tasks/{id}/review` with `{ "decision": "REJECTED", "comment": "Context implies sarcasm, not positive." }`,
  - *Then* `task.status` changes to `REJECTED`, the review is stored, and HTTP 200 is returned.
  - *Given* a rejection payload with an empty or whitespace comment,
  - *When* submitted,
  - *Then* the API validates input and returns HTTP 422 Unprocessable Entity.

#### Story 14: Prevention of Self-Review Bias
- **ID**: `US-14`
- **As the**: Platform
- **I want to**: Block any user from reviewing a task they annotated themselves
- **So that**: Dataset quality guarantees are untainted by self-approval
- **Acceptance Criteria**:
  - *Given* a user possessing both reviewer permissions and task assignment,
  - *When* they submit a review for their own task,
  - *Then* the API intercepts the operation and returns HTTP 403 Forbidden with the detail `"Reviewers cannot review their own annotations"`.

#### Story 15: Real-time Analytics Dashboard
- **ID**: `US-15`
- **As an**: Admin
- **I want to**: Inspect real-time metrics including completion percentage, annotator accuracy, label breakdown, and daily throughput
- **So that**: I can monitor project health, quality velocity, and annotator performance
- **Acceptance Criteria**:
  - *Given* an existing project with mixed task states,
  - *When* Admin queries `/api/v1/projects/{id}/stats`,
  - *Then* the system executes optimized raw SQL aggregations and returns:
    1. Overall progress (total, pending, in_progress, submitted, approved, rejected, completion_rate).
    2. Per-annotator accuracy rates.
    3. Label count distribution for approved tasks.
    4. 14-day daily throughput submission timeline.

#### Story 16: Quality-Restricted Dataset Export
- **ID**: `US-16`
- **As an**: Admin
- **I want to**: Export approved annotations in CSV or JSON format
- **So that**: Clean, quality-controlled data can be directly fed into ML model training pipelines
- **Acceptance Criteria**:
  - *Given* a project with both approved and unapproved tasks,
  - *When* Admin requests `/api/v1/projects/{id}/export?format=csv` or `?format=json`,
  - *Then* the system generates and streams a download containing ONLY records from tasks in `APPROVED` status.
  - *Given* a non-admin requesting export,
  - *When* attempted,
  - *Then* the system rejects the request with HTTP 403 Forbidden.
