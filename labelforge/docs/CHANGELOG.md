# Changelog
All notable changes to the **LabelForge** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]
- Full Docker and docker-compose deployment orchestration.
- GitHub Actions CI matrix validation.

## [v1.0.0] - Target
### Added
- Complete React (Vite) Single Page Application with custom handwritten CSS design system.
- Administrative project management, label color picker, drag-and-drop CSV/JSON upload, and round-robin assign modal.
- Annotator workbench with 1-9 numeric keyboard shortcuts, auto-advance, and reviewer feedback alert banners.
- Reviewer quality assurance queue with approval and mandatory rejection comments.
- Real-time Analytics Dashboard with Recharts visualization for class distribution and daily throughput.
- Export pipeline streaming ML-ready datasets in CSV and JSON formats.

## [v0.5.0] - Backend Core Services & Analytics
### Added
- Round-robin task distribution engine.
- Task annotation and quality assurance review endpoints with self-review block.
- Four raw SQL analytical queries for progress, annotator accuracy, class distribution, and 14-day velocity.
- Database seed script generating administrative accounts, 3 annotators, 2 reviewers, and 200 text samples.

## [v0.3.0] - REST API & Ingestion Foundation
### Added
- Project CRUD endpoints with cascade relationships.
- Label scheme manager with hex color support.
- File upload service parsing `.csv` and `.json` with deduplication and 5000-row cap.

## [v0.2.0] - Data Layer & Authentication
### Added
- SQLAlchemy 2.0 ORM models and native `schema.sql` with check constraints and index specifications.
- Dual database support (SQLite for local development, PostgreSQL for production).
- JWT authentication service with bcrypt password hashing and `require_role()` dependency injection.

## [v0.1.0] - Planning & SDLC Documentation
### Added
- Comprehensive Software Requirements Specification (`SRS.md`) with 16 Gherkin user stories.
- Architecture and Design Document (`DESIGN.md`) including Mermaid system architecture, ER diagram, state transition machine, and complete REST API table.
- Contributing and Git Workflow Guide (`CONTRIBUTING.md`).
