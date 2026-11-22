# Contributing Guidelines & Git Workflow
## Project: LabelForge

---

### 1. Git Workflow & Branching Strategy

LabelForge follows a strict **Trunk-Based / Feature-Branch Workflow** to ensure code stability, isolated feature development, and seamless continuous integration.

```
main (Production Ready)
  ^
  |-- PR (Squash & Merge / Fast-Forward)
  |
feature/<branch-name>
```

#### Standard Feature Branches
All development work must occur on dedicated feature branches named with descriptive kebab-case prefixes:

| Branch Name | Scope / Responsibility | Target Release |
| :--- | :--- | :--- |
| `feature/setup-docs` | Initial requirements, system architecture, ER diagrams | v0.1.0 |
| `feature/backend-core` | FastAPI app skeleton, DB models, config, schema.sql | v0.2.0 |
| `feature/auth` | JWT authentication, bcrypt hashing, role dependency injection | v0.3.0 |
| `feature/projects-labels` | Project CRUD and label taxonomy management | v0.4.0 |
| `feature/upload-assign` | Batch CSV/JSON ingestion, deduplication, round-robin assignment | v0.5.0 |
| `feature/annotate-review` | Task annotation workbench, reviewer queue, conflict prevention | v0.6.0 |
| `feature/raw-sql-stats` | Real-time analytics with raw parameterized SQL queries | v0.7.0 |
| `feature/export-seed` | CSV/JSON streaming dataset export and database seed script | v0.8.0 |
| `feature/test-suite` | End-to-end integration tests using pytest and SQLite | v0.9.0 |
| `feature/frontend-app` | React SPA, Vite, React Router, custom CSS design system | v1.0.0 |
| `feature/docker-ci` | Multi-stage Dockerfiles, docker-compose, GitHub Actions CI | v1.0.0 |

---

### 2. Conventional Commit Standards

Every commit message must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <short description in imperative mood>

[optional body explaining WHY and WHAT changed]

[optional footer(s), e.g., Closes #12]
```

#### Allowed Types:
- `feat`: A new user-facing feature or API capability.
- `fix`: A bug fix or error correction.
- `docs`: Documentation updates, specs, API tables.
- `style`: Formatting, missing semicolons, CSS alignment changes (no logic change).
- `refactor`: Code restructuring without modifying behavior or fixing bugs.
- `perf`: Code changes improving memory, query execution, or loading performance.
- `test`: Adding or updating test cases and fixtures.
- `chore`: Tooling, dependency bumps, docker, or CI/CD configuration.

#### Commit Examples:
- `feat(auth): implement JWT token generation and role verification dependency`
- `feat(upload): add CSV/JSON parser with 5000-row limit and deduplication`
- `fix(review): block annotators from self-reviewing their own submissions`
- `perf(stats): optimize progress calculation using single-scan conditional aggregation`
- `docs(design): add ER diagram and task status state transition graph`

---

### 3. Pull Request & Quality Checklist

Before merging any pull request into `main`:
1. All automated tests in `backend/tests/` must pass with zero failures: `pytest`.
2. Code must follow clean coding guidelines: explicit parameter types, Pydantic v2 schemas, parameter binding in SQL.
3. No secret keys or environment credentials checked into version control.
4. Database migrations / schema updates documented in `schema.sql`.
