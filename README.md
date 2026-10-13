# Secure, Policy-Driven Student Placement Management System
### NFSU Placement Cell — Session 2026–27

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Architecture Overview](#4-architecture-overview)
5. [Database Schema](#5-database-schema)
6. [Role-Based Access Control](#6-role-based-access-control)
7. [Placement Policy Engine](#7-placement-policy-engine)
8. [Security Controls](#8-security-controls)
9. [API Endpoints](#9-api-endpoints)
10. [Frontend Pages & Components](#10-frontend-pages--components)
11. [Environment Configuration](#11-environment-configuration)
12. [Installation & Setup](#12-installation--setup)
13. [Testing Strategy](#13-testing-strategy)
14. [Audit Logging](#14-audit-logging)
15. [Limitations & Future Scope](#15-limitations--future-scope)

---

## 1. Project Overview

A centralized, secure, and policy-driven web application for NFSU's Placement Cell to manage course-wise student placement records for the 2026–27 session. The system automates placement policy checks, manages recruitment activity, tracks offers and joining status, and generates reliable placement statistics — all with security and privacy built into its core design.

### Programmes Covered

| Code | Programme |
|------|-----------|
| MTCS | M.Tech. Computer Science |
| MTAIDS | M.Tech. Artificial Intelligence and Data Science |
| BTMTCSE | B.Tech.–M.Tech. Computer Science and Engineering |
| MSCCS | M.Sc. Computer Science |
| MSCDFIS | M.Sc. Digital Forensics and Information Security |

---

## 2. Technology Stack

### Backend
| Layer | Technology | Purpose |
|-------|-----------|---------|
| Runtime | Node.js (v20 LTS) | Server-side JavaScript runtime |
| Framework | Express.js (v4) | REST API framework |
| Database | MongoDB (v7) + Mongoose | Document store with schema validation |
| Authentication | JWT (jsonwebtoken) + bcryptjs | Stateless auth + password hashing |
| MFA | speakeasy + qrcode | TOTP-based MFA for Admin and Coordinator |
| Validation | express-validator + Joi | Server-side input validation |
| Security Headers | helmet | HTTP security headers |
| Rate Limiting | express-rate-limit | Brute-force protection |
| Logging | winston + morgan | Structured audit and access logging |
| Encryption | crypto (Node built-in) + mongoose-encryption | Field-level encryption at rest |
| CORS | cors | Cross-origin policy |
| Session | express-session + connect-mongo | Secure session store |
| Export | exceljs | Audited CSV/Excel export |
| Environment | dotenv | Secrets management |

### Frontend
| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | React 18 | UI library |
| Routing | React Router v6 | Client-side routing |
| State | React Context API + useReducer | Global state management |
| HTTP Client | axios | API communication with interceptors |
| UI Library | Tailwind CSS + shadcn/ui | Accessible, responsive components |
| Forms | React Hook Form + Zod | Client-side validation |
| Charts | Recharts | Dashboard statistics |
| Auth Guard | Custom PrivateRoute HOC | Route-level RBAC enforcement |
| Notifications | react-hot-toast | User feedback |

---

## 3. Project Structure

```
Mashakti/
├── README.md
│
├── backend/
│   ├── package.json
│   ├── .env.example
│   ├── .eslintrc.js
│   └── src/
│       ├── app.js                        # Express app setup, middleware chain
│       ├── server.js                     # HTTP server entry point
│       │
│       ├── config/
│       │   ├── db.js                     # MongoDB connection with retry logic
│       │   ├── helmet.config.js          # Helmet CSP and header configuration
│       │   ├── rateLimit.config.js       # Rate limiter presets (auth, api, export)
│       │   └── roles.config.js           # Role definitions and permission matrix
│       │
│       ├── models/
│       │   ├── User.model.js             # Auth users (admin, student, coordinator, recruiter)
│       │   ├── Student.model.js          # Core student profile and placement fields
│       │   ├── Offer.model.js            # Individual offer events (immutable history)
│       │   ├── Company.model.js          # Company profile, category, and eligibility criteria
│       │   ├── RecruitmentActivity.model.js  # Attendance at drives, tests, interviews
│       │   ├── AuditLog.model.js         # Tamper-evident audit trail
│       │   └── PolicyRule.model.js       # Configurable policy rules (DB-driven)
│       │
│       ├── controllers/
│       │   ├── auth.controller.js        # Login, logout, MFA setup, token refresh
│       │   ├── student.controller.js     # CRUD + archive + import/export
│       │   ├── offer.controller.js       # Offer creation, acceptance, expiry tracking
│       │   ├── company.controller.js     # Company and category management
│       │   ├── recruitment.controller.js # Drive attendance and absenteeism tracking
│       │   ├── policy.controller.js      # Policy rule CRUD and manual override
│       │   ├── dashboard.controller.js   # Aggregated statistics and reports
│       │   └── audit.controller.js       # Audit log viewer (admin only)
│       │
│       ├── routes/
│       │   ├── index.js                  # Route aggregator
│       │   ├── auth.routes.js
│       │   ├── student.routes.js
│       │   ├── offer.routes.js
│       │   ├── company.routes.js
│       │   ├── recruitment.routes.js
│       │   ├── policy.routes.js
│       │   ├── dashboard.routes.js
│       │   └── audit.routes.js
│       │
│       ├── middleware/
│       │   ├── authenticate.js           # JWT verification + token blacklist check
│       │   ├── authorize.js              # Role and permission enforcement
│       │   ├── auditLogger.js            # Auto-log sensitive route access
│       │   ├── validateRequest.js        # express-validator error handler
│       │   ├── sanitizeInput.js          # XSS and NoSQL injection sanitization
│       │   └── sessionGuard.js           # Session timeout and hijack detection
│       │
│       ├── services/
│       │   ├── policyEngine.service.js   # Core switching-rule and offer-type logic
│       │   ├── eligibility.service.js    # Registration + academic eligibility checks
│       │   ├── offerExpiry.service.js    # Cron job: flag expired offer acceptances
│       │   ├── absenteeism.service.js    # Cron job: flag absenteeism exclusions
│       │   ├── encryption.service.js     # Field-level encrypt/decrypt helpers
│       │   ├── export.service.js         # Audited Excel/CSV generation
│       │   └── notification.service.js   # Internal alerts for policy flags
│       │
│       ├── validators/
│       │   ├── student.validator.js      # Joi schemas for student create/update
│       │   ├── offer.validator.js        # Joi schemas for offer events
│       │   ├── auth.validator.js         # Login and password change schemas
│       │   └── company.validator.js      # Company and category schemas
│       │
│       └── utils/
│           ├── apiResponse.js            # Standardized success/error response wrapper
│           ├── placementId.js            # Unique Placement ID generator + duplicate check
│           ├── tokenBlacklist.js         # In-memory + Redis-ready JWT revocation
│           └── constants.js             # Enums: categories, offer types, statuses
│
└── frontend/
    ├── package.json
    ├── .env.example
    ├── tailwind.config.js
    ├── vite.config.js
    └── src/
        ├── main.jsx                      # React entry point
        ├── App.jsx                       # Router setup + auth guard wrapper
        │
        ├── context/
        │   ├── AuthContext.jsx           # JWT storage, user state, logout
        │   └── PolicyContext.jsx         # Active policy rules for UI hints
        │
        ├── hooks/
        │   ├── useAuth.js                # Auth context consumer
        │   ├── usePolicy.js              # Policy engine consumer
        │   └── useAuditLog.js            # Trigger client-side audit events
        │
        ├── services/
        │   ├── api.js                    # Axios instance with auth interceptors
        │   ├── student.service.js        # Student API calls
        │   ├── offer.service.js          # Offer API calls
        │   ├── company.service.js        # Company API calls
        │   ├── dashboard.service.js      # Stats and report API calls
        │   └── auth.service.js           # Login, MFA, token refresh
        │
        ├── utils/
        │   ├── roleGuard.js              # Permission check helpers
        │   ├── formatters.js             # Date, currency, status formatters
        │   └── validators.js             # Zod schemas mirroring backend rules
        │
        ├── components/
        │   ├── layout/
        │   │   ├── Navbar.jsx
        │   │   ├── Sidebar.jsx
        │   │   └── ProtectedRoute.jsx    # RBAC route guard
        │   ├── common/
        │   │   ├── DataTable.jsx         # Sortable, filterable table
        │   │   ├── ConfirmDialog.jsx     # Destructive action confirmation
        │   │   ├── PolicyBadge.jsx       # Visual policy status indicator
        │   │   ├── AuditBadge.jsx        # Audit reference display
        │   │   └── ExportButton.jsx      # Role-gated export trigger
        │   ├── students/
        │   │   ├── StudentForm.jsx       # Create/edit with validation
        │   │   ├── StudentCard.jsx       # Profile summary
        │   │   └── EligibilityStatus.jsx # Visual eligibility indicator
        │   ├── offers/
        │   │   ├── OfferForm.jsx         # Offer entry with policy pre-check
        │   │   ├── OfferTimeline.jsx     # Immutable offer history
        │   │   └── PolicyConflictAlert.jsx  # Inline policy violation warning
        │   └── dashboard/
        │       ├── StatsCard.jsx
        │       ├── CoursewiseChart.jsx
        │       ├── PackageDistribution.jsx
        │       └── PendingActionsPanel.jsx
        │
        └── pages/
            ├── Login.jsx                 # Secure login + MFA challenge
            ├── Dashboard.jsx             # Role-aware stats overview
            ├── Students/
            │   ├── StudentList.jsx       # Searchable, filterable list
            │   ├── StudentDetail.jsx     # Full profile + offer history
            │   └── StudentImport.jsx     # Bulk import with validation
            ├── Offers/
            │   ├── OfferList.jsx         # All offers with status filters
            │   └── OfferEntry.jsx        # New offer + policy engine result
            ├── Companies/
            │   ├── CompanyList.jsx
            │   └── CompanyDetail.jsx
            ├── Recruitment/
            │   └── DriveAttendance.jsx   # Attendance tracking per drive
            ├── Reports/
            │   ├── CoursewiseReport.jsx
            │   ├── PackageReport.jsx
            │   └── AuditReport.jsx       # Admin-only audit log viewer
            ├── Policy/
            │   └── PolicyManager.jsx     # Admin: configure switching rules
            └── NotFound.jsx
```

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     React Frontend                       │
│  ProtectedRoute → Page → Service → Axios (JWT header)   │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS
┌────────────────────────▼────────────────────────────────┐
│                   Express Backend                        │
│                                                          │
│  helmet → cors → rateLimit → sanitizeInput               │
│       → authenticate → authorize → auditLogger           │
│       → validateRequest → Controller                     │
│                    │                                     │
│         ┌──────────▼──────────┐                         │
│         │   Service Layer      │                         │
│         │  policyEngine        │                         │
│         │  eligibility         │                         │
│         │  encryption          │                         │
│         └──────────┬──────────┘                         │
└────────────────────┼────────────────────────────────────┘
                     │ Mongoose ODM
┌────────────────────▼────────────────────────────────────┐
│                    MongoDB                               │
│  Students | Offers | Companies | AuditLogs | Users       │
│           (field-level encryption on PII fields)         │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Database Schema

### Student
```
placementId       String  UNIQUE, indexed
name              String  encrypted
mobile            String  encrypted, role-restricted
email             String  encrypted
course            Enum    [MTCS, MTAIDS, BTMTCSE, MSCCS, MSCDFIS]
batch             String
registrationStatus Enum   [registered, deregistered, not_registered]
eligibilityStatus  Enum   [eligible, ineligible, pending]
placementStatus    Enum   [unplaced, internship_only, fte_only, internship_fte]
currentCategory    Enum   [A+, A, B, C, null]
currentPackageLPA  Number
isArchived         Boolean
createdBy          ObjectId → User
updatedBy          ObjectId → User
timestamps         true
```

### Offer (immutable event log — never overwrite)
```
student           ObjectId → Student
company           ObjectId → Company
offerType         Enum    [I, F, I+F]
category          Enum    [A+, A, B, C]
stipendAmount     Number  (if I or I+F)
stipendPeriod     String
ctcLPA            Number  (if F or I+F)
ppoStatus         Enum    [na, pending, offered, accepted, declined]
acceptanceStatus  Enum    [pending, accepted, declined, expired]
joiningStatus     Enum    [pending, joined, not_joined]
offerDate         Date
acceptanceDeadline Date
policyCheckResult Object  { allowed, reason, flags[] }
isOffCampus       Boolean
nocStatus         String
createdBy         ObjectId → User
timestamps        true
```

### Company
```
name              String  UNIQUE
category          Enum    [A+, A, B, C]
minPackageLPA     Number
maxPackageLPA     Number
eligibilityCriteria Object
isActive          Boolean
```

### AuditLog (tamper-evident)
```
actor             ObjectId → User
action            String   (e.g. OFFER_CREATED, STUDENT_UPDATED)
targetModel       String
targetId          ObjectId
ipAddress         String
userAgent         String
before            Mixed    (encrypted snapshot)
after             Mixed    (encrypted snapshot)
timestamp         Date     (indexed, no update allowed)
```

### User
```
username          String  UNIQUE
passwordHash      String  (bcrypt, cost 12)
role              Enum    [admin, student, coordinator, recruiter]
mfaSecret         String  encrypted
mfaEnabled        Boolean
isActive          Boolean
lastLogin         Date
failedAttempts    Number
lockedUntil       Date
```

---

## 6. Role-Based Access Control

| Permission | Admin | Student | Coordinator | Recruiter |
|-----------|-------|---------|-------------|-----------|
| Create/edit student | ✅ | ❌ | ✅ (own course) | ❌ |
| View own profile | ✅ | ✅ (own only) | ✅ (own course) | ❌ |
| View mobile/email | ✅ | ✅ (own only) | ✅ (own course) | ❌ |
| Archive student | ✅ | ❌ | ❌ | ❌ |
| Bulk import | ✅ | ❌ | ❌ | ❌ |
| Create offer | ✅ | ❌ | ❌ | ❌ |
| View offers | ✅ | ✅ (own only) | ✅ (own course) | ✅ (own company) |
| View company list | ✅ | ✅ (read-only) | ✅ | ✅ (own company) |
| View placed count per company | ✅ | ✅ (read-only) | ✅ (own course) | ✅ (own company) |
| Override policy flag | ✅ | ❌ | ❌ | ❌ |
| Manage companies | ✅ | ❌ | ❌ | ❌ |
| View dashboard | ✅ | ❌ | ✅ (own course) | ❌ |
| Export data | ✅ | ❌ | ❌ | ❌ |
| View audit logs | ✅ | ❌ | ❌ | ❌ |
| Manage policy rules | ✅ | ❌ | ❌ | ❌ |
| Manage users | ✅ | ❌ | ❌ | ❌ |

---

## 7. Placement Policy Engine

Located in `backend/src/services/policyEngine.service.js`

### Company Category Switching Rules

| Category | Package | Rule |
|----------|---------|------|
| A+ | ≥ ₹16 LPA | No switching — student exits placement process |
| A | ₹10–16 LPA | May switch only to A+ |
| B | ₹6–10 LPA | May switch if new package ≥ 1.5× current package |
| C | < ₹6 LPA | Eligible for higher-category opportunities |

### Offer-Type Restrictions

| Current Offer | Can Apply For |
|--------------|--------------|
| I (Internship only) | F or I+F only |
| F (FTE only) | I only |
| I+F (Internship + PPO/FTE) | No further participation |

### Additional Automated Checks

- Registration and eligibility verified before any offer entry
- Attendance tracked per drive; 3-drive exclusion flagged on absenteeism
- Offer acceptance deadline tracked (24 hours or company timeline, whichever is earlier)
- Off-campus offers, deregistration, and NOC status recorded
- All policy conflicts flagged for review; overrides require admin role + audit note

### Policy Engine Response Shape

```json
{
  "allowed": false,
  "reason": "Student holds A-category offer. Switching only permitted to A+ companies.",
  "flags": ["SWITCHING_VIOLATION"],
  "requiresManualReview": false,
  "overridableBy": ["admin"]
}
```

---

## 8. Security Controls

### Authentication & Session
- Passwords hashed with bcrypt (cost factor 12)
- JWT access token (15 min) + refresh token (7 days, HTTP-only cookie)
- TOTP-based MFA via speakeasy
- Account lockout after 5 failed login attempts
- Token blacklist on logout
- Session timeout with server-side invalidation

### Transport & Storage
- HTTPS enforced (TLS 1.2+)
- Helmet sets strict CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- Field-level encryption for PII (name, mobile, email) and compensation data using AES-256
- Encrypted MongoDB backups

### Input Security
- All inputs validated server-side with Joi before reaching controllers
- express-mongo-sanitize prevents NoSQL injection
- xss-clean strips XSS payloads
- Parameterized Mongoose queries only — no raw string interpolation

### Rate Limiting
- Auth endpoints: 10 requests / 15 min per IP
- API endpoints: 100 requests / min per user
- Export endpoints: 5 requests / hour per user

### Audit & Integrity
- Every sensitive action (create, update, delete, export, login, override) written to AuditLog
- AuditLog documents have no update route — append-only
- Before/after snapshots stored for all student and offer mutations
- Unique Placement ID enforced at DB level (unique index)

### Export Security
- CSV/Excel exports require Officer or Admin role
- Every export event logged with actor, timestamp, filters applied, and row count
- Exports do not include raw PII unless explicitly authorized by Admin

---

## 9. API Endpoints

### Auth
```
POST   /api/auth/login              Public
POST   /api/auth/mfa/verify         Public
POST   /api/auth/refresh            Public
POST   /api/auth/logout             Authenticated
POST   /api/auth/change-password    Authenticated
```

### Students
```
GET    /api/students                Admin
POST   /api/students                Admin
GET    /api/students/:id            Admin / Coordinator (own course) / Student (own only)
PUT    /api/students/:id            Admin / Coordinator (own course)
PATCH  /api/students/:id/archive    Admin only
POST   /api/students/import         Admin only
GET    /api/students/export         Admin only  (audited)
```

### Offers
```
GET    /api/offers                  Admin / Coordinator (own course) / Recruiter (own company)
POST   /api/offers                  Admin  (policy check runs here)
GET    /api/offers/:id              Admin / Student (own only) / Recruiter (own company)
PATCH  /api/offers/:id/acceptance   Admin
PATCH  /api/offers/:id/joining      Admin
POST   /api/offers/:id/override     Admin only
```

### Companies
```
GET    /api/companies               Admin / Coordinator / Recruiter / Student (read-only, no PII)
GET    /api/companies/:id/stats     Admin / Coordinator / Student (placed count, category, package range only)
POST   /api/companies               Admin only
PUT    /api/companies/:id           Admin only
```

### Recruitment
```
POST   /api/recruitment/drive       Admin
POST   /api/recruitment/attendance  Admin
GET    /api/recruitment/absentees   Admin / Coordinator (own course)
```

### Dashboard & Reports
```
GET    /api/dashboard/summary       Admin
GET    /api/dashboard/coursewise    Admin / Coordinator (own course)
GET    /api/dashboard/packages      Admin
GET    /api/dashboard/pending       Admin
```

### Policy
```
GET    /api/policy/rules            Admin
PUT    /api/policy/rules/:id        Admin
POST   /api/policy/check            Admin  (dry-run check)
```

### Audit
```
GET    /api/audit/logs              Admin only
GET    /api/audit/logs/:targetId    Admin only
```

---

## 10. Frontend Pages & Components

### Pages

| Route | Page | Access |
|-------|------|--------|
| `/login` | Login.jsx | Public |
| `/dashboard` | Dashboard.jsx | Admin / Coordinator |
| `/profile` | StudentDetail.jsx | Student (own only) |
| `/students` | StudentList.jsx | Admin / Coordinator |
| `/students/:id` | StudentDetail.jsx | Admin / Coordinator |
| `/students/import` | StudentImport.jsx | Admin |
| `/offers` | OfferList.jsx | Admin / Coordinator / Recruiter |
| `/offers/new` | OfferEntry.jsx | Admin |
| `/companies` | CompanyList.jsx | Admin / Coordinator / Recruiter / Student (read-only) |
| `/companies/:id` | CompanyDetail.jsx | Admin / Coordinator / Recruiter / Student (placed count only) |
| `/recruitment` | DriveAttendance.jsx | Admin |
| `/reports/coursewise` | CoursewiseReport.jsx | Admin / Coordinator |
| `/reports/packages` | PackageReport.jsx | Admin |
| `/reports/audit` | AuditReport.jsx | Admin |
| `/policy` | PolicyManager.jsx | Admin |

### Key Security Behaviors in UI
- ProtectedRoute checks role before rendering any page
- Mobile and email fields masked by default; reveal requires explicit action (logged)
- PolicyConflictAlert shown inline before offer submission
- ConfirmDialog required for all destructive actions
- ExportButton visible to Admin only; hidden for all other roles
- Student role sees own profile, own offer history, company list (read-only), and placed count per company — no access to other students' data
- Axios interceptor attaches JWT and handles 401 by triggering token refresh or logout

---

## 11. Environment Configuration

### backend/.env.example
```
NODE_ENV=production
PORT=5000

MONGODB_URI=mongodb+srv://<user>:<password>@cluster/placement_db
MONGODB_ENCRYPTION_KEY=<32-byte-hex-key>

JWT_ACCESS_SECRET=<strong-random-secret>
JWT_REFRESH_SECRET=<strong-random-secret>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

BCRYPT_ROUNDS=12

SESSION_SECRET=<strong-random-secret>

MFA_ISSUER=NFSU_Placement

ALLOWED_ORIGINS=https://placement.nfsu.ac.in

AUDIT_ENCRYPTION_KEY=<32-byte-hex-key>
```

### frontend/.env.example
```
VITE_API_BASE_URL=https://api.placement.nfsu.ac.in/api
VITE_APP_NAME=NFSU Placement Portal
```

---

## 12. Installation & Setup

### Prerequisites
- Node.js v20 LTS
- MongoDB v7 (Atlas or self-hosted)
- npm v10+

### Backend
```bash
cd backend
npm install
cp .env.example .env          # Fill in all secrets
npm run dev                   # Development
npm start                     # Production
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev                   # Development (Vite)
npm run build                 # Production build
```

### Database Seeding (Development Only)
```bash
cd backend
npm run seed:admin            # Creates initial admin user
npm run seed:demo             # Loads sample students and companies
```

---

## 13. Testing Strategy

### Backend Tests (`backend/src/__tests__/`)
```
auth.test.js              Login, MFA, lockout, token refresh
student.test.js           CRUD, duplicate ID, archive, RBAC
offer.test.js             Policy engine: all switching rules, offer types
policyEngine.test.js      Unit tests for every rule combination
security.test.js          SQLi/NoSQL injection, XSS, IDOR attempts
audit.test.js             Audit log creation and immutability
export.test.js            Export authorization and audit trail
```

### Frontend Tests (`frontend/src/__tests__/`)
```
ProtectedRoute.test.jsx   Role-based route blocking
OfferEntry.test.jsx       Policy conflict alert display
StudentForm.test.jsx      Validation and field masking
Login.test.jsx            MFA challenge flow
```

### Security Test Cases
- Student attempts to modify own placement status via direct API call → 403
- Student attempts to access another student's record by ID manipulation → 403
- Recruiter attempts to create or edit an offer → 403
- Coordinator attempts to access students outside own course → 403
- Submit offer bypassing policy check → blocked by server-side engine
- Brute-force login → account lockout after 5 attempts
- Inject NoSQL operator in search query → sanitized, no data leak
- Access audit logs as Coordinator or Recruiter → 403

---

## 14. Audit Logging

Every sensitive action produces an AuditLog entry:

| Action | Logged Fields |
|--------|--------------|
| LOGIN / LOGOUT | actor, ip, userAgent, timestamp |
| STUDENT_CREATED | actor, after snapshot |
| STUDENT_UPDATED | actor, before, after, changed fields |
| STUDENT_ARCHIVED | actor, before |
| OFFER_CREATED | actor, policyCheckResult, after |
| OFFER_OVERRIDE | actor, reason, before, after |
| EXPORT_GENERATED | actor, filters, rowCount, timestamp |
| PII_VIEWED | actor, targetStudentId, field revealed |
| POLICY_RULE_CHANGED | actor, before, after |
| USER_CREATED / LOCKED | actor, targetUser |

Audit records are append-only. No UPDATE or DELETE route exists for AuditLog. Before/after snapshots of PII fields are stored encrypted.

---

## 15. Limitations & Future Scope

### Current Limitations
- MFA is optional per user (admin can enforce it organization-wide in a future release)
- Backup restoration is manual; automated restore testing is not yet scripted
- Email/SMS notifications for offer deadlines are stubbed, not connected to an external provider
- Off-campus offer workflow requires manual data entry by an officer

### Future Scope
- SSO integration with NFSU identity provider
- Automated email reminders for offer acceptance deadlines
- Mobile-responsive PWA for students to view (read-only) their own placement status
- Advanced analytics: year-over-year placement trends
- Digital signature on exported reports
- Redis-backed token blacklist for horizontal scaling

---

## Security Notice

This system processes personal contact information and compensation data of students. All contributors must:
1. Never commit `.env` files or secrets to version control
2. Use parameterized queries exclusively — no string-interpolated DB queries
3. Run `npm audit` before every release and resolve high/critical findings
4. Follow the principle of least privilege when assigning roles
5. Treat audit logs as evidence — do not modify or delete them

---

*NFSU Placement Cell — Placement Session 2026–27*
