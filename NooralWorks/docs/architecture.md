# System Architecture — Intern Management System

This document outlines the architecture, database schema, and REST API routes for the Unified Intern Management System.

## 1. Database Schema (SQLite)

The system uses a relational SQLite database schema with cascaded deletions on employee profile links.

```
+-------------+         +-------------+
|    users    | --------|   mentors   |
+-------------+         +-------------+
       |
       |                 +-------------+
       +-----------------|   interns   |
                         +-------------+
                                |
       +------------+-----------+-----------+------------+------------+
       |            |           |           |            |            |
+------------+ +--------+ +-----------+ +-------+ +------------+ +-----------+
| attendance | | tasks  | | trainings | | fees  | | documents  | | activity  |
+------------+ +--------+ +-----------+ +-------+ +------------+ +-----------+
```

### Table Details:
- **users**: Access controls, credentials, status (Active/Inactive), and global RBAC role definition.
- **interns**: Detailed record linking to user credentials, batch tracker, assigned mentor user, department, tech stack, and joining/completion dates.
- **mentors**: Connects to user credentials, departments, and specific tech stack specialties.
- **attendance**: Logs daily check-ins, check-outs, calculated hours, status flags (Present, Late, Absent, Leave), and HR approval notes.
- **trainings / training_sessions**: Manages bootcamps curriculum and scheduled lecture times with materials links.
- **tasks / task_updates**: Kanban board tracker. Mentors allocate items; interns log submissions with links; mentors review and log feedback.
- **fees / payments**: Tuition collection balances, installment logs, payment channels (UPI, card, cash), and issued invoice receipts.
- **documents**: File storage directory path for resumes, signed agreements, and proof attachments.
- **notifications**: User alerts triggers (new tasks, payment reviews, document statuses, leave approvals).

---

## 2. API Endpoints Reference

All REST endpoints start with `/api`.

### Authentication
- `POST /api/auth/login` - Authenticates user, returns JWT and user profile.
- `POST /api/auth/register` - Registers new user profiles (HR/Admin restricted).
- `GET /api/auth/me` - Resolves active JWT token to user details.

### Intern Roster
- `GET /api/interns` - Fetches roster list with search, batch, and status filters.
- `GET /api/interns/mentors` - Returns active instructors for dropdowns.
- `GET /api/interns/:id` - Detailed view containing attendance summary, tasks, fees, and docs.
- `POST /api/interns` - Instantiates user credentials, profile records, and fee ledgers.
- `PUT /api/interns/:id` - Modifies technology, batch details, or mentor assignments.
- `DELETE /api/interns/:id` - Deletes user credentials and cascading tables.

### Attendance & Log Sheets
- `GET /api/attendance` - Fetches attendance logs (filtered for interns or admin grids).
- `POST /api/attendance/check-in` - Registers daily arrival time (flags 'Late' after 9:30 AM).
- `POST /api/attendance/check-out` - Computes and stores daily hours worked.
- `POST /api/attendance/leave` - Intern files leave request for review.
- `POST /api/attendance/approve/:id` - HR/Mentor approves leave/attendance status.

### Training & Curriculums
- `GET /api/trainings` - Lists courses and scheduled bootcamps.
- `GET /api/trainings/sessions` - Returns upcoming sessions calendar logs.
- `POST /api/trainings` - Creates a new course syllabus (HR/Mentor).
- `POST /api/trainings/:id/sessions` - Schedules lecture times inside a course.

### Task Management Board
- `GET /api/tasks` - Board checklist entries.
- `POST /api/tasks` - Allocates tasks with priority levels and deadlines.
- `PUT /api/tasks/:id/status` - Shuts task from Pending to In Progress.
- `POST /api/tasks/:id/submit` - Intern posts work link for grading.
- `POST /api/tasks/:id/review` - Mentor reviews submission (Completes or rejects).

### Fee Ledger
- `GET /api/fees` - Financial ledgers listing outstanding balances.
- `GET /api/fees/payments` - Transaction receipts log.
- `POST /api/fees/:intern_id/payments` - HR records fee collections and issues invoice.

### Documents Registry
- `GET /api/documents` - Fetches document links and status.
- `POST /api/documents/upload` - Saves document attachment in `/uploads`.
- `POST /api/documents/:id/verify` - Approves/Denies paperwork.

### System Reports
- `GET /api/reports/interns` - Downloads CSV roster list (HR).
- `GET /api/reports/attendance` - Downloads CSV attendance log sheet (HR).
- `GET /api/reports/fees` - Downloads CSV payment balances list (HR).
