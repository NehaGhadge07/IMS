import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, PageBreak
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

pdf_path = r"C:\Users\neha0\OneDrive\Desktop\MCA_Major_Project_Documentation\IMS\IICET_Talent_Management_Project_Documentation.pdf"
doc = SimpleDocTemplate(
    pdf_path,
    pagesize=letter,
    leftMargin=0.75 * inch,
    rightMargin=0.75 * inch,
    topMargin=0.75 * inch,
    bottomMargin=0.75 * inch
)

styles = getSampleStyleSheet()

# Custom styles
style_title = ParagraphStyle(
    'DocTitle',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=20,
    leading=24,
    textColor=colors.HexColor('#1E3A8A'),
    alignment=1, # Center
    spaceAfter=15
)

style_h1 = ParagraphStyle(
    'H1',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=14,
    leading=18,
    textColor=colors.HexColor('#1E3A8A'),
    spaceBefore=14,
    spaceAfter=6,
    keepWithNext=True
)

style_h2 = ParagraphStyle(
    'H2',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=12,
    leading=16,
    textColor=colors.HexColor('#0284C7'),
    spaceBefore=10,
    spaceAfter=4,
    keepWithNext=True
)

style_h3 = ParagraphStyle(
    'H3',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=10.5,
    leading=14,
    textColor=colors.HexColor('#334155'),
    spaceBefore=8,
    spaceAfter=3,
    keepWithNext=True
)

style_p = ParagraphStyle(
    'Body',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=9.5,
    leading=13.5,
    textColor=colors.HexColor('#1F2937'),
    spaceAfter=6,
    alignment=4 # Justify
)

style_bullet = ParagraphStyle(
    'Bullet',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=9.5,
    leading=13,
    textColor=colors.HexColor('#1F2937'),
    leftIndent=15,
    firstLineIndent=-10,
    spaceAfter=4
)

style_cell = ParagraphStyle(
    'TableCell',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=8.5,
    leading=11,
    textColor=colors.HexColor('#1F2937')
)

style_cell_hdr = ParagraphStyle(
    'TableCellHdr',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=8.5,
    leading=11,
    textColor=colors.white,
    alignment=1
)

style_placeholder = ParagraphStyle(
    'Placeholder',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=8.5,
    leading=12,
    alignment=1
)

elements = []

