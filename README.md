# Employee Task Management System

A web-based employee and task management application built with React, TypeScript, Vite, Firebase Authentication, Cloud Firestore, and Firebase Cloud Functions. The system provides role-based access for administrators, managers, and employees to manage employee profiles, assign tasks, track progress, and monitor task completion.

## Table of Contents

- [Features](#features)
- [User Roles](#user-roles)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Running Firebase Emulators](#running-firebase-emulators)
- [API Documentation](#api-documentation)
- [Available Scripts](#available-scripts)
- [Build and Production](#build-and-production)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

## Features

- **Authentication:** User registration, login, and password recovery.
- **Role-based access control:** Different permissions for administrators, managers, and employees.
- **Employee management:** View and update employee profiles, with access controlled by role and department.
- **Task management:** Create, view, edit, assign, and delete tasks.
- **Task status tracking:** Update task progress and monitor completed tasks.
- **Department-based access:** Managers can access permitted employees and tasks within their department.
- **Task assignment:** Assign tasks to eligible employees and manage due dates.
- **Dashboard:** View employee and task statistics, recent tasks, and employee activity.
- **REST API:** Access protected backend endpoints through Firebase Cloud Functions.
- **Local development:** Run Authentication, Firestore, and Cloud Functions using Firebase Emulator Suite.

## User Roles

| Role | Permissions |
|---|---|
| Administrator | Manage employees and tasks across the organization, subject to configured permissions. |
| Manager | Manage and monitor employees and tasks within the manager's authorized department. |
| Employee | Access permitted employee information and tasks assigned to them. |

All protected API requests require a valid Firebase Authentication ID token. Backend authorization checks determine which resources the authenticated user can access.

## Technology Stack

### Frontend
- React
- TypeScript
- Vite
- Firebase Web SDK
- CSS

### Backend
- Firebase Cloud Functions
- Node.js
- TypeScript
- Express.js
- Firebase Admin SDK

### Database and Authentication
- Cloud Firestore
- Firebase Authentication

### Development and Testing
- Firebase Emulator Suite
- npm
- Apidog for API testing
- Git and GitHub

## System Architecture

```text
                 User
                  |
                  v
       React + TypeScript Frontend
                  |
                  v
          Firebase Authentication
                  |
            Firebase ID Token
                  |
                  v
        Cloud Functions REST API
                  |
          Token Verification
                  |
         Role-Based Authorization
                  |
          +-------+--------+
          |                |
          v                v
   Cloud Firestore    API Responses
   Users, Employees,
   and Tasks
```

During local development, the application connects to the Firebase Emulator Suite instead of production Firebase services.

## Prerequisites

Install the following tools before running the project:

- [Node.js](https://nodejs.org/) — use a version supported by your Firebase Functions dependencies.
- npm — included with Node.js.
- [Git](https://git-scm.com/)
- [Firebase CLI](https://firebase.google.com/docs/cli)
- [Apidog](https://apidog.com/) or another API testing client (optional).

Verify the installations:

```bash
node --version
npm --version
firebase --version
git --version
```

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/employee-task-management.git
cd employee-task-management
```

Replace `YOUR_USERNAME` with the GitHub account that owns the repository.

### 2. Install frontend dependencies

From the project root:

```bash
npm install
```

### 3. Install backend dependencies

```bash
cd functions
npm install
npm run build
cd ..
```

### 4. Configure Firebase

Ensure the repository includes the required Firebase configuration files, such as:

- `firebase.json`
- `.firebaserc`
- `firestore.rules`
- `firestore.indexes.json`

The Firebase project used during development is `employee-task-management-e6c90`.

Review `.firebaserc` and `firebase.json` to confirm the correct project and emulator configuration. Do not commit service-account private keys or production secrets.

### 5. Start the frontend

In the project root:

```bash
npm run dev
```

Open the local development URL shown in the terminal, normally:

http://localhost:5173/

## Running Firebase Emulators

Start Authentication, Firestore, and Cloud Functions from the project root:

```bash
firebase emulators:start --only auth,firestore,functions
```

The local services should be available at:

| Service | Local URL |
|---|---|
| Frontend | http://localhost:5173/ |
| Emulator UI | http://127.0.0.1:4000/ |
| Authentication Emulator | http://127.0.0.1:9099/ |
| Firestore Emulator | http://127.0.0.1:8080/ |
| Cloud Functions API | http://127.0.0.1:5001/employee-task-management-e6c90/us-central1/api |

The emulator URLs above reflect the default configuration used during development. Check the terminal output if you have changed any ports.

**Important:** Configure the frontend Firebase SDK to connect to the Authentication and Firestore emulators during local development. Ensure the Cloud Functions emulator uses the intended local services rather than production services.

Create test users and their corresponding Firestore profiles in the emulator before testing protected endpoints.

## API Documentation

The backend exposes a REST API through Firebase Cloud Functions.

### Base URL

Local development:

```text
http://127.0.0.1:5001/employee-task-management-e6c90/us-central1/api
```

### Available Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Check API health. |
| GET | `/me` | Retrieve the authenticated user's profile. |
| GET | `/employees` | Retrieve employees permitted for the current user. |
| GET | `/tasks` | List tasks available to the current user. |
| POST | `/tasks` | Create a task. |
| GET | `/tasks/:id` | Retrieve an individual task. |
| PATCH | `/tasks/:id` | Update task information. |
| PATCH | `/tasks/:id/status` | Update task status. |
| PATCH | `/tasks/:id/assign` | Assign or reassign a task. |
| DELETE | `/tasks/:id` | Delete a task, subject to authorization. |

### Authentication

Protected endpoints require a Firebase Authentication ID token.

Add the following HTTP header to authenticated requests:

```http
Authorization: Bearer YOUR_FIREBASE_ID_TOKEN
```

For JSON request bodies, use:

```http
Content-Type: application/json
```

Obtain an ID token by signing in through the application or the configured Authentication Emulator.

### Example: Get the Current User

Request:

```http
GET /me
Authorization: Bearer YOUR_FIREBASE_ID_TOKEN
```

Example response:

```json
{
  "uid": "example-user-id",
  "name": "Super Admin",
  "email": "admin@example.com",
  "role": "admin",
  "department": "HR"
}
```

The response values depend on the authenticated user's profile.

### Example: Create a Task

Example request body:

```json
{
  "title": "Prepare monthly report",
  "description": "Prepare the department's monthly performance report.",
  "department": "HR",
  "assignedTo": "employee-user-id",
  "dueDate": "2026-11-01"
}
```

Use the fields and status values accepted by the current backend implementation. The example is illustrative; required fields and validation rules are enforced by the API.

## Available Scripts

### Frontend — project root

| Command | Description |
|---|---|
| `npm install` | Install frontend dependencies. |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Type-check and build the frontend for production. |
| `npm run preview` | Preview the production build locally, if configured. |

### Backend — `functions/`

| Command | Description |
|---|---|
| `npm install` | Install backend dependencies. |
| `npm run build` | Compile TypeScript functions. |
| `npm run serve` | Start the emulators if the script is configured for this purpose. |

Run backend commands from the `functions` directory and frontend commands from the project root.

## Build and Production

Build the frontend:

```bash
npm run build
```

The production-ready frontend files are generated in the `dist/` directory.

Compile the backend:

```bash
cd functions
npm run build
```

Both commands completed successfully in the development environment. The frontend build reported a bundle-size warning because a JavaScript chunk exceeded 500 kB after minification. This warning does not prevent the build from succeeding.

Before deployment, verify environment configuration, Firebase security rules, authorization behavior, and production credentials.

Deploy Cloud Functions only when you intentionally want to publish backend changes:

```bash
firebase deploy --only functions
```

Deploying functions targets the Firebase project selected by the Firebase CLI. Confirm the target project before deployment.

## Security

- Verify Firebase ID tokens on protected API routes.
- Enforce role-based authorization on the backend rather than relying exclusively on frontend route protection.
- Restrict managers and employees to resources permitted by their roles and departments.
- Use Firestore Security Rules to protect direct client access to database documents.
- Never commit `.env` files, service-account keys, private keys, or other credentials.
- Use test accounts and emulators for local development.
- Review dependency security warnings and update packages carefully before production deployment.

## Troubleshooting

### Firebase Emulator connection problems

Confirm that the emulators are running and that the frontend and backend use the configured emulator hosts and ports.

### Unauthorized API request

Check that the request includes a valid Firebase ID token and that the user's Firestore profile exists with a supported role.

### Firestore permission errors

Review the Firestore Security Rules, authenticated user's profile, role, department, and requested operation.

### TypeScript or build errors

Run the relevant build command from the correct directory:

```bash
npm run build
```

For backend errors:

```bash
cd functions
npm run build
```

### Dependency warnings

Run `npm audit` in the project root or the `functions` directory to inspect reported vulnerabilities. Review the impact of each proposed update before using commands that could introduce breaking changes.

---

## License

Add a license to this project if you intend to distribute or reuse it publicly. Until a license is added, do not assume that others have permission to reuse the code.
