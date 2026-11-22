# LabelForge 🏷️
### Collaborative Data Annotation Platform (Mini Label Studio)

[![LabelForge CI](https://github.com/username/labelforge/actions/workflows/ci.yml/badge.svg)](https://github.com/username/labelforge/actions)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React 18](https://img.shields.io/badge/React-18.2-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![SQLAlchemy 2.0](https://img.shields.io/badge/SQLAlchemy-2.0+-red.svg)](https://www.sqlalchemy.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📖 1. Project Overview

**LabelForge** is a production-ready, full-stack collaborative data annotation and dataset curation platform designed for data science and machine learning teams. Inspired by tools like Label Studio, LabelForge provides an ergonomic, high-throughput pipeline:
1. **Admins** ingest raw text datasets (CSV/JSON), configure custom colored taxonomies, and assign tasks via deterministic round-robin load balancing.
2. **Annotators** rapidly categorize text items using vanilla JavaScript single-key shortcuts (`1`–`9`, `Enter`), with automatic advancement and feedback banners for reviewer-rejected items.
3. **Reviewers** inspect submissions in a dedicated QA queue, preventing self-review bias while enforcing mandatory constructive feedback on rejections.
4. **Admins** monitor live project progress and accuracy via a **Raw SQL analytics engine** and export clean, machine-learning-ready datasets in CSV or JSON.

---

## 🛠️ 2. Tech Stack

| Layer | Technology | Purpose & Architectural Justification |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite | Lightning-fast HMR and optimized production bundle |
| **Routing** | React Router v6 | Declarative client-side routing with role-based `ProtectedRoute` guards |
| **HTTP Client** | Axios | Interceptors for automatic Bearer JWT attachment and global 401 redirects |
| **Styling** | Handwritten CSS (Variables) | Demonstrates pure CSS mastery (Flexbox, Grid, design tokens, responsive queries; no Tailwind/UI kits) |
| **Visualizations** | Recharts | Class distribution bar charts and 14-day throughput trend line charts |
| **Backend** | FastAPI (Python 3.11+) | Asynchronous, auto-documenting OpenAPI REST framework |
| **Validation** | Pydantic v2 | Strict schema validation, type safety, and input sanitization |
| **ORM / Data** | SQLAlchemy 2.0 | Dual-database ORM engine (SQLite for dev, PostgreSQL for prod) |
| **Analytics** | Raw Parameterized SQL | Advanced conditional aggregations, multi-table joins, and temporal grouping |
| **Security** | JWT (`python-jose`) + `bcrypt` | Stateless bearer token authentication with role-based access control (RBAC) |
| **Testing** | `pytest` + `TestClient` | 22 comprehensive integration tests running against in-memory SQLite |
| **DevOps** | Docker, Docker Compose, Nginx | Multi-stage Dockerfiles, reverse proxy, and GitHub Actions CI |

---

## 🔄 3. Roles & Task Lifecycle Workflow

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
                      +--------->|  APPROVED   |  ===> Machine Learning Dataset Export
                                 +-------------+
```

### Role Permissions:
- **Admin**: Create/edit/delete projects, define label schemes, upload datasets, trigger round-robin assignment, view real-time raw SQL analytics, and stream approved exports.
- **Annotator**: Access only assigned tasks in `PENDING`, `IN_PROGRESS`, or `REJECTED` state; ergonomic keyboard labeling with auto-advance.
- **Reviewer**: Access global or project-filtered queue of `SUBMITTED` tasks; approve or reject with compulsory comment; strictly barred from reviewing their own annotations.

---

## 🗄️ 4. Database Schema

```
users       (id PK, name, email UNIQUE, password_hash, role, is_active, created_at)
projects    (id PK, name, description, created_by FK users, created_at)
labels      (id PK, project_id FK, name, color, UNIQUE(project_id, name))
data_items  (id PK, project_id FK, content TEXT, created_at)
tasks       (id PK, item_id FK UNIQUE, assigned_to FK users NULL, status, assigned_at, submitted_at, updated_at)
annotations (id PK, task_id FK UNIQUE, label_id FK, annotated_at)
reviews     (id PK, task_id FK, reviewer_id FK, decision, comment, reviewed_at)
```

- Indexes: `tasks(assigned_to, status)` and `data_items(project_id)`.
- Constraints: Proper foreign keys (`ON DELETE CASCADE` / `SET NULL` / `RESTRICT`) and `CHECK` constraints on `role`, `status`, and `decision`.

---

## ⚡ 5. Quick Start & Setup

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm
- (Optional) Docker and Docker Compose

---

### Option A: Local Development Setup (SQLite)

#### 1. Backend Setup
```powershell
# Navigate to backend directory
cd labelforge/backend

# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1   # On Windows
# source venv/bin/activate    # On Linux/macOS

# Install dependencies
pip install -r requirements.txt

# Copy environment variables
cp .env.example .env

# Run database seeder (populates demo users, 1 project, 200 items, and realistic states)
python seed.py

# Launch FastAPI development server
uvicorn app.main:app --reload --port 8000
```
Backend will be live at `http://localhost:8000`. Interactive Swagger UI is available at `http://localhost:8000/docs`.

#### 2. Frontend Setup
```powershell
# Open a new terminal in frontend directory
cd labelforge/frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Frontend will be live at `http://localhost:5173`.

---

### Option B: Production Docker Compose Setup (PostgreSQL)

Run the full stack (React + FastAPI + PostgreSQL + Nginx) with a single command:

```bash
cd labelforge
docker compose up --build -d
```

- **Frontend Application**: `http://localhost` (Port 80)
- **Backend API & Swagger Docs**: `http://localhost:8000/docs`
- **PostgreSQL Database**: `localhost:5432`

To run database seeding inside Docker:
```bash
docker compose exec backend python seed.py
```

---

## 🔑 6. Pre-Seeded Demo Credentials

The included `seed.py` creates a pre-populated dataset with realistic customer reviews so you can test all workflows immediately:

| Role | Email | Password | Pre-loaded Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@labelforge.com` | `admin123` | Full dashboard, project manager, upload, assign, and export |
| **Annotator 1** | `annotator1@labelforge.com` | `annotator123` | Assigned pending and in-progress tasks ready for labeling |
| **Annotator 2** | `annotator2@labelforge.com` | `annotator123` | Assigned rejected tasks showing reviewer feedback banners |
| **Annotator 3** | `annotator3@labelforge.com` | `annotator123` | Additional annotator queue |
| **Reviewer 1** | `reviewer1@labelforge.com` | `reviewer123` | 40 submitted annotations ready for QA approval/rejection |
| **Reviewer 2** | `reviewer2@labelforge.com` | `reviewer123` | Additional reviewer QA access |

*Note: The login page includes convenient **One-Click Demo Login** buttons for instant role switching.*

---

## 🧪 7. Automated Testing Suite

The test suite runs 22 integration tests using an isolated in-memory SQLite database:

```powershell
cd labelforge/backend
pytest -v
```

### Coverage Highlights:
- **Authentication**: Registration validation, password hashing, JWT creation, duplicate 409 rejection, and role-based 403 authorization.
- **Data Ingestion**: CSV/JSON parser, 5000-row cap, empty/duplicate filtering, and automatic task generation.
- **Workflow Lifecycle**: Complete deterministic transition: assign -> annotate -> reject (with required comment) -> re-annotate -> approve.
- **Security**: Strict enforcement prohibiting self-review bias.
- **Raw SQL Analytics**: Validates exact numerical calculations for completion rate, annotator accuracy, and class distribution against seeded benchmarks.
- **Dataset Export**: Confirms only `APPROVED` records are exported in CSV and JSON formats.

See detailed test documentation in [docs/TESTING.md](docs/TESTING.md).

---

## 📊 8. Raw SQL Analytics Queries

The project showcases raw SQL mastery alongside ORM CRUD in `app/sql/queries.py`:
1. **Progress Breakdown**: Single-pass conditional aggregation (`SUM(CASE WHEN ...)`) pivoting task status counts.
2. **Annotator Accuracy**: Multi-table inner joins between `tasks`, `reviews`, and `users` to calculate `approved / (approved + rejected)`.
3. **Class Distribution**: Left outer join preserving 0-count classes specifically for approved records.
4. **Daily Throughput**: 14-day temporal date truncation and grouping measuring submission velocity over a sliding window.

---

## 📚 9. SDLC Documentation Index

- [docs/SRS.md](docs/SRS.md) — Software Requirements Specification with 16 Gherkin User Stories.
- [docs/DESIGN.md](docs/DESIGN.md) — System Architecture, ER Diagram, Task State Transition Graph, and REST API Table.
- [docs/TESTING.md](docs/TESTING.md) — Test Strategy, Fixture Architecture, and 22 Test Cases Matrix.
- [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) — Feature Branching Strategy and Conventional Commit Standards.
- [docs/CHANGELOG.md](docs/CHANGELOG.md) — Version release history from v0.1.0 to v1.0.0.

---

## 🚀 10. Future Scope & Roadmap

- **Multi-modal Annotation**: Extension to bounding boxes for computer vision (images) and audio transcription spans.
- **Active Learning**: Model-in-the-loop confidence scoring to prioritize high-entropy/uncertain samples for human labeling.
- **Inter-Annotator Agreement**: Cohen's Kappa / Fleiss' Kappa statistics for multi-annotated verification consensus.
- **Webhooks & S3 Integration**: Automated streaming directly to AWS S3 / Google Cloud Storage upon batch approval.

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
