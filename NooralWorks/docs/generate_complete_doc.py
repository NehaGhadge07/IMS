import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
import os

doc = docx.Document()

# Margins
for s in doc.sections:
    s.top_margin = Inches(1.0)
    s.bottom_margin = Inches(1.0)
    s.left_margin = Inches(1.0)
    s.right_margin = Inches(1.0)

def set_cell_background(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), hex_color)
    tcPr.append(shd)

def add_heading_1(text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(16)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = 'Calibri'
    run.font.size = Pt(16)
    run.font.bold = True
    run.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)

def add_heading_2(text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = 'Calibri'
    run.font.size = Pt(13)
    run.font.bold = True
    run.font.color.rgb = RGBColor(0x02, 0x84, 0xC7)

def add_heading_3(text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = 'Calibri'
    run.font.size = Pt(11.5)
    run.font.bold = True
    run.font.color.rgb = RGBColor(0x33, 0x41, 0x55)

def add_p(text):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.line_spacing = 1.15
    run = p.add_run(text)
    run.font.name = 'Calibri'
    run.font.size = Pt(11)
    run.font.color.rgb = RGBColor(0x1F, 0x29, 0x37)
    return p

def add_bullet(text, bold_prefix=None):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.15
    if bold_prefix:
        r_bold = p.add_run(bold_prefix)
        r_bold.font.name = 'Calibri'
        r_bold.font.size = Pt(11)
        r_bold.font.bold = True
        r_bold.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
    run = p.add_run(text)
    run.font.name = 'Calibri'
    run.font.size = Pt(11)
    run.font.color.rgb = RGBColor(0x1F, 0x29, 0x37)

def add_diagram_box(title, instructions):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = table.cell(0, 0)
    set_cell_background(cell, 'F1F5F9')
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(8)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_title = p.add_run(f"/* [DIAGRAM PLACEHOLDER: {title}] */\n")
    r_title.font.name = 'Calibri'
    r_title.font.size = Pt(11)
    r_title.font.bold = True
    r_title.font.color.rgb = RGBColor(0x25, 0x63, 0xEB)
    r_desc = p.add_run(instructions)
    r_desc.font.name = 'Calibri'
    r_desc.font.size = Pt(10)
    r_desc.font.italic = True
    r_desc.font.color.rgb = RGBColor(0x47, 0x55, 0x69)
    doc.add_paragraph().paragraph_format.space_after = Pt(4)

def add_table_data(headers, rows_data):
    table = doc.add_table(rows=len(rows_data) + 1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr_cells = table.rows[0].cells
    for i, h in enumerate(headers):
        hdr_cells[i].text = h
        set_cell_background(hdr_cells[i], '1E3A8A')
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs:
            r.font.name = 'Calibri'
            r.font.size = Pt(10)
            r.font.bold = True
            r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
    for r_idx, row in enumerate(rows_data):
        row_cells = table.rows[r_idx + 1].cells
        bg_col = 'F8FAFC' if r_idx % 2 == 1 else 'FFFFFF'
        for c_idx, val in enumerate(row):
            row_cells[c_idx].text = str(val)
            set_cell_background(row_cells[c_idx], bg_col)
            p = row_cells[c_idx].paragraphs[0]
            for r in p.runs:
                r.font.name = 'Calibri'
                r.font.size = Pt(9.5)
                r.font.color.rgb = RGBColor(0x1F, 0x29, 0x37)
    doc.add_paragraph().paragraph_format.space_after = Pt(6)

print("Starting document content generation...")

# ==================== 1. INTRODUCTION ====================
add_heading_1("1. Introduction")

add_heading_2("1.1 Project Introduction")
add_p("IICET Talent & Corporate Training Portal is a comprehensive web-based enterprise application developed to provide a centralized digital platform for managing the complete lifecycle of industrial talent development, technical training cohorts, and institutional operations. With technical education and corporate training playing a crucial role in workforce skill development, modern academies require an efficient mechanism to manage candidate onboarding, daily attendance logs, curriculum progress, programming task evaluations, and financial fee records.")
add_p("Traditional institutional administration often relies on manual paper registers, disconnected desktop spreadsheets, and informal messaging channels. These conventional methods cause significant operational bottlenecks, including attendance disputes, untracked fee installments, delayed project feedback, and fragmented candidate documentation. A unified digital governance portal brings these scattered operations into a structured, secure, and transparent environment.")
add_p("The IICET Talent & Corporate Training Portal organizes institutional activities through a responsive, role-based web interface supporting four distinct stakeholders: Director (Executive Management), HR Manager, Technical Trainers (Mentors), and Candidates (Trainees). The platform automates onboarding, tracks daily attendance with automated late detection, facilitates programming assignment reviews, manages leave requests, and verifies student KYC documents. Additionally, it provides double-entry fee ledger management with instant PDF receipt generation, as well as AI-powered executive summarization of daily staff activity logs.")
add_p("The project follows a standard three-tier application architecture:")
add_bullet(" React.js delivers an intuitive, responsive user interface with interactive role-specific dashboards, visual performance analytics, and dynamic form workflows.", "Frontend:")
add_bullet(" Node.js with Express.js handles business logic execution, Role-Based Access Control (RBAC), JWT security verification, background cron automation, and RESTful API management.", "Backend:")
add_bullet(" SQLite / MySQL provides a structured relational data store maintaining normalized records for users, attendance, task submissions, fee ledgers, and audit logs.", "Database:")
add_p("The frontend communicates with the backend via secure HTTP REST APIs sending and receiving structured JSON payloads. The backend validates requests, executes institutional business rules, queries the persistence layer, and returns formatted responses for display. Overall, the system eliminates administrative paperwork, minimizes human calculation errors, and establishes complete operational transparency across the institution. Its modular design ensures easy scalability for future enhancements such as placement drives and automated certification.")

add_heading_2("1.2 Existing System")
add_p("In the existing traditional approach, educational academies and industrial training institutes manage student admissions, attendance, and training operations through manual registers, disconnected Excel spreadsheets, and informal communication channels (such as WhatsApp groups or paper circulars). Candidate personal information, educational background, fee records, and KYC documents are collected physically or through disparate email threads.")
add_p("Similarly, institutional administrative officers and trainers maintain batch rosters, daily attendance, class schedules, and project marks in isolated physical registers or personal desktop computers. When records are maintained in fragmented storage, updating and reviewing information requires substantial manual effort.")
add_p("The traditional approach creates several severe operational difficulties:")
add_bullet(" Candidate personal details, contact information, qualifications, and batch allocations are recorded manually across multiple physical logbooks. When a student updates contact information or shifts batches, physical updates are delayed or lost, resulting in outdated administrative records.", "Manual Candidate Record Management: ")
add_bullet(" Trainers track attendance using manual signature sheets, which lack precise timestamps. This encourages proxy attendance, leads to disputes regarding punch-in and punch-out timings, and complicates the calculation of monthly working hours.", "Attendance Inaccuracies and Time Disputes: ")
add_bullet(" Technical programming assignments and source code links are submitted through informal chat threads or email attachments. Mentors struggle to track submission deadlines, maintain version histories, and provide objective grading rubrics.", "Difficulty in Managing Project Tasks and Submissions: ")
add_bullet(" Candidates frequently pay training course fees across multiple installments (Cash, Cheque, or UPI). Recording installments across manual paper ledgers frequently causes accounting mismatches, delay in reconciliation, and inconvenience in issuing formal fee receipts.", "Fee Collection and Ledger Discrepancies: ")
add_bullet(" Directors and institutional leaders have no real-time dashboard or unified reporting system to monitor daily staff operations, attendance statistics, or financial summaries without requesting multiple offline reports.", "Lack of Centralized Executive Visibility: ")

add_heading_2("1.3 Need and Scope of the System")
add_heading_3("Need of the System")
add_p("The primary need for the IICET Talent & Corporate Training Portal is to organize candidate profiles, technical training workflows, and institutional administrative operations in a centralized, secure digital environment.")
add_p("The system is needed for the following core reasons:")
add_bullet(" Provides a common, secure relational repository to maintain candidate profiles, batch allotments, technology domains, contact credentials, and enrollment statuses.", "1. Centralized Candidate Records: ")
add_bullet(" Replaces error-prone paper registers with real-time clock-in and clock-out timestamps, automated late-arrival detection, and background cron auto-checkout.", "2. Automated Attendance Monitoring: ")
add_bullet(" Facilitates structured assignment allocation, project proof submission tracking, and systematic grading rubrics, eliminating lost assignments and delayed feedback.", "3. Structured Task and Performance Evaluation: ")
add_bullet(" Maintains an automated double-entry ledger to track fee installments, calculate remaining balances, prevent accounting errors, and instantly generate digital PDF receipts.", "4. Transparent Fee and Installment Management: ")
add_bullet(" Streamlines candidate identity verification by enabling secure online uploads of government ID proofs and resumes for authorized verification.", "5. Digital KYC and Document Repository: ")
add_bullet(" Enables executives to access institution-wide operational metrics and leverages Google Gemini AI to synthesize multi-day staff activity logs into actionable summaries.", "6. Executive Visibility & AI Summarization: ")
add_bullet(" Eliminates repetitive paperwork, minimizes human calculation errors, and establishes complete operational transparency across all institutional tiers.", "7. Reduced Manual Effort and Administrative Overhead: ")

add_heading_3("Scope of the System")
add_p("The scope defines the operations supported by the application and the institutional areas in which it is utilized:")
add_bullet(" Supports candidate authentication, personal profile maintenance, daily clock-in/out attendance logging, assignment submission with GitHub/live URLs, fee installment ledger review, stamped PDF receipt download, leave applications, and curriculum schedule access.", "A. Candidate (Trainee) Scope: ")
add_bullet(" Enables mentors to view assigned batches, create technical assignments with submission deadlines, review and score trainee project submissions, manage lecture schedules, and submit daily work activity logs for management review.", "B. Technical Trainer (Mentor) Scope: ")
add_bullet(" Supports end-to-end candidate onboarding, batch allotment, recording fee installment payments, verifying uploaded KYC credentials, processing leave requests with automated attendance synchronization, and managing admission enquiries.", "C. HR & Administrative Scope: ")
add_bullet(" Provides high-level institutional dashboards displaying overall enrollment numbers, fee revenue analytics, staff attendance, audit logs, and AI-generated multi-day staff performance summaries for strategic governance.", "D. Director & Executive Management Scope: ")

add_heading_2("1.4 Organization Profile")
add_p("IICET Talent & Corporate Training Portal is the enterprise application developed for IICET Services Private Limited (Satara, Maharashtra) to organize, monitor, and automate technical training cohorts, candidate skill development, and institutional operations through a centralized digital platform.")
add_p("The organization focuses on bridging the gap between academic education and corporate industry expectations by providing structured technical training in software engineering, practical development projects, and corporate skill programs. The portal utilizes modern web technologies to streamline administrative workflows and ensure seamless collaboration between candidates, technical mentors, human resources, and executive leadership through dedicated role-specific modules.")
add_p("The portal supports the complete candidate lifecycle, including registration and batch allotment, biometric-style attendance tracking with automated late detection, practical assignment delegation, leave approval workflows, digital KYC document verification, and fee ledger management with instant PDF receipt generation. By combining these functions into a unified software system, the project demonstrates how full-stack web technologies and artificial intelligence can be effectively applied to institutional governance and talent management.")
add_p("The application utilizes a decoupled three-tier architecture: React.js powers the responsive frontend client layer, Node.js with Express.js handles server-side processing, Role-Based Access Control (RBAC), and RESTful APIs, while MySQL / SQLite stores structured relational application records. This separation makes it possible to maintain the different parts of the application independently and ensures high scalability.")

# ==================== 2. PROPOSED SYSTEM ====================
add_heading_1("2. Proposed System")

add_heading_2("2.1 Objective")
add_p("The main objective of the IICET Talent & Corporate Training Portal is to develop a web-based system that organizes candidate training information and supports student learning activities, mentor evaluations, and administrative management workflows.")
add_p("The specific objectives are described below:")
add_bullet(" The system aims to bring candidate information, attendance tracking, task evaluations, and fee transactions into a common web-based platform, eliminating the need to maintain separate spreadsheets for every operation.", "1. To Develop a Centralized Institutional Portal: ")
add_bullet(" The application provides an intuitive graphical interface through which candidates, mentors, and administrators can access dedicated role-specific functionalities. React.js is used to develop reusable UI components.", "2. To Provide a Responsive Role-Based Interface: ")
add_bullet(" The system provides secure role-based access control (RBAC) supporting four distinct roles (Director, HR, Trainer, Intern) authenticated using JSON Web Tokens (JWT) and Gmail SMTP email OTP verification.", "3. To Implement Secure Role-Based Authentication: ")
add_bullet(" The portal automates daily attendance recording with automated late detection, working-hour calculation, and background cron jobs that enforce auto-checkout at 6:00 PM.", "4. To Automate Attendance and Time Tracking: ")
add_bullet(" The system allows technical mentors to create programming assignments, set deadlines, and grade student submissions with objective scoring and feedback.", "5. To Streamline Task Delegation and Evaluation: ")
add_bullet(" Maintains an automated double-entry ledger to track fee installments, calculate remaining balances, prevent accounting errors, and generate client-side signed PDF receipts.", "6. To Manage Fee Structures and Generate Receipts: ")
add_bullet(" Integrates Google Gemini 1.5 Flash AI to aggregate and synthesize multi-day staff activity logs into executive bullet points for institutional governance.", "7. To Provide Automated Executive AI Summaries: ")

add_heading_2("2.2 Requirement Engineering")
add_p("Requirement engineering is the process of identifying, analyzing, documenting, and validating the requirements of a software system. In the IICET Talent & Corporate Training Portal, requirement engineering helps define what the application should do, who will use it, what information it must store, and how different modules interact.")
add_p("The requirements are divided into functional requirements, non-functional requirements, hardware requirements, and software requirements:")

add_heading_3("A. Functional Requirements")
add_bullet(" The system provides a registration interface through which HR can onboard new candidates, assign batches, designate training schedules, and establish initial credentials.", "1. Candidate Onboarding: ")
add_bullet(" Secure login functionality validating user credentials, issuing JWT session tokens, and routing users to their designated role dashboards (Director, HR, Trainer, Intern).", "2. Role-Based Authentication: ")
add_bullet(" Allows candidates and staff to record clock-in and clock-out timestamps with automated late-arrival detection and working-hour computation.", "3. Attendance Engine: ")
add_bullet(" Enables trainers to create programming assignments, attach problem statements, set deadlines, and assign them to specific candidates or entire batches.", "4. Task Allocation: ")
add_bullet(" Candidates submit project work with repository and live hosting links; mentors review, grade, and record evaluation feedback.", "5. Submission & Grading Board: ")
add_bullet(" Tracks total course fees, payments made, and remaining balances, preventing overpayments and generating printable PDF fee receipts.", "6. Fee Ledger & PDF Invoicing: ")
add_bullet(" Candidates and staff submit leave applications specifying leave type and dates; HR reviews and approves requests with automatic attendance synchronization.", "7. Leave Management Workflow: ")
add_bullet(" Secure repository allowing candidates to upload identity proofs and resumes, with administrative verification states (Uploaded, Verified, Rejected).", "8. KYC Document Verification: ")
add_bullet(" Multi-tier ticketing portal allowing candidates and mentors to log queries to HR or the Director, with thread responses and resolution states.", "9. Helpdesk & Query System: ")
add_bullet(" Google Gemini Generative AI synthesizes daily work logs submitted by trainers and HR into executive summaries for the Director.", "10. Executive AI Analytics: ")

add_heading_2("2.3 Requirement Gathering")
add_p("Requirement gathering is the process of identifying the information and functionality needed by the intended stakeholders. For the IICET Talent & Corporate Training Portal, requirements were gathered by studying the complete industrial training lifecycle, from candidate enquiry and admission to daily monitoring, performance evaluation, and final placement preparation.")
add_bullet(" Candidates need profile management, daily attendance logging, task submission, fee balance tracking, leave applications, and schedule viewing.", "Identification of Candidate Activities: ")
add_bullet(" Mentors need batch management, assignment creation, submission grading, curriculum scheduling, and daily log submission.", "Identification of Mentor Activities: ")
add_bullet(" HR needs candidate onboarding, batch allotment, fee collection, leave approvals, document verification, and admission enquiry pipelines.", "Identification of Administrative Activities: ")
add_bullet(" Directors require executive dashboards, institutional financial summaries, staff attendance monitoring, and automated AI activity reports.", "Identification of Executive Activities: ")
add_bullet(" The application requires normalized relational schemas for users, interns, mentors, attendance, tasks, fees, payments, documents, and notifications.", "Identification of Data Requirements: ")

add_heading_2("2.4 Hardware and Software Specification")
add_heading_3("Hardware Requirements")
add_bullet(" Intel Core i3 or higher (or equivalent AMD/Apple processor)", "Processor: ")
add_bullet(" 4 GB or higher (8 GB recommended)", "RAM: ")
add_bullet(" 50 GB free hard disk space", "Hard Disk: ")
add_bullet(" 1366 x 768 or higher display resolution", "Monitor: ")
add_bullet(" Standard QWERTY Keyboard and Mouse", "Input Devices: ")

add_heading_3("Software Requirements")
headers_sw = ["Software", "Version", "Role in the Project"]
rows_sw = [
    ["Operating System", "Windows 10 / 11 / Linux", "Development and production hosting environment"],
    ["Node.js Runtime", "v20.x / v22.x LTS", "Executes server-side JavaScript engine and REST APIs"],
    ["Express.js", "^4.19.2", "Backend web application framework routing API endpoints"],
    ["React.js", "^19.2.7", "Frontend library for building reactive user interfaces"],
    ["Vite", "^8.1.1", "High-performance frontend build tool and bundler"],
    ["SQLite (node:sqlite)", "Native Engine", "Embedded ACID-compliant primary relational database"],
    ["MySQL Server", "8.0 / 8.4 LTS", "Secondary enterprise relational data storage and synchronization"],
    ["Google Gemini AI", "1.5 Flash SDK", "Generative AI engine synthesizing daily staff work logs"],
    ["Nodemailer", "^6.9.13", "Gmail SMTP protocol dispatcher for automated emails and OTPs"],
    ["Postman", "Latest", "Testing, debugging, and documenting REST API endpoints"],
    ["Web Browser", "Google Chrome / Edge", "Client-side rendering, debugging, and web application testing"]
]
add_table_data(headers_sw, rows_sw)

# ==================== 3. SYSTEM DIAGRAMS ====================
add_heading_1("3. System Diagrams")

add_heading_2("3.1 Data Flow Diagrams (DFD)")

add_heading_3("Level 0 DFD (Context Level)")
add_p("The Level 0 Context Diagram depicts the entire IICET Talent & Corporate Training Portal as a single central process interacting with external entities: Candidates (Trainees), Mentors (Trainers), HR Managers, and the Director.")
add_diagram_box("Level 0 DFD - Context Diagram",
"Paste your Level 0 Context Diagram here.\nEntities: Candidate, Trainer, HR Manager, Director.\nCentral Process: 0.0 IICET Talent & Corporate Training Portal.\nData Flows: Login credentials, attendance punch, task submissions, fee payments, leave applications, AI summaries, and notifications.")

add_heading_3("Level 1 DFD: Administrator & HR Workflow")
add_p("The Level 1 Administrative DFD decomposes the system into primary administrative subsystems, including User Authentication, Intern Onboarding, Fee Collection, Attendance Oversight, and Document Verification.")
add_diagram_box("Level 1 DFD - Admin & HR Management",
"Paste your Level 1 Admin DFD here.\nProcesses: 1.0 Authentication, 1.1 Candidate Onboarding, 1.2 Fee Management, 1.3 Leave Approval, 1.4 KYC Document Verification, 1.5 System Reporting.\nData Stores: D1 Users, D2 Interns, D3 Fees, D4 Attendance, D5 Documents.")

add_heading_3("Level 1 DFD: Candidate & Trainer Workflow")
add_p("The Level 1 Candidate & Trainer DFD illustrates the interaction between trainees and mentors, covering attendance logging, assignment allocation, task submission, and evaluation scoring.")
add_diagram_box("Level 1 DFD - Candidate & Trainer Operations",
"Paste your Level 1 Candidate & Trainer DFD here.\nProcesses: 2.0 Candidate Attendance Logging, 2.1 Task Allocation, 2.2 Task Submission, 2.3 Performance Grading, 2.4 Helpdesk Query Logging.\nData Stores: D1 Attendance, D2 Tasks, D3 Task Updates, D4 Helpdesk.")

add_heading_3("Level 2 DFD: Detailed Subsystems")
add_p("The Level 2 DFD diagrams provide deep-dive decomposition into specific transactional subsystems: Attendance Clock-In/Out Processing, Task Submission & Grading, and Fee Ledger with PDF Receipting.")
add_diagram_box("Level 2 DFD - Subsystem Decomposition",
"Paste your Level 2 DFD here.\nDetailed Subsystems:\n- 2.1 Attendance Engine (Check-in, Check-out, Cron Auto-checkout, Late Detection)\n- 2.2 Task Delegation & Review Board (Assignment, GitHub Link Submission, Grading)\n- 2.3 Fee Payment & Receipt Generator (Installment Recording, Ledger Balance, PDF Generation)")

add_heading_2("3.2 Entity Relationship Diagram (ERD)")
add_p("The Entity Relationship Diagram (ERD) defines the relational structure, primary keys, foreign key constraints, and cardinalities connecting the 14 core database entities supporting the portal.")
add_diagram_box("Entity Relationship Diagram (ERD)",
"Paste your full database ER Diagram here.\nEntities: Users, Mentors, Interns, Attendance, Mentor_Attendance, HR_Attendance, Daily_Work_Logs, Trainings, Tasks, Task_Updates, Fees, Payments, Documents, Leave_Requests, Helpdesk_Queries, Activity_Logs.")

add_heading_2("3.3 Use Case Diagrams")
add_heading_3("Use Case Diagram: Director & HR Administration")
add_p("Illustrates the functional use cases available to executive leadership and human resource officers.")
add_diagram_box("Use Case Diagram - Director & HR",
"Paste your Director & HR Use Case Diagram here.\nActors: Director, HR Manager.\nUse Cases: User Authentication, Onboard Candidate, Allocate Batch, Record Fee Payment, Approve Leave, Verify KYC, Generate Executive AI Report, Monitor Institutional Metrics.")

add_heading_3("Use Case Diagram: Candidate & Technical Trainer")
add_p("Illustrates the functional use cases available to trainees and technical mentors.")
add_diagram_box("Use Case Diagram - Candidate & Trainer",
"Paste your Candidate & Trainer Use Case Diagram here.\nActors: Intern (Candidate), Technical Trainer (Mentor).\nUse Cases: Clock-In/Out Attendance, View Timetable, Assign Task, Submit Project Proof, Grade Submission, Download Fee Receipt, Submit Leave Request, Raise Helpdesk Ticket.")

add_heading_2("3.4 Activity Diagrams")
add_heading_3("Activity Diagram: Administrative & Evaluation Flow")
add_p("Depicts the step-by-step operational workflow followed by mentors and HR when onboarding candidates and evaluating project assignments.")
add_diagram_box("Activity Diagram - Administrative & Evaluation Flow",
"Paste your Admin Activity Diagram here.\nFlow: Admin Login -> Role Verification -> Select Module -> Create Task / Process Fee / Review Leave -> Database Validation -> Commit Transaction -> Send Email Notification -> Logout.")

add_heading_3("Activity Diagram: Candidate Lifecycle Flow")
add_p("Depicts the sequential workflow executed by candidates from initial portal sign-in to attendance recording, task completion, and receipt downloading.")
add_diagram_box("Activity Diagram - Candidate Lifecycle Flow",
"Paste your Candidate Activity Diagram here.\nFlow: Candidate Login -> View Dashboard -> Clock-In Attendance -> Check Assigned Tasks -> Upload Proof / Links -> Submit Work -> Review Remaining Fee Balance -> Download PDF Receipt -> Clock-Out -> Logout.")

add_heading_2("3.5 Sequence Diagrams")
add_heading_3("Sequence Diagram: Administrative Management & Fee Workflow")
add_p("Shows object interactions between the Web Browser, Express REST API, and SQLite/MySQL Database for administrative actions.")
add_diagram_box("Sequence Diagram - Admin Workflow",
"Paste your Admin Sequence Diagram here.\nLifelines: Actor (HR/Admin), React Frontend, Express Server, Database Layer.\nMessages: POST /api/auth/login, POST /api/fees/payments, validate transaction, update ledger balance, commit, return receipt response.")

add_heading_3("Sequence Diagram: Candidate Attendance & Task Submission")
add_p("Illustrates time-ordered messaging sequence during candidate attendance clock-in and project task submission.")
add_diagram_box("Sequence Diagram - Candidate Workflow",
"Paste your Candidate Sequence Diagram here.\nLifelines: Intern, React UI, Express API, Database, Email Service.\nMessages: POST /api/attendance/check-in, calculate late status, record timestamp, PUT /api/tasks/:id/submit, notify mentor via email, return success.")

# ==================== 4. SYSTEM DESIGN & DATA DICTIONARY ====================
add_heading_1("4. System Design & Data Dictionary")

add_heading_2("4.1 Relational Data Dictionary")
add_p("The Data Dictionary documents the schema definitions, field data types, nullability, constraints, and operational descriptions for the normalized database tables:")

# Table 1: Users
add_heading_3("1. Users Table (Core Authentication & Role Management)")
h_users = ["Field Name", "Data Type", "Constraints", "Description"]
r_users = [
    ["id", "INTEGER / INT", "PK, AUTO_INCREMENT", "Unique identifier for every portal user"],
    ["name", "VARCHAR(100)", "NOT NULL", "Full legal name of user"],
    ["email", "VARCHAR(150)", "UNIQUE, NOT NULL", "Official email address used for login"],
    ["role", "VARCHAR(20)", "NOT NULL", "System role: 'Director', 'HR', 'Mentor', 'Intern'"],
    ["department", "VARCHAR(100)", "NOT NULL", "Assigned department ('Director', 'Human Resources', 'Employee', 'Intern')"],
    ["designation", "VARCHAR(100)", "NULLABLE", "Job designation or student status"],
    ["status", "VARCHAR(20)", "DEFAULT 'Active'", "Account status: 'Active', 'Inactive', 'Suspended'"],
    ["password_hash", "VARCHAR(255)", "NOT NULL", "Bcrypt cryptographic hash of login password"],
    ["plain_password", "VARCHAR(100)", "NULLABLE", "Cleartext password reference for administrative auditing"],
    ["profile_photo", "VARCHAR(255)", "NULLABLE", "Path/filename of uploaded profile photo"],
    ["mobile_number", "VARCHAR(20)", "NULLABLE", "Contact phone number"],
    ["joining_date", "DATE", "NULLABLE", "Official registration or joining date"],
    ["is_online", "TINYINT(1)", "DEFAULT 0", "Session online indicator (1 = Active, 0 = Offline)"],
    ["last_active_at", "DATETIME", "NULLABLE", "Timestamp of last API activity heartbeat"],
    ["created_at", "DATETIME", "DEFAULT CURRENT_TIMESTAMP", "Timestamp when record was established"]
]
add_table_data(h_users, r_users)

# Table 2: Interns
add_heading_3("2. Interns Table (Candidate Profile Extension)")
h_interns = ["Field Name", "Data Type", "Constraints", "Description"]
r_interns = [
    ["id", "INTEGER / INT", "PK, AUTO_INCREMENT", "Unique intern profile ID"],
    ["user_id", "INTEGER / INT", "FK (users.id), UNIQUE", "Reference to core user account"],
    ["batch", "VARCHAR(50)", "NOT NULL", "Assigned cohort (e.g., 'Batch 2026-A')"],
    ["training_time", "VARCHAR(50)", "NOT NULL", "Scheduled training slot (e.g., '09:00 AM - 01:00 PM')"],
    ["mentor_id", "INTEGER / INT", "FK (users.id), NULLABLE", "Assigned technical trainer / mentor user ID"],
    ["hr_id", "INTEGER / INT", "FK (users.id), NULLABLE", "Onboarding HR officer user ID"],
    ["department", "VARCHAR(50)", "DEFAULT 'Intern'", "Institutional department categorization"],
    ["technology", "VARCHAR(100)", "NOT NULL", "Learning track (e.g., 'Full Stack Development', 'Data Science')"],
    ["duration_months", "INTEGER", "DEFAULT 6", "Internship duration in months"],
    ["college_name", "VARCHAR(150)", "NULLABLE", "University or college institution"],
    ["qualifications", "VARCHAR(100)", "NULLABLE", "Highest academic degree (e.g., 'MCA', 'B.Tech')"],
    ["status", "VARCHAR(20)", "DEFAULT 'Active'", "Training status ('Active', 'Completed', 'Dropped')"],
    ["resume_url", "VARCHAR(255)", "NULLABLE", "File path of uploaded resume document"],
    ["linkedin_url", "VARCHAR(255)", "NULLABLE", "Candidate LinkedIn professional profile URL"],
    ["github_url", "VARCHAR(255)", "NULLABLE", "Candidate GitHub portfolio repository URL"]
]
add_table_data(h_interns, r_interns)

# Table 3: Mentors
add_heading_3("3. Mentors Table (Trainer Profile Extension)")
h_mentors = ["Field Name", "Data Type", "Constraints", "Description"]
r_mentors = [
    ["id", "INTEGER / INT", "PK, AUTO_INCREMENT", "Unique mentor record ID"],
    ["user_id", "INTEGER / INT", "FK (users.id), UNIQUE", "Reference to core user account"],
    ["department", "VARCHAR(50)", "DEFAULT 'Employee'", "Institutional department categorization"],
    ["technology", "VARCHAR(100)", "NOT NULL", "Core technical specialization"],
    ["performance_rating", "DECIMAL(3,1)", "DEFAULT 5.0", "Mentor performance score (1.0 to 5.0)"],
    ["performance_notes", "TEXT", "NULLABLE", "Administrative review and evaluation notes"],
    ["hr_id", "INTEGER / INT", "FK (users.id), NULLABLE", "HR officer who allocated mentor"]
]
add_table_data(h_mentors, r_mentors)

# Table 4: Attendance
add_heading_3("4. Attendance Table (Candidate Daily Attendance Engine)")
h_att = ["Field Name", "Data Type", "Constraints", "Description"]
r_att = [
    ["id", "INTEGER / INT", "PK, AUTO_INCREMENT", "Unique attendance session ID"],
    ["intern_id", "INTEGER / INT", "FK (interns.id)", "Reference to intern profile"],
    ["date", "DATE", "NOT NULL", "Attendance session calendar date (YYYY-MM-DD)"],
    ["check_in_time", "VARCHAR(20)", "NULLABLE", "Recorded check-in timestamp (HH:MM:SS)"],
    ["check_out_time", "VARCHAR(20)", "NULLABLE", "Recorded check-out timestamp (HH:MM:SS)"],
    ["status", "VARCHAR(20)", "NOT NULL", "Status ('Present', 'Late', 'Half Day', 'Absent', 'On Leave')"],
    ["working_hours", "DECIMAL(4,2)", "DEFAULT 0.00", "Total computed working duration in decimal hours"]
]
add_table_data(h_att, r_att)

# Table 5: Tasks
add_heading_3("5. Tasks Table (Assignment Delegation & Kanban)")
h_tasks = ["Field Name", "Data Type", "Constraints", "Description"]
r_tasks = [
    ["id", "INTEGER / INT", "PK, AUTO_INCREMENT", "Unique task ID"],
    ["title", "VARCHAR(200)", "NOT NULL", "Task title / assignment heading"],
    ["description", "TEXT", "NULLABLE", "Detailed problem statement and instructions"],
    ["assigned_by", "INTEGER / INT", "FK (users.id)", "Trainer or Director user ID who created task"],
    ["assigned_to", "INTEGER / INT", "FK (interns.id), NULLABLE", "Assigned intern ID (NULL if batch-wide)"],
    ["batch", "VARCHAR(50)", "NULLABLE", "Target batch cohort"],
    ["priority", "VARCHAR(20)", "DEFAULT 'Medium'", "Priority level ('High', 'Medium', 'Low')"],
    ["due_date", "DATE", "NULLABLE", "Submission deadline date"],
    ["status", "VARCHAR(20)", "DEFAULT 'Pending'", "Status ('Pending', 'In Progress', 'Submitted', 'Completed', 'Approved')"],
    ["created_at", "DATETIME", "DEFAULT CURRENT_TIMESTAMP", "Task creation timestamp"]
]
add_table_data(h_tasks, r_tasks)

# Table 6: Task Updates
add_heading_3("6. Task Updates Table (Submissions & Evaluations)")
h_tu = ["Field Name", "Data Type", "Constraints", "Description"]
r_tu = [
    ["id", "INTEGER / INT", "PK, AUTO_INCREMENT", "Unique submission record ID"],
    ["task_id", "INTEGER / INT", "FK (tasks.id)", "Reference to assigned task"],
    ["intern_id", "INTEGER / INT", "FK (interns.id)", "Submitting candidate ID"],
    ["notes", "TEXT", "NULLABLE", "Candidate submission remarks or methodology description"],
    ["github_url", "VARCHAR(255)", "NULLABLE", "Git repository proof URL"],
    ["live_url", "VARCHAR(255)", "NULLABLE", "Hosted demo deployment link"],
    ["marks", "INTEGER", "NULLABLE", "Marks awarded by trainer (0 - 100)"],
    ["grade", "VARCHAR(5)", "NULLABLE", "Academic grade ('A+', 'A', 'B', 'C', etc.)"],
    ["submitted_at", "DATETIME", "DEFAULT CURRENT_TIMESTAMP", "Submission timestamp"],
    ["reviewed_at", "DATETIME", "NULLABLE", "Evaluation timestamp"]
]
add_table_data(h_tu, r_tu)

# Table 7: Fees
add_heading_3("7. Fees Table (Candidate Financial Ledgers)")
h_fees = ["Field Name", "Data Type", "Constraints", "Description"]
r_fees = [
    ["id", "INTEGER / INT", "PK, AUTO_INCREMENT", "Unique fee ledger ID"],
    ["intern_id", "INTEGER / INT", "FK (interns.id), UNIQUE", "Reference to intern profile"],
    ["total_amount", "DECIMAL(10,2)", "NOT NULL", "Total tuition / course fee agreed"],
    ["paid_amount", "DECIMAL(10,2)", "DEFAULT 0.00", "Total cumulative amount paid"],
    ["remaining_amount", "DECIMAL(10,2)", "NOT NULL", "Remaining balance dues"],
    ["due_date", "DATE", "NULLABLE", "Next installment payment deadline"],
    ["status", "VARCHAR(20)", "DEFAULT 'Unpaid'", "Fee status ('Unpaid', 'Partially Paid', 'Fully Paid')"]
]
add_table_data(h_fees, r_fees)

# Table 8: Payments
add_heading_3("8. Payments Table (Transaction Logs & Receipts)")
h_pay = ["Field Name", "Data Type", "Constraints", "Description"]
r_pay = [
    ["id", "INTEGER / INT", "PK, AUTO_INCREMENT", "Unique payment transaction ID"],
    ["fee_id", "INTEGER / INT", "FK (fees.id)", "Reference to parent fee ledger"],
    ["intern_id", "INTEGER / INT", "FK (interns.id)", "Paying candidate ID"],
    ["amount", "DECIMAL(10,2)", "NOT NULL", "Installment payment amount (INR)"],
    ["payment_date", "DATE", "NOT NULL", "Transaction calendar date"],
    ["payment_mode", "VARCHAR(50)", "NOT NULL", "Mode ('Cash', 'UPI', 'Net Banking', 'Cheque')"],
    ["receipt_number", "VARCHAR(50)", "UNIQUE, NOT NULL", "Official invoice / receipt serial number"],
    ["recorded_by", "INTEGER / INT", "FK (users.id)", "HR officer user ID who validated transaction"]
]
add_table_data(h_pay, r_pay)

# Table 9: Documents
add_heading_3("9. Documents Table (KYC Repository)")
h_doc = ["Field Name", "Data Type", "Constraints", "Description"]
r_doc = [
    ["id", "INTEGER / INT", "PK, AUTO_INCREMENT", "Unique document ID"],
    ["intern_id", "INTEGER / INT", "FK (interns.id)", "Reference to intern profile"],
    ["document_type", "VARCHAR(50)", "NOT NULL", "Type ('Aadhar Card', 'College ID', 'Offer Letter', 'Resume')"],
    ["file_path", "VARCHAR(255)", "NOT NULL", "Server disk file path in /uploads"],
    ["status", "VARCHAR(20)", "DEFAULT 'Uploaded'", "Status ('Uploaded', 'Verified', 'Rejected')"],
    ["uploaded_at", "DATETIME", "DEFAULT CURRENT_TIMESTAMP", "Upload timestamp"]
]
add_table_data(h_doc, r_doc)

# Table 10: Daily Work Logs
add_heading_3("10. Daily Work Logs Table (Staff Progress & Gemini AI)")
h_logs = ["Field Name", "Data Type", "Constraints", "Description"]
r_logs = [
    ["id", "INTEGER / INT", "PK, AUTO_INCREMENT", "Unique daily log ID"],
    ["user_id", "INTEGER / INT", "FK (users.id)", "Trainer or HR officer user ID"],
    ["date", "DATE", "NOT NULL", "Activity date"],
    ["tasks_completed", "TEXT", "NOT NULL", "Summary of completed syllabus and operations"],
    ["issues_faced", "TEXT", "NULLABLE", "Challenges or student doubts encountered"],
    ["plans_for_tomorrow", "TEXT", "NULLABLE", "Upcoming session plan"],
    ["created_at", "DATETIME", "DEFAULT CURRENT_TIMESTAMP", "Log submission timestamp"]
]
add_table_data(h_logs, r_logs)

# Table 11: Leave Requests
add_heading_3("11. Leave Requests Table (Leave Workflow)")
h_leave = ["Field Name", "Data Type", "Constraints", "Description"]
r_leave = [
    ["id", "INTEGER / INT", "PK, AUTO_INCREMENT", "Unique leave request ID"],
    ["user_id", "INTEGER / INT", "FK (users.id)", "Applicant user ID"],
    ["leave_type", "VARCHAR(50)", "NOT NULL", "Type ('Sick Leave', 'Exam Leave', 'Casual Leave')"],
    ["start_date", "DATE", "NOT NULL", "Leave commencement date"],
    ["end_date", "DATE", "NOT NULL", "Leave concluding date"],
    ["reason", "TEXT", "NOT NULL", "Detailed reason for absence"],
    ["status", "VARCHAR(20)", "DEFAULT 'Pending'", "Approval state ('Pending', 'Approved', 'Rejected')"],
    ["reviewed_by", "INTEGER / INT", "FK (users.id), NULLABLE", "HR/Director user ID who adjudicated request"],
    ["review_note", "TEXT", "NULLABLE", "Administrative remarks or rejection cause"]
]
add_table_data(h_leave, r_leave)

# Table 12: Helpdesk Queries
add_heading_3("12. Helpdesk Queries Table (Support & Grievances)")
h_help = ["Field Name", "Data Type", "Constraints", "Description"]
r_help = [
    ["id", "INTEGER / INT", "PK, AUTO_INCREMENT", "Unique ticket ID"],
    ["sender_id", "INTEGER / INT", "FK (users.id)", "Ticket initiator user ID"],
    ["target_role", "VARCHAR(20)", "NOT NULL", "Target authority ('HR', 'Trainer', 'Director')"],
    ["target_user_id", "INTEGER / INT", "FK (users.id), NULLABLE", "Specific recipient staff user ID"],
    ["subject", "VARCHAR(200)", "NOT NULL", "Query summary"],
    ["message", "TEXT", "NOT NULL", "Detailed explanation of grievance or question"],
    ["priority", "VARCHAR(20)", "DEFAULT 'Normal'", "Ticket urgency ('Normal', 'High', 'Urgent')"],
    ["category", "VARCHAR(50)", "DEFAULT 'General'", "Category ('Technical', 'Fee', 'Attendance', 'General')"],
    ["status", "VARCHAR(20)", "DEFAULT 'Open'", "Status ('Open', 'In Progress', 'Resolved')"],
    ["answer", "TEXT", "NULLABLE", "Official response provided by staff"],
    ["answered_by", "INTEGER / INT", "FK (users.id), NULLABLE", "Responding staff user ID"],
    ["created_at", "DATETIME", "DEFAULT CURRENT_TIMESTAMP", "Ticket creation timestamp"]
]
add_table_data(h_help, r_help)

# ==================== 4.3 INPUT AND OUTPUT SCREENS ====================
add_heading_2("4.2 Input and Output Screen Designs")
add_p("The user interface of the IICET Talent & Corporate Training Portal was designed using modern design principles with responsive sidebars, cards, and interactive data visualization. Below are the key system interface screens:")

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

for s_title, s_desc in screens:
    add_heading_3(s_title)
    add_p(s_desc)
    add_diagram_box(s_title, f"Paste the actual screenshot of the {s_title} here.\nResolution recommendation: 1280x720 or 1920x1080 for crisp academic formatting.")

# ==================== 5. SYSTEM MODULES ====================
add_heading_1("5. System Modules")
add_p("The IICET Talent & Corporate Training Portal is decomposed into distinct, modular functional subsystems to ensure high cohesion, low coupling, and role-based security across institutional operations:")

add_heading_2("5.1 Candidate (Intern) Module")
add_p("The Candidate Module provides the interface through which registered trainees interact with institutional training workflows. Candidates securely authenticate to review their active learning track, batch timings, and mentor allocation. The module features one-click clock-in and clock-out attendance tracking, task submission with GitHub repository links and live URLs, fee installment ledger review, stamped PDF fee receipt downloads, leave request submissions, and personal KYC document uploads.")

add_heading_2("5.2 Role-Based Authentication & Security Module")
add_p("The Authentication Module handles user identification, session management, and authorization across the four supported roles (Director, HR, Trainer, Intern). It enforces JSON Web Token (JWT) verification on protected API endpoints, hashes user passwords using Bcrypt (10 salt rounds), and supports real-time email OTP verification via Gmail SMTP protocol. A role guard prevents privilege escalation across tiers.")

add_heading_2("5.3 Multi-Role Attendance Engine & Cron Daemon")
add_p("The Attendance Module provides continuous time tracking for candidates, mentors, and HR staff. It records real-time punch-in timestamps, flags arrivals after 09:30 AM as 'Late', and calculates total daily working hours upon punch-out. The system executes background cron schedulers that automatically log out unclosed sessions at 6:00 PM and flag unrecorded attendees as 'Absent', eliminating manual logbook errors.")

add_heading_2("5.4 Task Delegation & Review Board Module")
add_p("The Task Management Module enables technical mentors and directors to create, assign, and evaluate practical software assignments. Mentors specify task headings, descriptions, priority levels, and submission deadlines. Candidates upload completed project proofs, and mentors grade submissions using an objective evaluation rubric (0 - 100 marks and grades A+ through F) with review notes.")

add_heading_2("5.5 Fee Ledger, Double-Entry Tracking & PDF Receipts Module")
add_p("The Financial Fee Module maintains structured student ledgers adhering to double-entry consistency. Total tuition fees, cumulative payments, and outstanding balances are updated in atomic transactions. The module prevents overpayments and utilizes jsPDF and jsPDF-AutoTable to instantly generate client-side official, branded PDF receipts containing company registration credentials, GSTIN, CIN, and authorized signatures.")

add_heading_2("5.6 Digital KYC & Document Verification Module")
add_p("The Document Repository centralizes the storage and administrative verification of student identity proofs (Aadhar card, college ID), resumes, and official offer letters. Candidates upload files through Multer static storage, and HR administrators review documents with one-click verification status changes ('Uploaded', 'Verified', 'Rejected').")

add_heading_2("5.7 Daily Work Logs & Google Gemini AI Summarizer Module")
add_p("Staff members submit daily work logs detailing completed curriculum topics, student doubts handled, and operational tasks. The portal integrates Google Gemini 1.5 Flash Generative AI to analyze multi-day logs and synthesize them into structured executive summaries for the Director, highlighting productivity, milestones, and operational recommendations.")

add_heading_2("5.8 Leave Requests & Attendance Synchronization Module")
add_p("Allows candidates and staff to submit leave requests specifying dates and reasons. Reviewing authorities (HR and Director) receive automated email alerts to approve or reject requests. Approved leaves automatically synchronize with the attendance engine, preventing erroneous absence flags.")

add_heading_2("5.9 Help Desk & Multi-Tier Ticketing Module")
add_p("Provides an internal support channel where candidates and staff can raise technical, fee, or administrative queries directly to specific trainers, HR, or the Director. The system notifies recipients via email and maintains full conversational history until the ticket is resolved.")

add_heading_2("5.10 Institutional Auditing & Reporting Module")
add_p("Generates institutional audit reports across candidate rosters, mentor allocations, financial ledgers, and attendance compliance. Administrators can filter records by date ranges or batches and export verified data into CSV spreadsheets for academic or corporate accreditation audits.")

# ==================== 6. ADVANTAGES ====================
add_heading_1("6. Advantages of the System")
add_p("The IICET Talent & Corporate Training Portal offers substantial operational and academic advantages over conventional manual administration:")
add_bullet(" Consolidates candidate records, batch rosters, staff attendance, task evaluations, and fee transactions into a single relational database, eliminating conflicting spreadsheets.", "6.1 Centralized Institutional Records: ")
add_bullet(" Eliminates proxy sign-ins and manual calculation of working hours through precise timestamps, automated late-arrival flags, and background cron auto-checkout.", "6.2 High Attendance Accuracy: ")
add_bullet(" Enforces mathematical consistency across fee installments, preventing double entry or overpayments while providing instant, tamper-resistant PDF receipts.", "6.3 Financial Transparency & Error Prevention: ")
add_bullet(" Accelerates feedback loops between mentors and candidates through real-time task allocation, repository link submissions, and structured grading rubrics.", "6.4 Structured Performance Tracking: ")
add_bullet(" Automates identity proof uploads, preventing lost paper files and expediting candidate background checks.", "6.5 Streamlined KYC Compliance: ")
add_bullet(" Google Gemini Generative AI empowers executive directors with summarized insights into institutional productivity without requiring manual log collation.", "6.6 AI-Powered Executive Intelligence: ")

# ==================== 7. FUTURE SCOPE ====================
add_heading_1("7. Future Scope")
add_p("The modular architecture of the system allows several advanced capabilities to be incorporated in future release cycles:")
add_bullet(" Developing cross-platform mobile apps using Flutter or React Native to enable candidates and trainers to punch attendance, view grades, and receive push notifications directly on mobile phones.", "7.1 Dedicated Mobile Application: ")
add_bullet(" Integrating biometric fingerprint scanners or GPS-based geofencing to verify physical presence within campus premises during attendance clock-in.", "7.2 Biometric & Geo-Fencing Integration: ")
add_bullet(" Connecting payment gateways such as Razorpay or Stripe to allow students to pay course fee installments directly via credit card, debit card, or net banking with instant webhooks.", "7.3 Automated Online Payment Gateway: ")
add_bullet(" Implementing dedicated recruitment portal modules allowing corporate hiring partners to browse verified candidate resumes, view coding project scores, and schedule campus interviews.", "7.4 Corporate Placement & Hiring Portal: ")
add_bullet(" Automated generation of digitally signed, QR-code-verifiable course completion certificates based on minimum attendance and task completion thresholds.", "7.5 Blockchain / QR-Verified Certification: ")

# ==================== 8. CONCLUSION ====================
add_heading_1("8. Conclusion")
add_p("The IICET Talent & Corporate Training Portal is an enterprise-grade full-stack web application designed to centralize and automate the end-to-end administration of corporate training cohorts, candidate lifecycle management, and institutional governance.")
add_p("The project utilizes React.js (Vite) to deliver a modern, responsive user interface across four role-based portals (Director, HR, Trainer, Candidate). The backend is engineered with Node.js and Express.js, providing secure RESTful API endpoints, Role-Based Access Control (RBAC), JWT authentication, background cron automations, and Google Gemini 1.5 Flash AI integration. High-integrity data persistence is achieved through a normalized relational architecture supporting both embedded SQLite and enterprise MySQL engines.")
add_p("By automating attendance monitoring, assignment evaluations, fee ledger reconciliations, document verification, and administrative reporting, the system eliminates paperwork, minimizes human calculation errors, and establishes complete operational transparency across all institutional departments. Its modular structure establishes a strong foundation for future advancements, demonstrating how modern web technologies and artificial intelligence can transform institutional management.")

# ==================== 9. REFERENCES ====================
add_heading_1("9. References")
add_bullet(" React Documentation. Official React developer documentation for components, hooks, and virtual DOM architecture. Available: https://react.dev", "1. ")
add_bullet(" Node.js Runtime Documentation. Official Node.js API documentation covering asynchronous I/O, event loops, and server-side JavaScript runtime. Available: https://nodejs.org", "2. ")
add_bullet(" Express.js Framework Guide. Official routing, middleware, and HTTP RESTful service documentation. Available: https://expressjs.com", "3. ")
add_bullet(" SQLite Engine Documentation. Official documentation on SQLite ACID-compliant relational transactions and embedded SQL syntax. Available: https://sqlite.org", "4. ")
add_bullet(" MySQL 8.0 Reference Manual. Official relational database administration and SQL syntax documentation. Available: https://dev.mysql.com/doc", "5. ")
add_bullet(" Google Gemini AI SDK. Official Google AI developer documentation for the Gemini 1.5 Flash model and multimodal API integration. Available: https://ai.google.dev", "6. ")
add_bullet(" JSON Web Token (JWT) Standard (RFC 7519). Internet Engineering Task Force (IETF) specification for secure token-based authentication. Available: https://tools.ietf.org/html/rfc7519", "7. ")
add_bullet(" Nodemailer Documentation. Comprehensive guide to Node.js SMTP transport configuration and email protocols. Available: https://nodemailer.com", "8. ")
add_bullet(" Mozilla Developer Network (MDN) Web Docs. References for HTML5, CSS3, JavaScript ES6+, and REST API standards. Available: https://developer.mozilla.org", "9. ")
add_bullet(" Project Source Code. Complete source repository for the IICET Talent & Corporate Training Portal, including React components, Express REST API routes, and relational database schemas.", "10. ")

out_path = os.path.abspath(r"C:\Users\neha0\OneDrive\Desktop\MCA_Major_Project_Documentation\IMS\IICET_Talent_Management_Project_Documentation.docx")
doc.save(out_path)
print(f"SUCCESS: Document saved to {out_path}")