def add_box(title, desc):
    data = [[
        Paragraph(f"<font color='#2563eb'><b>/* [PLACE DIAGRAM / SCREENSHOT HERE: {title}] */</b></font><br/><br/><font color='#64748b'><i>{desc}</i></font>", style_placeholder)
    ]]
    t = Table(data, colWidths=[7.0 * inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#2563EB')),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ]))
    elements.append(Spacer(1, 4))
    elements.append(t)
    elements.append(Spacer(1, 8))

def add_tbl(headers, rows, col_widths=None):
    tbl_data = []
    # Header
    hdr_row = [Paragraph(h, style_cell_hdr) for h in headers]
    tbl_data.append(hdr_row)
    # Rows
    for r in rows:
        row_cells = [Paragraph(str(c), style_cell) for c in r]
        tbl_data.append(row_cells)
    
    t = Table(tbl_data, colWidths=col_widths, repeatRows=1)
    ts = [
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E3A8A')),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
    ]
    for i in range(1, len(tbl_data)):
        if i % 2 == 0:
            ts.append(('BACKGROUND', (0, i), (-1, i), colors.HexColor('#F8FAFC')))
    t.setStyle(TableStyle(ts))
    elements.append(Spacer(1, 4))
    elements.append(t)
    elements.append(Spacer(1, 8))

# ==================== DOCUMENT CONTENT ====================
elements.append(Paragraph("PROJECT DOCUMENTATION<br/><font size=14>IICET Talent & Corporate Training Portal</font>", style_title))
elements.append(Spacer(1, 10))

# 1. Introduction
elements.append(Paragraph("1. Introduction", style_h1))
elements.append(Paragraph("1.1 Project Introduction", style_h2))
elements.append(Paragraph("<b>IICET Talent & Corporate Training Portal</b> is a web-based enterprise application developed to provide a centralized digital platform for managing the complete lifecycle of industrial talent development, candidate training cohorts, and institutional operations. With technical education and corporate training playing a crucial role in workforce skill development, modern academies require an efficient mechanism to manage candidate onboarding, daily attendance logs, curriculum progress, task evaluations, and financial fee records.", style_p))
elements.append(Paragraph("Traditional institutional administration often relies on manual paper registers, disconnected desktop spreadsheets, and informal messaging channels. These conventional methods cause significant operational bottlenecks, including attendance disputes, untracked fee installments, delayed project feedback, and fragmented candidate documentation. A unified digital governance portal brings these scattered operations into a structured, secure, and transparent environment.", style_p))
elements.append(Paragraph("The IICET Talent & Corporate Training Portal organizes institutional activities through a responsive, role-based web interface supporting four distinct stakeholders: <b>Director (Executive Management)</b>, <b>HR Manager</b>, <b>Technical Trainers (Mentors)</b>, and <b>Candidates (Trainees)</b>. The platform automates onboarding, tracks daily attendance with automated late detection, facilitates programming assignment reviews, manages leave requests, and verifies student KYC documents. Additionally, it provides double-entry fee ledger management with instant PDF receipt generation, as well as AI-powered executive summarization of daily staff activity logs.", style_p))
elements.append(Paragraph("The project follows a standard three-tier application architecture:", style_p))
elements.append(Paragraph("• <b>Frontend:</b> React.js delivers an intuitive, responsive user interface with interactive role-specific dashboards, visual performance analytics, and dynamic form workflows.", style_bullet))
elements.append(Paragraph("• <b>Backend:</b> Node.js with Express.js handles business logic execution, Role-Based Access Control (RBAC), JWT security verification, background cron automation, and RESTful API management.", style_bullet))
elements.append(Paragraph("• <b>Database:</b> SQLite / MySQL provides a structured relational data store maintaining normalized records for users, attendance, task submissions, fee ledgers, and audit logs.", style_bullet))
elements.append(Paragraph("The frontend communicates with the backend via secure HTTP REST APIs sending and receiving structured JSON payloads. The backend validates requests, executes institutional business rules, queries the persistence layer, and returns formatted responses for display. Overall, the system eliminates administrative paperwork, minimizes human calculation errors, and establishes complete operational transparency across the institution. Its modular design ensures easy scalability for future enhancements such as placement drives and automated certification.", style_p))

elements.append(Paragraph("1.2 Existing System", style_h2))
elements.append(Paragraph("In the existing traditional approach, educational academies and industrial training institutes manage student admissions, attendance, and training operations through manual registers, disconnected Excel spreadsheets, and informal communication channels (such as WhatsApp groups or paper circulars). Candidate personal information, educational background, fee records, and KYC documents are collected physically or through disparate email threads.", style_p))
elements.append(Paragraph("Similarly, institutional administrative officers and trainers maintain batch rosters, daily attendance, class schedules, and project marks in isolated physical registers or personal desktop computers. When records are maintained in fragmented storage, updating and reviewing information requires substantial manual effort.", style_p))
elements.append(Paragraph("The traditional approach creates several severe operational difficulties:", style_p))
elements.append(Paragraph("• <b>Manual Candidate Record Management:</b> Candidate personal details, contact information, qualifications, and batch allocations are recorded manually across multiple physical logbooks. When a student updates contact information or shifts batches, physical updates are delayed or lost, resulting in outdated administrative records.", style_bullet))
elements.append(Paragraph("• <b>Attendance Inaccuracies and Time Disputes:</b> Trainers track attendance using manual signature sheets, which lack precise timestamps. This encourages proxy attendance, leads to disputes regarding punch-in and punch-out timings, and complicates the calculation of monthly working hours.", style_bullet))
elements.append(Paragraph("• <b>Difficulty in Managing Project Tasks and Submissions:</b> Technical programming assignments and source code links are submitted through informal chat threads or email attachments. Mentors struggle to track submission deadlines, maintain version histories, and provide objective grading rubrics.", style_bullet))
elements.append(Paragraph("• <b>Fee Collection and Ledger Discrepancies:</b> Candidates frequently pay training course fees across multiple installments (Cash, Cheque, or UPI). Recording installments across manual paper ledgers frequently causes accounting mismatches, delay in reconciliation, and inconvenience in issuing formal fee receipts.", style_bullet))
elements.append(Paragraph("• <b>Lack of Centralized Executive Visibility:</b> Directors and institutional leaders have no real-time dashboard or unified reporting system to monitor daily staff operations, attendance statistics, or financial summaries without requesting multiple offline reports.", style_bullet))

elements.append(Paragraph("1.3 Need and Scope of the System", style_h2))
elements.append(Paragraph("<b>Need of the System:</b>", style_h3))
elements.append(Paragraph("• <b>Centralized Candidate Records:</b> Provides a common, secure relational repository to maintain candidate profiles, batch allotments, technology domains, contact credentials, and enrollment statuses.", style_bullet))
elements.append(Paragraph("• <b>Automated Attendance Monitoring:</b> Replaces error-prone paper registers with real-time clock-in and clock-out timestamps, automated late-arrival detection, and background cron auto-checkout.", style_bullet))
elements.append(Paragraph("• <b>Structured Task and Performance Evaluation:</b> Facilitates structured assignment allocation, project proof submission tracking, and systematic grading rubrics, eliminating lost assignments and delayed feedback.", style_bullet))
elements.append(Paragraph("• <b>Transparent Fee and Installment Management:</b> Maintains an automated double-entry ledger to track fee installments, calculate remaining balances, prevent accounting errors, and instantly generate digital PDF receipts.", style_bullet))
elements.append(Paragraph("• <b>Digital KYC and Document Repository:</b> Streamlines candidate identity verification by enabling secure online uploads of government ID proofs and resumes for authorized verification.", style_bullet))
elements.append(Paragraph("• <b>Executive Visibility & AI Summarization:</b> Enables executives to access institution-wide operational metrics and leverages Google Gemini AI to synthesize multi-day staff activity logs into actionable summaries.", style_bullet))

elements.append(Paragraph("<b>Scope of the System:</b>", style_h3))
elements.append(Paragraph("• <b>Candidate (Trainee) Scope:</b> Supports authentication, profile maintenance, clock-in/out attendance logging, assignment submission with GitHub/live URLs, fee installment ledger review, stamped PDF receipt download, leave applications, and curriculum schedule access.", style_bullet))
elements.append(Paragraph("• <b>Technical Trainer (Mentor) Scope:</b> Enables mentors to view assigned batches, create technical assignments with submission deadlines, review and score trainee project submissions, manage lecture schedules, and submit daily work activity logs for management review.", style_bullet))
elements.append(Paragraph("• <b>HR & Administrative Scope:</b> Supports candidate onboarding, batch allotment, recording fee installment payments, verifying uploaded KYC credentials, processing leave requests with automated attendance synchronization, and managing admission enquiries.", style_bullet))
elements.append(Paragraph("• <b>Director & Executive Management Scope:</b> Provides high-level institutional dashboards displaying overall enrollment numbers, fee revenue analytics, staff attendance, audit logs, and AI-generated multi-day staff performance summaries.", style_bullet))

elements.append(Paragraph("1.4 Organization Profile", style_h2))
elements.append(Paragraph("<b>IICET Talent & Corporate Training Portal</b> is the enterprise application developed for <b>IICET Services Private Limited</b> (Satara, Maharashtra) to organize, monitor, and automate technical training cohorts, candidate skill development, and institutional operations through a centralized digital platform.", style_p))
elements.append(Paragraph("The organization focuses on bridging the gap between academic education and corporate industry expectations by providing structured technical training in software engineering, practical development projects, and corporate skill programs. The portal utilizes modern web technologies to streamline administrative workflows and ensure seamless collaboration between candidates, technical mentors, human resources, and executive leadership through dedicated role-specific modules.", style_p))

# 2. Proposed System
elements.append(Paragraph("2. Proposed System", style_h1))
elements.append(Paragraph("2.1 Objectives", style_h2))
elements.append(Paragraph("1. <b>Develop a Centralized Institutional Portal:</b> Unifies candidate onboarding, attendance, assignment evaluations, and fee records into a single relational database.", style_bullet))
elements.append(Paragraph("2. <b>Provide a Responsive Role-Based Interface:</b> Features dedicated, modern dashboards tailored for Director, HR Manager, Technical Trainer, and Candidate roles.", style_bullet))
elements.append(Paragraph("3. <b>Implement Secure Role-Based Authentication:</b> Enforces JSON Web Tokens (JWT), Bcrypt password encryption, and Gmail SMTP email OTP verification.", style_bullet))
elements.append(Paragraph("4. <b>Automate Attendance and Time Tracking:</b> Automates real-time punch-in/out logging, late detection (after 9:30 AM), and 6:00 PM cron auto-checkout.", style_bullet))
elements.append(Paragraph("5. <b>Streamline Task Delegation & Evaluation:</b> Provides an assignment board with GitHub/live demo link submissions and objective grading rubrics.", style_bullet))
elements.append(Paragraph("6. <b>Manage Fee Ledgers & Generate PDF Receipts:</b> Implements double-entry fee installment calculation with instant branded PDF receipt generation.", style_bullet))
elements.append(Paragraph("7. <b>Provide Automated Executive AI Summaries:</b> Integrates Google Gemini 1.5 Flash AI to synthesize multi-day staff activity logs into executive insights.", style_bullet))

elements.append(Paragraph("2.2 Software & Hardware Specifications", style_h2))
elements.append(Paragraph("<b>Hardware Requirements:</b> Processor: Intel Core i3 or above | RAM: 4 GB or higher | Hard Disk: 50 GB | Display: 1366 x 768 or higher.", style_p))

h_sw = ["Software", "Version", "Role in Project"]
r_sw = [
    ["Operating System", "Windows 10 / 11 / Linux", "Development and production hosting environment"],
    ["Node.js Runtime", "v20.x / v22.x LTS", "Executes server-side JavaScript engine and REST APIs"],
    ["Express.js", "^4.19.2", "Backend web application framework routing API endpoints"],
    ["React.js", "^19.2.7", "Frontend library for building reactive user interfaces"],
    ["Vite", "^8.1.1", "High-performance frontend build tool and bundler"],
    ["SQLite (node:sqlite)", "Native Engine", "Embedded ACID-compliant primary relational database"],
    ["MySQL Server", "8.0 / 8.4 LTS", "Secondary enterprise relational data storage and synchronization"],
    ["Google Gemini AI", "1.5 Flash SDK", "Generative AI engine synthesizing daily staff work logs"],
    ["Nodemailer", "^6.9.13", "Gmail SMTP protocol dispatcher for automated emails and OTPs"],
    ["Postman", "Latest", "Testing, debugging, and documenting REST API endpoints"]
]
add_tbl(h_sw, r_sw, [1.5*inch, 1.5*inch, 4.0*inch])

# 3. System Diagrams
elements.append(Paragraph("3. System Diagrams", style_h1))
elements.append(Paragraph("3.1 Data Flow Diagrams (DFD)", style_h2))
add_box("Level 0 DFD - Context Diagram", "Paste your Level 0 Context Diagram here.\nEntities: Candidate, Trainer, HR Manager, Director.\nCentral Process: 0.0 IICET Talent & Corporate Training Portal.")
add_box("Level 1 DFD - Administrator & HR Workflow", "Paste your Level 1 Admin DFD here.\nProcesses: 1.0 Auth, 1.1 Candidate Onboarding, 1.2 Fee Management, 1.3 Leave Approval, 1.4 KYC Verification.\nData Stores: D1 Users, D2 Interns, D3 Fees, D4 Attendance.")
add_box("Level 1 DFD - Candidate & Trainer Workflow", "Paste your Level 1 Candidate & Trainer DFD here.\nProcesses: 2.0 Attendance Logging, 2.1 Task Allocation, 2.2 Task Submission, 2.3 Grading.")
add_box("Level 2 DFD - Subsystem Decomposition", "Paste your Level 2 DFD here.\nDecomposition into Attendance Engine, Task Review Board, and Fee PDF Receipting subsystems.")

elements.append(Paragraph("3.2 Entity Relationship Diagram (ERD)", style_h2))
add_box("Entity Relationship Diagram (ERD)", "Paste your full database ER Diagram here showing all primary keys, foreign keys, and cardinalities.")

elements.append(Paragraph("3.3 Use Case Diagrams", style_h2))
add_box("Use Case Diagram - Director & HR Administration", "Paste your Director & HR Use Case Diagram here.")
add_box("Use Case Diagram - Candidate & Technical Trainer", "Paste your Candidate & Trainer Use Case Diagram here.")

elements.append(Paragraph("3.4 Activity & Sequence Diagrams", style_h2))
add_box("Activity Diagram - Administrative & Candidate Flow", "Paste your Activity Diagram showing operational workflows from login to task evaluation and receipt generation.")
add_box("Sequence Diagram - System Messaging Flow", "Paste your Sequence Diagram showing interaction between Web Browser, Express REST API, and SQLite/MySQL Database.")

# 4. System Design & Data Dictionary
elements.append(Paragraph("4. System Design & Data Dictionary", style_h1))
elements.append(Paragraph("The Data Dictionary documents the relational schema definitions, field data types, nullability, constraints, and descriptions across the 12 normalized database tables:", style_p))

h_d = ["Field Name", "Data Type", "Constraints", "Description"]

elements.append(Paragraph("1. Users Table (Core Authentication & Role Management)", style_h3))
r_u = [
    ["id", "INTEGER", "PK, AUTO_INCREMENT", "Unique user ID"],
    ["name", "VARCHAR(100)", "NOT NULL", "Full legal name"],
    ["email", "VARCHAR(150)", "UNIQUE, NOT NULL", "Login email address"],
    ["role", "VARCHAR(20)", "NOT NULL", "Role ('Director', 'HR', 'Mentor', 'Intern')"],
    ["department", "VARCHAR(100)", "NOT NULL", "Assigned department ('Director', 'Human Resources', 'Employee', 'Intern')"],
    ["password_hash", "VARCHAR(255)", "NOT NULL", "Bcrypt hashed password"],
    ["mobile_number", "VARCHAR(20)", "NULLABLE", "Phone contact number"],
    ["is_online", "TINYINT(1)", "DEFAULT 0", "Online session status (1=Active, 0=Offline)"]
]
add_tbl(h_d, r_u, [1.1*inch, 1.2*inch, 1.7*inch, 3.0*inch])

elements.append(Paragraph("2. Interns Table (Candidate Profile Extension)", style_h3))
r_i = [
    ["id", "INTEGER", "PK, AUTO_INCREMENT", "Unique intern profile ID"],
    ["user_id", "INTEGER", "FK (users.id), UNIQUE", "Reference to core user account"],
    ["batch", "VARCHAR(50)", "NOT NULL", "Cohort designation (e.g., 'Batch 2026-A')"],
    ["training_time", "VARCHAR(50)", "NOT NULL", "Scheduled training hours"],
    ["mentor_id", "INTEGER", "FK (users.id)", "Assigned trainer/mentor ID"],
    ["technology", "VARCHAR(100)", "NOT NULL", "Track ('Full Stack Development', 'Data Science')"],
    ["status", "VARCHAR(20)", "DEFAULT 'Active'", "Training status ('Active', 'Completed')"]
]
add_tbl(h_d, r_i, [1.1*inch, 1.2*inch, 1.7*inch, 3.0*inch])

elements.append(Paragraph("3. Attendance Table (Daily Punch Clock & Cron)", style_h3))
r_a = [
    ["id", "INTEGER", "PK, AUTO_INCREMENT", "Unique attendance record ID"],
    ["intern_id", "INTEGER", "FK (interns.id)", "Reference to intern profile"],
    ["date", "DATE", "NOT NULL", "Session date (YYYY-MM-DD)"],
    ["check_in_time", "VARCHAR(20)", "NULLABLE", "Punch-in timestamp (HH:MM:SS)"],
    ["check_out_time", "VARCHAR(20)", "NULLABLE", "Punch-out timestamp (HH:MM:SS)"],
    ["status", "VARCHAR(20)", "NOT NULL", "Status ('Present', 'Late', 'Half Day', 'Absent')"],
    ["working_hours", "DECIMAL(4,2)", "DEFAULT 0.00", "Total computed working hours"]
]
add_tbl(h_d, r_a, [1.1*inch, 1.2*inch, 1.7*inch, 3.0*inch])

elements.append(Paragraph("4. Tasks & Task Updates Tables (Assignment Kanban & Grading)", style_h3))
r_t = [
    ["id", "INTEGER", "PK, AUTO_INCREMENT", "Unique task assignment ID"],
    ["title", "VARCHAR(200)", "NOT NULL", "Task title / assignment heading"],
    ["assigned_by", "INTEGER", "FK (users.id)", "Trainer or Director user ID"],
    ["assigned_to", "INTEGER", "FK (interns.id)", "Assigned candidate ID"],
    ["priority", "VARCHAR(20)", "DEFAULT 'Medium'", "Urgency ('High', 'Medium', 'Low')"],
    ["due_date", "DATE", "NULLABLE", "Submission deadline date"],
    ["status", "VARCHAR(20)", "DEFAULT 'Pending'", "Status ('Pending', 'Submitted', 'Approved')"]
]
add_tbl(h_d, r_t, [1.1*inch, 1.2*inch, 1.7*inch, 3.0*inch])

elements.append(Paragraph("5. Fees & Payments Tables (Double-Entry Ledgers & PDF Receipts)", style_h3))
r_f = [
    ["id", "INTEGER", "PK, AUTO_INCREMENT", "Unique transaction ID"],
    ["intern_id", "INTEGER", "FK (interns.id)", "Reference to paying candidate"],
    ["total_amount", "DECIMAL(10,2)", "NOT NULL", "Total tuition fee agreed"],
    ["paid_amount", "DECIMAL(10,2)", "DEFAULT 0.00", "Total cumulative paid"],
    ["remaining_amount", "DECIMAL(10,2)", "NOT NULL", "Outstanding balance dues"],
    ["receipt_number", "VARCHAR(50)", "UNIQUE, NOT NULL", "Official receipt serial number"],
    ["payment_mode", "VARCHAR(50)", "NOT NULL", "Payment mode ('Cash', 'UPI', 'Net Banking')"]
]
add_tbl(h_d, r_f, [1.1*inch, 1.2*inch, 1.7*inch, 3.0*inch])

# 4.2 Screenshots
elements.append(Paragraph("4.2 Input and Output Interface Designs", style_h2))
screens = [
    ("Portal Login Screen", "Unified portal authentication interface supporting role selection (Director, HR, Trainer, Intern), email address input, show/hide password toggle, and direct authentication."),
    ("Executive Director Dashboard", "High-level administrative console displaying total active trainees, staff attendance counts, monthly revenue collections, AI-synthesized daily activity highlights, and institution-wide metrics."),
    ("Candidate Dashboard", "Student-facing portal featuring attendance check-in/out widgets, assigned project tasks with due dates, recent grades, remaining fee balance summaries, and lecture schedules."),
    ("Attendance Management Console", "Multi-role biometric-style attendance tracker showing daily logs, clock-in/out timestamps, automated late detection flags, working hour computation, and monthly CSV export."),
    ("Task Assignment & Kanban Review Board", "Mentorship console enabling technical trainers to create assignments, define problem statements, monitor submissions, review GitHub/demo links, and submit grades with feedback."),
    ("Fee Ledger & Stamped PDF Receipt Screen", "Double-entry accounting module showing candidate installment history, payment modes (Cash, UPI, Card), and client-side instant generation of official PDF receipts with corporate branding."),
    ("Digital KYC & Document Repository", "Document verification interface allowing candidates to upload identity proofs and resumes, with HR verification workflows (Uploaded, Approved, Rejected)."),
    ("Automated Gemini AI Daily Log Summarizer", "Executive intelligence console synthesizing multiple daily trainer and HR work logs into structured bullet points for leadership decision-making."),
    ("Help Desk & Multi-Tier Ticketing Console", "Support ticketing interface enabling candidates to raise queries to specific trainers or HR, complete with priority indicators and resolution response threads."),
    ("Candidate Profile & Department View", "Institutional profile card displaying candidate credentials, assigned department ('Intern'), batch timing, academic qualifications, and verified contact details.")
]
for title, desc in screens:
    add_box(title, desc)

# 5. System Modules
elements.append(Paragraph("5. System Modules", style_h1))
modules = [
    ("5.1 Candidate (Intern) Module", "Provides registered trainees with an integrated interface for daily clock-in/out attendance, task submission with GitHub/live demo links, fee balance tracking, stamped PDF receipt download, and KYC document uploads."),
    ("5.2 Role-Based Authentication & Security Module", "Enforces Role-Based Access Control (RBAC), JSON Web Token (JWT) session security, Bcrypt password hashing, and real-time Gmail SMTP email OTP verification."),
    ("5.3 Multi-Role Attendance Engine & Cron Daemon", "Tracks precise punch-in/out timestamps, applies automated late-arrival flags (after 9:30 AM), and runs a background cron engine that automatically checks out unclosed sessions at 6:00 PM."),
    ("5.4 Task Delegation & Review Board Module", "Allows technical mentors to create programming assignments with deadlines and score trainee submissions using objective grading rubrics (0 - 100 marks and grades A+ through F)."),
    ("5.5 Fee Ledger, Double-Entry Tracking & PDF Receipts", "Maintains candidate financial accounts, updates remaining balances in atomic transactions, and generates client-side official signed PDF receipts with company credentials."),
    ("5.6 Digital KYC & Document Verification Module", "Centralizes storage of Aadhar cards, college IDs, resumes, and offer letters with administrative verification workflows ('Uploaded', 'Verified', 'Rejected')."),
    ("5.7 Daily Work Logs & Google Gemini AI Summarizer", "Synthesizes multi-day staff activity logs into structured executive bullet points using Google Gemini 1.5 Flash AI to give directors clear institutional intelligence."),
    ("5.8 Leave Requests & Attendance Synchronization", "Facilitates online leave submissions with review approval workflows that automatically synchronize with daily attendance to prevent incorrect absence marks."),
    ("5.9 Help Desk & Multi-Tier Ticketing Module", "Enables candidates and mentors to log queries directly to HR or the Director, complete with priority indicators and email notification alerts."),
    ("5.10 Institutional Auditing & Reporting Module", "Generates comprehensive audit spreadsheets across attendance, tasks, and financial ledgers with CSV export capabilities for academic and accreditation audits.")
]
for m_title, m_desc in modules:
    elements.append(Paragraph(m_title, style_h2))
    elements.append(Paragraph(m_desc, style_p))

# 6. Advantages
elements.append(Paragraph("6. Advantages of the System", style_h1))
elements.append(Paragraph("• <b>Centralized Institutional Records:</b> Consolidates candidate records, batch rosters, staff attendance, task evaluations, and fee transactions into a single relational database, eliminating conflicting spreadsheets.", style_bullet))
elements.append(Paragraph("• <b>High Attendance Accuracy:</b> Eliminates proxy sign-ins and manual calculation of working hours through precise timestamps, automated late-arrival flags, and background cron auto-checkout.", style_bullet))
elements.append(Paragraph("• <b>Financial Transparency & Error Prevention:</b> Enforces mathematical consistency across fee installments, preventing double entry or overpayments while providing instant, tamper-resistant PDF receipts.", style_bullet))
elements.append(Paragraph("• <b>Structured Performance Tracking:</b> Accelerates feedback loops between mentors and candidates through real-time task allocation, repository link submissions, and structured grading rubrics.", style_bullet))
elements.append(Paragraph("• <b>Streamlined KYC Compliance:</b> Automates identity proof uploads, preventing lost paper files and expediting candidate background checks.", style_bullet))
elements.append(Paragraph("• <b>AI-Powered Executive Intelligence:</b> Google Gemini Generative AI empowers executive directors with summarized insights into institutional productivity without requiring manual log collation.", style_bullet))

# 7. Future Scope
elements.append(Paragraph("7. Future Scope", style_h1))
elements.append(Paragraph("• <b>Dedicated Mobile Application:</b> Developing cross-platform mobile apps using Flutter or React Native to enable candidates and trainers to punch attendance, view grades, and receive push notifications directly on mobile phones.", style_bullet))
elements.append(Paragraph("• <b>Biometric & Geo-Fencing Integration:</b> Integrating biometric fingerprint scanners or GPS-based geofencing to verify physical presence within campus premises during attendance clock-in.", style_bullet))
elements.append(Paragraph("• <b>Automated Online Payment Gateway:</b> Connecting payment gateways such as Razorpay or Stripe to allow students to pay course fee installments directly via credit card, debit card, or net banking with instant webhooks.", style_bullet))
elements.append(Paragraph("• <b>Corporate Placement & Hiring Portal:</b> Implementing dedicated recruitment portal modules allowing corporate hiring partners to browse verified candidate resumes, view coding project scores, and schedule campus interviews.", style_bullet))
elements.append(Paragraph("• <b>Blockchain / QR-Verified Certification:</b> Automated generation of digitally signed, QR-code-verifiable course completion certificates based on minimum attendance and task completion thresholds.", style_bullet))

# 8. Conclusion
elements.append(Paragraph("8. Conclusion", style_h1))
elements.append(Paragraph("The <b>IICET Talent & Corporate Training Portal</b> is an enterprise-grade full-stack web application designed to centralize and automate the end-to-end administration of corporate training cohorts, candidate lifecycle management, and institutional governance.", style_p))
elements.append(Paragraph("The project utilizes React.js (Vite) to deliver a modern, responsive user interface across four role-based portals (Director, HR, Trainer, Candidate). The backend is engineered with Node.js and Express.js, providing secure RESTful API endpoints, Role-Based Access Control (RBAC), JWT authentication, background cron automations, and Google Gemini 1.5 Flash AI integration. High-integrity data persistence is achieved through a normalized relational architecture supporting both embedded SQLite and enterprise MySQL engines.", style_p))
elements.append(Paragraph("By automating attendance monitoring, assignment evaluations, fee ledger reconciliations, document verification, and administrative reporting, the system eliminates paperwork, minimizes human calculation errors, and establishes complete operational transparency across all institutional departments. Its modular structure establishes a strong foundation for future advancements, demonstrating how modern web technologies and artificial intelligence can transform institutional management.", style_p))

# 9. References
elements.append(Paragraph("9. References", style_h1))
elements.append(Paragraph("1. React Documentation. Official React developer documentation for components, hooks, and virtual DOM architecture. Available: https://react.dev", style_bullet))
elements.append(Paragraph("2. Node.js Runtime Documentation. Official Node.js API documentation covering asynchronous I/O, event loops, and server-side JavaScript runtime. Available: https://nodejs.org", style_bullet))
elements.append(Paragraph("3. Express.js Framework Guide. Official routing, middleware, and HTTP RESTful service documentation. Available: https://expressjs.com", style_bullet))
elements.append(Paragraph("4. SQLite Engine Documentation. Official documentation on SQLite ACID-compliant relational transactions and embedded SQL syntax. Available: https://sqlite.org", style_bullet))
elements.append(Paragraph("5. MySQL 8.0 Reference Manual. Official relational database administration and SQL syntax documentation. Available: https://dev.mysql.com/doc", style_bullet))
elements.append(Paragraph("6. Google Gemini AI SDK. Official Google AI developer documentation for the Gemini 1.5 Flash model and multimodal API integration. Available: https://ai.google.dev", style_bullet))
elements.append(Paragraph("7. JSON Web Token (JWT) Standard (RFC 7519). Internet Engineering Task Force (IETF) specification for secure token-based authentication. Available: https://tools.ietf.org/html/rfc7519", style_bullet))
elements.append(Paragraph("8. Nodemailer Documentation. Comprehensive guide to Node.js SMTP transport configuration and email protocols. Available: https://nodemailer.com", style_bullet))
elements.append(Paragraph("9. Mozilla Developer Network (MDN) Web Docs. References for HTML5, CSS3, JavaScript ES6+, and REST API standards. Available: https://developer.mozilla.org", style_bullet))
elements.append(Paragraph("10. Project Source Code. Complete source repository for the IICET Talent & Corporate Training Portal, including React components, Express REST API routes, and relational database schemas.", style_bullet))

# Build PDF
doc.build(elements)
print("SUCCESS: Professional PDF generated at:", pdf_path)
