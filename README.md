# Flowbox API Server

Flowbox API is a robust, modular, and secure backend server built with Express.js, TypeScript, and Prisma ORM, referencing the production-level structure and error-handling mechanisms of `DozoServerNodeV2`.

## ✨ Key Features

- **Standardized Error Handling:** Global error middleware parsing all standard Node and database errors, automatically resolving status codes using semantic message keyword matching.
- **Pino Loggers:** High-speed structured logging with pretty printing enabled for development debugging.
- **Authentication Routes:** Fully implemented credentials-based authorization (`/signup`, `/login`, `/logout`) utilizing password hashing (`bcryptjs`) and secure session tracking via HTTP-Only JWT cookies.
- **Prisma PostgreSQL Connection:** Type-safe database connection singleton instance using Prisma ORM.
- **Request Parameter Validation:** Middleware to safeguard endpoints by validating request payloads.

## 🛠️ Tech Stack

- **Runtime:** Node.js (TypeScript)
- **Framework:** Express.js
- **Database ORM:** Prisma
- **Database Engine:** PostgreSQL
- **Security:** Helmet, BCryptJS, JSON Web Tokens (JWT), CORS

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- A running PostgreSQL database instance

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ChetanSingh14/clothing-backend.git
   cd clothing-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory:
   ```env
   PORT=4000
   NODE_ENV=development
   DATABASE_URL="postgresql://<username>:<password>@localhost:5432/<dbname>?schema=public"
   JWT_SECRET="your_secure_jwt_secret"
   ALLOWED_ORIGINS="http://localhost:3000"
   ```

4. Run Prisma migrations:
   ```bash
   npm run prisma:migrate
   ```

5. Launch the server in development mode:
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```text
src/
├── app/
│   └── auth/           # Routes, controller, and database services for login & signup
├── common/
│   ├── config/         # Prisma connection and logger transport setups
│   ├── middlewares/    # Session authentication and global error handlers
│   └── utils/          # Logger wrappers and async exception controllers
└── models/
    └── prisma/         # PostgreSQL database schemas
```
