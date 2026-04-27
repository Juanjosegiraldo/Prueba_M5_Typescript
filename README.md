# 🏠 CasaHub — Real Estate Listing Platform

A full-stack web application for managing real estate property listings, built with **Next.js 16**, **Prisma 7**, **PostgreSQL (Supabase)** and **JWT authentication** with role-based access control.

---

## 📋 Table of Contents

- [Project Description](#project-description)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Project](#running-the-project)
- [API Endpoints](#api-endpoints)
- [Role & Permission Matrix](#role--permission-matrix)
- [JWT Flow](#jwt-flow)
- [ER Diagram](#er-diagram)
- [Test Credentials](#test-credentials)
- [Example Requests](#example-requests)

---

## Project Description

CasaHub allows real estate agents and administrators to publish, manage and explore property listings. It implements strict TypeScript typing, DTO validation, JWT refresh token rotation and image upload with format/size validation.

**Module assigned:** Houses (Casas) — CRUD with image upload.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| ORM | Prisma 7 |
| Database | PostgreSQL (Supabase) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Styling | Tailwind CSS 4 |
| Notifications | Sonner |
| Linting | ESLint |

---

## Architecture

```
src/
├── app/
│   ├── (auth)/                 ← Auth route group (own layout)
│   │   ├── layout.tsx          ← Auth layout with gradient background
│   │   ├── login/              ← Sign in page + metadata
│   │   └── register/           ← Register page + metadata
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/          ← POST — returns JWT cookies
│   │   │   ├── logout/         ← POST — invalidates refresh token
│   │   │   ├── me/             ← GET  — returns current user
│   │   │   ├── refresh/        ← POST — rotates access token
│   │   │   └── register/       ← POST — creates AGENT account
│   │   ├── casas/
│   │   │   ├── route.ts        ← GET (paginated) + POST
│   │   │   └── [id]/route.ts   ← GET + PUT + DELETE
│   │   └── upload/route.ts     ← POST — image upload
│   ├── dashboard/
│   │   ├── layout.tsx          ← Dashboard layout + metadata
│   │   └── page.tsx            ← Main CRUD interface
│   └── layout.tsx              ← Root layout (AuthProvider + Toaster)
├── context/
│   └── AuthContext.tsx         ← Global auth state
├── lib/
│   ├── api.ts                  ← fetchWithRefresh helper
│   ├── auth.ts                 ← getAuthUser(), isAdmin(), canModify()
│   ├── prisma.ts               ← PrismaClient singleton (pg adapter)
│   ├── response.ts             ← successResponse(), errorResponse()
│   └── validation.ts           ← validateCreateCasa(), validateUpdateCasa(), validateImageFile()
└── types/
    ├── auth.types.ts           ← AuthUser, LoginDto, RegisterDto, JwtPayload
    └── casa.types.ts           ← Casa, CreateCasaDto, UpdateCasaDto, CasaResponseDto, UploadResponseDto
```

---

## Prerequisites

- Node.js v18+
- npm v9+
- PostgreSQL database (Supabase recommended)

---

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/casahub.git
cd casahub

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your values (see section below)

# 4. Generate Prisma client
npx prisma generate

# 5. Push schema to database
npx prisma db push

# 6. Load seed data (creates admin + agent + 3 sample houses)
npm run db:seed
```

---

## Environment Variables

Create a `.env` file at the root with:

```env
# PostgreSQL connection string (Supabase)
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"

# JWT secret — use a long random string in production
JWT_SECRET="your_super_secret_key_change_in_production"

# Node environment
NODE_ENV="development"

NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT_REF].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="tu_service_role_key"
```

---

## Running the Project

```bash
# Development
npm run dev

# Production build
npm run build
npm run start

# Lint
npm run lint

# Seed database
npm run db:seed
```

Server runs at: `http://localhost:3000`

---

## API Endpoints

### Standard Response Format

All endpoints return a consistent JSON structure:

```json
// Success
{ "success": true, "data": {}, "message": "Operation successful" }

// Error
{ "success": false, "error": "Error description", "statusCode": 400 }

// Validation error
{ "success": false, "error": "Validation failed", "statusCode": 422, "errors": [{ "field": "titulo", "message": "..." }] }
```

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | Public | Create AGENT account |
| POST | `/api/auth/login` | Public | Sign in, returns JWT cookies |
| POST | `/api/auth/logout` | Public | Invalidates refresh token |
| GET | `/api/auth/me` | 🔒 Auth | Returns current user |
| POST | `/api/auth/refresh` | Public | Generates new access token |

### Houses (Casas)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/casas` | 🔒 Auth | List houses with pagination & search |
| POST | `/api/casas` | 🔒 Auth | Create a new house |
| GET | `/api/casas/:id` | 🔒 Auth | Get a specific house |
| PUT | `/api/casas/:id` | 🔒 Owner or ADMIN | Update a house |
| DELETE | `/api/casas/:id` | 🔒 Owner or ADMIN | Delete a house |

**GET /api/casas query parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 9 | Items per page (max 50) |
| `search` | string | — | Search in title and description |
| `sort` | string | createdAt | Sort field: `createdAt`, `precio`, `titulo` |
| `order` | string | desc | Sort direction: `asc` or `desc` |

### Upload

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/upload` | 🔒 Auth | Upload property image (JPG/PNG/WEBP, max 5MB) |

---

## Role & Permission Matrix

| Action | ADMIN | AGENT (own) | AGENT (others) |
|--------|-------|-------------|----------------|
| View houses | ✅ | ✅ | ✅ |
| Create house | ✅ | ✅ | ✅ |
| Edit house | ✅ | ✅ | ❌ 403 |
| Delete house | ✅ | ✅ | ❌ 403 |
| Upload image | ✅ | ✅ | ✅ |

---

## JWT Flow

```
Client                    Next.js API               PostgreSQL
  │                           │                          │
  │  POST /api/auth/login     │                          │
  │──────────────────────────>│                          │
  │  { email, password }      │  findUnique(email)       │
  │                           │─────────────────────────>│
  │                           │  user + hashedPassword   │
  │                           │<─────────────────────────│
  │                           │                          │
  │                           │  bcrypt.compare()        │
  │                           │  jwt.sign() → accessToken (15min)
  │                           │  uuid()    → refreshToken (7 days)
  │                           │  INSERT refreshToken     │
  │                           │─────────────────────────>│
  │  Cookie: auth_token       │                          │
  │  Cookie: refresh_token    │                          │
  │<──────────────────────────│                          │
  │                           │                          │
  │  GET /api/casas           │                          │
  │  Cookie: auth_token ─────>│                          │
  │                           │  jwt.verify(token)       │
  │                           │  → { id, email, role }   │
  │                           │  prisma.casa.findMany()  │
  │                           │─────────────────────────>│
  │  { success, data, ... }   │  casas[]                 │
  │<──────────────────────────│<─────────────────────────│
  │                           │                          │
  │  GET /api/casas           │                          │
  │  (expired token) ────────>│                          │
  │                           │  jwt.verify() → throws   │
  │  401 Unauthorized         │                          │
  │<──────────────────────────│                          │
  │                           │                          │
  │  POST /api/auth/refresh   │                          │
  │  Cookie: refresh_token ──>│                          │
  │                           │  findUnique(token)       │
  │                           │─────────────────────────>│
  │                           │  valid + not expired     │
  │                           │<─────────────────────────│
  │                           │  jwt.sign() → newAccessToken
  │  Cookie: auth_token (new) │                          │
  │<──────────────────────────│                          │
```

---

## ER Diagram

```
┌─────────────────────────┐         ┌─────────────────────────┐
│          User           │         │          Casa           │
├─────────────────────────┤         ├─────────────────────────┤
│ id        UUID (PK)     │◄────────│ id        UUID (PK)     │
│ name      String        │  1      │ titulo    String        │
│ email     String UNIQUE │    N    │ descripcion Text        │
│ password  String        │         │ precio    Float         │
│ role      ADMIN|AGENT   │         │ imagenUrl String?       │
│ createdAt DateTime      │         │ userId    UUID (FK)     │
│ updatedAt DateTime      │         │ createdAt DateTime      │
└─────────────────────────┘         │ updatedAt DateTime      │
           │                        └─────────────────────────┘
           │ 1
           │
           │ N
┌─────────────────────────┐
│      RefreshToken       │
├─────────────────────────┤
│ id        UUID (PK)     │
│ token     String UNIQUE │
│ userId    UUID (FK)     │
│ expiresAt DateTime      │
│ createdAt DateTime      │
└─────────────────────────┘
```

---

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| ADMIN | admin@casahub.com | admin123 |
| AGENT | agente@casahub.com | agent123 |

---

## Example Requests

### Register
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{ "name": "Juan Pérez", "email": "juan@email.com", "password": "secret123" }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{ "email": "admin@casahub.com", "password": "admin123" }'
```

### List houses (paginated)
```bash
curl http://localhost:3000/api/casas?page=1&limit=9&search=poblado \
  -b cookies.txt
```

### Create house
```bash
curl -X POST http://localhost:3000/api/casas \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "titulo": "Casa Moderna Laureles",
    "descripcion": "Hermosa casa de 3 pisos con acabados de lujo y garaje.",
    "precio": 650000000
  }'
```

### Upload image
```bash
curl -X POST http://localhost:3000/api/upload \
  -b cookies.txt \
  -F "file=@/path/to/image.jpg"
```

### Update house
```bash
curl -X PUT http://localhost:3000/api/casas/{id} \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{ "precio": 700000000 }'
```

### Delete house
```bash
curl -X DELETE http://localhost:3000/api/casas/{id} \
  -b cookies.txt
```
