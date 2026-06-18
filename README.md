# Atlas — Multi-Vendor Marketplace

A full-stack marketplace platform built by a team of four, where multiple vendors can list products and buyers can browse, cart, and order — with strict per-vendor data isolation and role-based access control throughout.

---

## Features

- **Three-role RBAC** — `admin`, `vendeur`, `acheteur` with route-level and API-level enforcement
- **Per-vendor data isolation** — vendors only access their own products, orders, and stats; enforced at the API layer, not just the UI
- **Authentication** — session-based auth via Better Auth with protected routes
- **Product management** — vendors can create, edit, and delete their listings
- **Cart & orders** — buyers can add to cart, place orders, and track order status
- **Admin dashboard** — full visibility over users, vendors, and orders
- **Edge case coverage** — unauthorized access attempts, empty states, concurrent actions

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router), React, Tailwind CSS |
| Backend | Node.js, Express |
| Database | PostgreSQL (Supabase) |
| Auth | Better Auth |
| Deployment | Vercel (frontend), Render (backend) |
| Version control | Git, GitHub |

---

## Architecture

```
atlas/
├── frontend/          # Next.js app — pages, components, API calls
└── backend/           # Express REST API — routes, controllers, middleware
```

Authentication middleware runs on every protected route. RBAC is enforced at the controller level — role checks happen server-side on each request, not client-side only.

Supabase handles the PostgreSQL instance; the backend connects via the Supabase JS client with row-level policies as a secondary guard.

---

## My Contributions

This project was built in a team of four. I was responsible for:

- Designing and implementing the **RBAC system** (role assignment, middleware, protected endpoints)
- **Per-vendor API-level data isolation** — ensuring no vendor can read or modify another's data regardless of client-side state
- **Edge case testing** — writing and running test scenarios for unauthorized access, malformed requests, and boundary conditions
- Database schema contributions — relationships between users, vendors, products, orders

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project (PostgreSQL)

### Installation

```bash
# Clone the repo
git clone https://github.com/imenett/atlas.git
cd atlas

# Install dependencies
cd frontend && npm install
cd ../backend && npm install
```

### Environment variables

Create `.env` files in both `frontend/` and `backend/`. See `.env.example` in each folder for required keys (Supabase URL, anon key, session secret, etc.).

### Run locally

```bash
# Backend
cd backend && npm run dev

# Frontend (separate terminal)
cd frontend && npm run dev
```

Frontend runs on `http://localhost:3000`, backend on `http://localhost:5000` by default.

---

## Live Demo

| | |
|---|---|
| Frontend | [atlas-frontend.vercel.app](https://atlas-frontend.vercel.app) |
| Backend | [atlas-backend.onrender.com](https://atlas-backend.onrender.com) |

> Free-tier Render instances spin down after inactivity — first request may take ~30s.

---

## Team

Built as a final-year L3 Informatique project at Université Paris Cité.
