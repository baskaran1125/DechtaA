# DECHTA - Construction Trade Hub

DECHTA is a modern marketplace platform built for the construction trade, connecting premium construction material vendors with buyers instantly. The unified stack includes an Express+Drizzle backend on PostgreSQL and a Vite+React frontend using TailwindCSS and Shadcn UI.

## Architecture

The project has been architected into three isolated, independently runnable environments:
- **Frontend** (`/frontend`): The main Vite + React marketplace application for buyers and vendors. Runs on port `5173`.
- **Ops Portal** (`/ops`): A standalone Vite + React administrative dashboard for managing the master catalog and viewing metrics. Runs on port `5174`.
- **Backend** (`/backend`): A Node.js Express API using Drizzle ORM connected to PostgreSQL serving both frontends. Runs on port `5000`.

## Prerequisites

- Node.js (v20+)
- PostgreSQL (Active connection URL required)

## Getting Started

### 1. Environment Setup

Inside the `backend/` directory, create a `.env` file containing your database connection string and session secret:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/dechta
SESSION_SECRET=your_super_secret_session_key
PORT=5000
```

### 2. Dependency Installation

Because the application uses an isolated workspace strategy, you must install dependencies in all project directories:

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Install ops portal dependencies
cd ../ops
npm install
```

### 3. Database Initialization

With your PostgreSQL database running and configured in the backend `.env` file, push the schema to the database. For local development, there is also a seed script provided to populate test users and product data.

```bash
# From the root directory:
npm run db:push --prefix backend
npm run db:seed --prefix backend
```

> The seed script automatically generates a vendor (`vendor@example.com`), a buyer (`buyer@example.com`), and an Ops Administrator (`admin@example.com`), all with the password `password123`.

### 4. Running the Development Servers

The backend, frontend, and ops portal run on entirely separate development servers. You must launch them simultaneously to use the application fully in development.

In separate terminals, run:

```bash
# Terminal 1: Start the Backend API Server
npm run dev --prefix backend

# Terminal 2: Start the Buyer/Vendor Marketplace
npm run dev --prefix frontend

# Terminal 3: Start the Ops Admin Portal
npm run dev --prefix ops
```

Alternatively, you can run them in a single terminal concurrently:

```bash
npm run dev --prefix backend & npm run dev --prefix frontend & npm run dev --prefix ops
```

Once running, navigate to [http://localhost:5173](http://localhost:5173) for the Marketplace or [http://localhost:5174](http://localhost:5174) for Ops.

**Ops Login Credentials**:
- **Username**: `admin@example.com`
- **Password**: `password123`

## Production Build

To prepare the application for production, you must build both directories separately. The frontend transpiles into static assets, which the backend will serve in production environments.

```bash
# 1. Build the production backend
npm run build --prefix backend

# 2. Build the production frontend UI
npm run build --prefix frontend

# 3. Start the production server
npm run start --prefix backend
```
