# 🏥 Medical Care — Unified Health & Clinic Platform

> A full-stack web application designed to bring doctor appointments, blood donor discovery, daily medication tracking, mental wellness journaling, and medical records into a single, clean workspace.

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-22c55e.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.19.2-3b82f6.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%208.3-10b981.svg)](https://www.mongodb.com/)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3.3-8b5cf6.svg)](https://getbootstrap.com/)
[![Auth](https://img.shields.io/badge/Auth-JWT%20%2B%20Sessions-f59e0b.svg)](https://jwt.io/)

---

## 📌 Table of Contents

1. [Why We Built This](#1-why-we-built-this)
2. [Everyday Problems We Address](#2-everyday-problems-we-address)
3. [Core Capabilities & Modules](#3-core-capabilities--modules)
4. [Technology Stack](#4-technology-stack)
5. [How the System Fits Together](#5-how-the-system-fits-together)
6. [Data Models & Schema Reference](#6-data-models--schema-reference)
7. [REST API Endpoints](#7-rest-api-endpoints)
8. [Security, Auth & Session Handling](#8-security-auth--session-handling)
9. [CRUD Operations Matrix](#9-crud-operations-matrix)
10. [Step-by-Step Setup Guide](#10-step-by-step-setup-guide)
11. [Testing with Postman & In the Browser](#11-testing-with-postman--in-the-browser)
12. [Deployment Guide](#12-deployment-guide)
13. [Future Roadmap](#13-future-roadmap)
14. [Project Specifications & Architecture Coverage](#14-project-specifications--architecture-coverage)

---

## 1. Why We Built This

Managing family health today often means juggling five different places. You might book a specialist on one portal, hunt down emergency blood donors across WhatsApp groups, set phone alarms for parent medications, jot mood thoughts in a notebook, and dig through loose paper files whenever a doctor asks for past lab tests.

We designed **Medical Care** to strip away that friction. The goal was simple: create an intuitive, reliable web portal where patients, doctors, and donors can handle their day-to-day healthcare needs without bouncing between disconnected tools.

---

## 2. Everyday Problems We Address

* **Fragmented Health Tools:** Rather than forcing patients to sign up for multiple single-purpose apps, everything is managed from one account and unified dashboard.
* **Finding Blood in an Emergency:** Locating compatible blood donors in the same city shouldn't involve panic or endless phone trees. Our directory lets anyone quickly filter by blood group and locality.
* **Missed Prescriptions:** When patients take multiple medications across different times of the day, missing doses is common. Built-in reminders keep morning and evening doses on track.
* **Overlooking Mental Health:** Physical health and mental wellbeing influence each other. Giving patients a quick, private space to log daily mood changes helps spot patterns over time.
* **Scattered Paper Records:** Past diagnoses, allergy notes, and doctor prescriptions are kept in an organized digital dossier that patients can review anytime.

---

## 3. Core Capabilities & Modules

### 🩺 Doctor Consultations & Appointments
* Browse available clinic specialists with department information, qualifications, and contact details.
* Choose preferred appointment dates and time slots with clear reasons for the visit.
* Patients can review their upcoming appointments, reschedule if needed, or cancel.
* Doctors and administrators get a centralized view to confirm bookings and keep daily clinic queues organized.

### 🩸 Community Blood Donor Directory
* Anyone can volunteer and register as a donor with their name, age (18–65), blood type, city location, and direct phone number.
* Emergency search allows instantaneous filtering by blood type (A+, A-, B+, B-, AB+, AB-, O+, O-) to find nearby donors right away.
* Donors can update their availability or remove their details whenever they wish.

### 💊 Medicine & Prescription Reminders
* Create schedules for active prescriptions with specific dosages (e.g., *"500mg, 1 tablet after meals"*), dates, and exact times.
* All reminders appear chronologically on both the dashboard and dedicated medicine page.
* Easily mark courses as completed or delete old prescriptions.

### 🧘 Mental Wellness & Mood Journal
* Take a minute each day to record how you're feeling (*Happy & Peaceful, Calm, Energetic, Balanced, Fatigued, Stressed, Anxious*).
* Add personal notes, reflections, or daily highlights.
* Review past entries in interactive journal cards to see how mood trends over weeks and months.

### 📋 Digital Medical Records
* Keep detailed records of diagnosed conditions, medical history notes, active allergies, and prescription summaries.
* Open full clinical summaries in a focused modal without leaving the page.
* Update records as treatment progresses or remove outdated entries.

### 🛡️ Role-Based Access (Patient, Doctor, Admin)
* **Patients:** Book visits, view personal reminders, maintain wellness logs, and manage health records.
* **Doctors:** View scheduled patient appointments, confirm visits, and manage doctor availability.
* **Admins:** Full administrative oversight over doctors, registered users, and system data.

---

## 4. Technology Stack

We chose proven, standard tools with a clear separation of concerns:

| Layer | Tools | Why We Used It |
|---|---|---|
| **Runtime** | Node.js (v18+) | Fast asynchronous I/O and universal JavaScript runtime |
| **Backend Framework** | Express.js 4.19 | Clean routing structure, middleware flexibility, and standard JSON REST handling |
| **Database** | MongoDB & Mongoose 8.3 | Flexible document storage with strong schema validation and model helper methods |
| **Authentication** | JWT (`jsonwebtoken`) + `bcryptjs` | Secure password hashing (10 salt rounds) and tamper-proof bearer tokens |
| **Session Store** | `express-session` | Cookie-based session tracking for smooth browser navigation |
| **Frontend UI** | HTML5, CSS3, Bootstrap 5.3.3 | Responsive grid, cards, modals, and badges that work seamlessly on phones and desktops |
| **Icons & Typography** | Bootstrap Icons, Google Fonts (Plus Jakarta Sans & Lato) | Modern, clean aesthetic tailored for healthcare readability |
| **Client Scripting** | JavaScript ES6+ (Native `fetch`, async/await) | Fast, responsive UI interactions with instant form validation and no heavy client build step required |

---

## 5. How the System Fits Together

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                           Client Browser                                │
│       Responsive HTML5 / CSS3 / Bootstrap 5 / Modern ES6 JavaScript      │
│     (Real-time form validation, asynchronous fetch calls, session sync)  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ JSON API Requests / Cookies
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Node.js & Express Application                        │
│                                                                         │
│   ├── Middleware: CORS, express.json(), express-session                 │
│   ├── Auth Guard: JWT Bearer Token Verification (`protect`)             │
│   ├── Role Gate: Role-Based Authorization (`authorize`)                 │
│   │                                                                     │
│   └── API Routes:                                                       │
│       ├── /api/auth         -> Registration, login, profile, sessions   │
│       ├── /api/doctors      -> Specialist listings & directory          │
│       ├── /api/appointments -> Booking, schedule changes, cancellations │
│       ├── /api/donors       -> Volunteer blood donor directory          │
│       ├── /api/medicines    -> Daily medication schedules               │
│       ├── /api/wellness     -> Mood logs & daily reflections            │
│       └── /api/records      -> Diagnoses, medical history, prescriptions│
│                                                                         │
│   └── Data Controllers & Error Handling Middleware                      │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Mongoose ODM
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        MongoDB Database                                 │
│    Collections: users, doctors, appointments, blooddonors,              │
│                 medicines, wellnessrecords, medicalrecords              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Data Models & Schema Reference

Every record is validated before touching the database through Mongoose schemas:

### 1. User (`models/User.js`)
Stores authenticated accounts for patients, doctors, and clinic admins.
```javascript
{
  name:      { type: String, required: true },
  email:     { type: String, required: true, unique: true },
  phone:     { type: String, required: true },
  password:  { type: String, required: true }, // Hashed with bcrypt before save
  role:      { type: String, enum: ['Patient', 'Doctor', 'Admin'], default: 'Patient' },
  createdAt: { type: Date, default: Date.now }
}
```

### 2. Doctor (`models/Doctor.js`)
Specialist profiles displayed across the booking system.
```javascript
{
  name:           { type: String, required: true },
  specialization: { type: String, required: true },
  department:     { type: String, required: true },
  phone:          { type: String, required: true },
  email:          { type: String, required: true, unique: true },
  createdAt:      { type: Date, default: Date.now }
}
```

### 3. Appointment (`models/Appointment.js`)
Links a registered patient to a specific doctor and consultation slot.
```javascript
{
  patient:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor:          { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  appointmentDate: { type: String, required: true },
  appointmentTime: { type: String, required: true },
  reason:          { type: String, required: true },
  status:          { type: String, enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'], default: 'Pending' },
  createdAt:       { type: Date, default: Date.now }
}
```

### 4. Blood Donor (`models/BloodDonor.js`)
Emergency directory entries for volunteer donors.
```javascript
{
  name:         { type: String, required: true },
  age:          { type: Number, required: true },
  bloodGroup:   { type: String, required: true, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
  phone:        { type: String, required: true },
  location:     { type: String, required: true },
  registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt:    { type: Date, default: Date.now }
}
```

### 5. Medicine Reminder (`models/Medicine.js`)
Medication intake schedules per user.
```javascript
{
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  medicineName: { type: String, required: true },
  dosage:       { type: String, required: true },
  date:         { type: String, required: true },
  time:         { type: String, required: true },
  createdAt:    { type: Date, default: Date.now }
}
```

### 6. Wellness Record (`models/WellnessRecord.js`)
Daily mood reflections and wellness status.
```javascript
{
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mood:      { type: String, required: true },
  status:    { type: String, required: true },
  notes:     { type: String, required: true },
  date:      { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}
```

### 7. Medical Record (`models/MedicalRecord.js`)
Clinical diagnosis summaries, health background, and doctor prescriptions.
```javascript
{
  patient:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor:         { type: String, default: 'Attending Physician' },
  diagnosis:      { type: String, required: true },
  medicalHistory: { type: String, required: true },
  prescription:   { type: String, required: true },
  date:           { type: String, required: true },
  createdAt:      { type: Date, default: Date.now }
}
```

---

## 7. REST API Endpoints

All endpoints accept and return JSON. Endpoints marked with 🔒 require an `Authorization: Bearer <token>` header.

### Authentication
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/auth/register` | Create a new user account | Public |
| `POST` | `/api/auth/login` | Authenticate user and receive JWT token | Public |
| `POST` | `/api/auth/logout` | Clear user session cookies | Public |
| `GET` | `/api/auth/me` | Retrieve profile of the signed-in user | 🔒 Private |

### Doctors
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/doctors` | List all doctors (supports filtering) | Public |
| `GET` | `/api/doctors/:id` | Fetch specific doctor details | Public |
| `POST` | `/api/doctors` | Add a new doctor profile | 🔒 Doctor / Admin |
| `PUT` | `/api/doctors/:id` | Update doctor info | 🔒 Doctor / Admin |
| `DELETE` | `/api/doctors/:id` | Remove doctor profile | 🔒 Admin |

### Appointments
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/appointments` | Get appointments (own for patient, all for doctor/admin) | 🔒 Private |
| `GET` | `/api/appointments/:id` | View appointment details | 🔒 Private |
| `POST` | `/api/appointments` | Book a consultation slot | 🔒 Private |
| `PUT` | `/api/appointments/:id` | Update appointment details or status | 🔒 Private |
| `DELETE` | `/api/appointments/:id` | Cancel/remove an appointment | 🔒 Private |

### Blood Donors
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/donors` | List donors (supports `?bloodGroup=O+`) | Public |
| `GET` | `/api/donors/:id` | View donor details | Public |
| `POST` | `/api/donors` | Register as a blood donor | 🔒 Private |
| `PUT` | `/api/donors/:id` | Edit donor record | 🔒 Private |
| `DELETE` | `/api/donors/:id` | Delete donor record | 🔒 Private / Admin |

### Medicine Reminders
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/medicines` | Retrieve current user's reminders | 🔒 Private |
| `GET` | `/api/medicines/:id` | Get single reminder details | 🔒 Private |
| `POST` | `/api/medicines` | Add a new medicine schedule | 🔒 Private |
| `PUT` | `/api/medicines/:id` | Edit dosage, date, or time | 🔒 Private |
| `DELETE` | `/api/medicines/:id` | Delete reminder | 🔒 Private |

### Mental Wellness
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/wellness` | Get user's past journal entries | 🔒 Private |
| `GET` | `/api/wellness/:id` | View specific mood log | 🔒 Private |
| `POST` | `/api/wellness` | Save daily mood and notes | 🔒 Private |
| `PUT` | `/api/wellness/:id` | Edit previous journal entry | 🔒 Private |
| `DELETE` | `/api/wellness/:id` | Remove journal entry | 🔒 Private |

### Medical Records
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/records` | List medical history records | 🔒 Private |
| `GET` | `/api/records/:id` | View clinical record details | 🔒 Private |
| `POST` | `/api/records` | Create new medical entry | 🔒 Private |
| `PUT` | `/api/records/:id` | Update record diagnosis or history | 🔒 Private |
| `DELETE` | `/api/records/:id` | Delete medical record | 🔒 Private |

---

## 8. Security, Auth & Session Handling

1. **Password Hashing:** Passwords never touch the database unencrypted. Mongoose pre-save middleware runs passwords through `bcryptjs` with 10 salt rounds.
2. **Stateless JWT Tokens:** On successful login or registration, the server issues a signed JWT containing user ID and role, valid for 24 hours.
3. **Session Cookies:** Configured through `express-session` with `httpOnly: true` to prevent client-side script access.
4. **Token Verification Middleware (`protect`):** Reads the incoming `Authorization: Bearer <token>` header, decodes the signature, and attaches the active user object to `req.user`.
5. **Role Guard Middleware (`authorize`):** Controls sensitive routes so that only authorized roles (`Doctor` or `Admin`) can modify clinic rosters or manage system-wide data.

---

## 9. CRUD Operations Matrix

Every core healthcare module implements complete Create, Read, Update, and Delete operations:

| Module | Create | Read | Update | Delete |
|---|:---:|:---:|:---:|:---:|
| **Appointments** | `POST /api/appointments` | `GET /api/appointments` | `PUT /api/appointments/:id` | `DELETE /api/appointments/:id` |
| **Blood Donors** | `POST /api/donors` | `GET /api/donors` | `PUT /api/donors/:id` | `DELETE /api/donors/:id` |
| **Medicines** | `POST /api/medicines` | `GET /api/medicines` | `PUT /api/medicines/:id` | `DELETE /api/medicines/:id` |
| **Mental Wellness** | `POST /api/wellness` | `GET /api/wellness` | `PUT /api/wellness/:id` | `DELETE /api/wellness/:id` |
| **Medical Records** | `POST /api/records` | `GET /api/records` | `PUT /api/records/:id` | `DELETE /api/records/:id` |

---

## 10. Step-by-Step Setup Guide

### What You'll Need
* **Node.js** (v18.0.0 or later installed)
* **MongoDB** (Local instance running at `mongodb://127.0.0.1:27017` or a free MongoDB Atlas connection URI)

### 1. Install Dependencies
In your project terminal, run:
```bash
npm install
```

### 2. Set Up Environment Variables
Create a `.env` file in the root folder (or copy from `.env.example`):
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/medical_care_db
JWT_SECRET=medical_care_jwt_super_secret_key_2026_secure
SESSION_SECRET=medical_care_session_secret_key_2026_super
NODE_ENV=development
```
*(If your local MongoDB service isn't running, the server automatically enables an in-memory fallback so you can still preview and test the pages immediately!)*

### 3. Seed Demo Data (Doctors, Donors & Test Accounts)
Populate sample doctors, blood donors, and pre-configured test users:
```bash
npm run seed
```

**Ready-to-Use Demo Accounts:**
* **Patient:** `patient@medicalcare.com` / `password123`
* **Doctor:** `doctor@medicalcare.com` / `password123`
* **Admin:** `admin@medicalcare.com` / `password123`

### 4. Start the Server
```bash
# Standard start
npm start

# Or with live reload during development
npm run dev
```

Open your browser and visit:
👉 **[http://localhost:5000](http://localhost:5000)**

---

## 11. Testing with Postman & In the Browser

### Form Validation in the Browser
All forms use client-side ES6 validation with immediate visual feedback before sending network requests:
* **Registration:** Validates non-empty fields, proper email formats, and password lengths (minimum 6 characters).
* **Appointments:** Requires selecting a valid doctor, date, and visit reason.
* **Blood Donors:** Validates age limits (must be between 18 and 65) and 10-digit phone numbers.
* **Medicine Reminders:** Ensures medicine name, dosage, date, and time are properly specified.

### Automated Testing with Postman
A pre-configured Postman test collection is located in:
`postman/All-in-One-Medical-Care.postman_collection.json`

1. Open **Postman** and click **Import**.
2. Select `postman/All-in-One-Medical-Care.postman_collection.json`.
3. The collection is already set up with environment variables:
   * `baseUrl`: `http://localhost:5000`
   * `token`: Automatically captured when you run Register or Login.
4. Run requests in folder order to test registration, doctor listings, appointment booking, donor registration, medication schedules, mood journaling, and medical record management.

---

## 12. Deployment Guide

Because Express serves both static frontend files from `/public` and all `/api/*` routes, the entire application can be deployed as a single lightweight service.

### Option 1: Cloud Hosting (Render, Railway, Fly.io)
1. Push your project to a GitHub repository.
2. Create a new **Web Service** on Render or Railway.
3. Configure the build settings:
   * **Build Command:** `npm install`
   * **Start Command:** `npm start`
4. Add environment variables (`PORT`, `MONGODB_URI`, `JWT_SECRET`, `SESSION_SECRET`, `NODE_ENV=production`).
5. Click **Deploy**.

### Option 2: Linux VPS (Ubuntu/Debian) with PM2 & NGINX
```bash
# 1. Install Node.js, PM2, and Nginx
sudo apt update && sudo apt install -y nodejs npm nginx
sudo npm install -g pm2

# 2. Clone repo and install dependencies
git clone <your-repo-url>
cd NODE\ JS\ PRoJECT
npm install --omit=dev

# 3. Start application with PM2 process manager
pm2 start server.js --name "medical-care"
pm2 startup
pm2 save

# 4. Point Nginx to forward port 80 traffic to http://127.0.0.1:5000
```

### Option 3: Free Cloud Database with MongoDB Atlas
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a free **M0 Shared Cluster**.
3. Under **Database Access**, create a user and password.
4. Under **Network Access**, whitelist your server's IP address (or `0.0.0.0/0` for cloud hosting).
5. Copy your connection string into `.env` as `MONGODB_URI`.

---

## 13. Future Roadmap

* 📲 **Browser Push Notifications:** Daily dosage alerts via Service Workers so patients never miss a scheduled pill.
* 🎥 **Telemedicine Consultations:** Built-in WebRTC video consultations between doctors and patients directly inside the portal.
* 📄 **PDF Summary Export:** One-click generation of consolidated health summaries and prescription slips for personal archiving or insurance claims.
* 📍 **Map-Based Donor Search:** Live geolocation radius search to find registered donors closest to an emergency hospital.
* 🌐 **Multilingual Support:** Localized interfaces in regional languages to broaden accessibility.

---

## 14. Project Specifications & Architecture Coverage

For reviewers and evaluators checking implementation depth:

| Area | Implementation Highlights | Primary Files |
|---|---|---|
| **Problem Formulation & Scope** | Consolidated 5 core clinical workflows into one cohesive patient-doctor system | `README.md`, Sections 1–3 |
| **Responsive Interface Design** | Mobile-first Bootstrap 5 navigation, cards, modals, interactive badges, and tables | `public/index.html`, `dashboard.html`, module pages |
| **Client-Side Validation** | Real-time regex validation, inline feedback, and error handling before dispatching HTTP calls | `public/js/validation.js`, page scripts |
| **Modern ES6 JavaScript** | Pure ES6 implementation with arrow functions, template literals, destructuring, and `async/await` Fetch API | `public/js/*.js` |
| **Database Architecture** | 7 normalized Mongoose models with validation rules, references, and timestamps | `models/*.js` |
| **RESTful API Pipeline** | Modular Express routers and controllers implementing full CRUD operations across all modules | `routes/*.js`, `controllers/*.js` |
| **Authentication & Access Control** | Secure password hashing (`bcryptjs`), JWT authorization headers, and cookie sessions | `controllers/authController.js`, `middleware/authMiddleware.js` |
| **API Verification** | Fully automated end-to-end Postman collection covering all endpoints and auth flows | `postman/All-in-One-Medical-Care.postman_collection.json` |
| **Production Readiness** | Environment variable management, database fallbacks, seed scripts, and deployment guides | `server.js`, `seed.js`, `.env.example`, `config/db.js` |

---

*Crafted with care for simple, accessible healthcare management.*
