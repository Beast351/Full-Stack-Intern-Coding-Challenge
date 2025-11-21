# Store Rating Platform - Setup Guide

## Project Structure
```
store-rating-platform/
├── backend/
│   ├── server.js
│   ├── package.json
│   └── .env
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   └── index.js
    ├── package.json
    └── index.html
```

## Backend Setup

### 1. Create Backend Directory
```bash
mkdir backend && cd backend
npm init -y
```

### 2. Install Dependencies
```bash
npm install express cors bcryptjs jsonwebtoken pg dotenv
npm install -D nodemon
```

### 3. package.json (Backend)
```json
{
  "name": "store-rating-backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.11.3",
    "dotenv": "^16.3.1"
  }
}
```

### 4. Create .env File
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=store_rating_db
JWT_SECRET=your-super-secret-jwt-key-change-this
PORT=5000
```

### 5. PostgreSQL Setup
```sql
-- Run in psql or pgAdmin
CREATE DATABASE store_rating_db;
```

### 6. Start Backend
```bash
npm run dev
```

---

## Frontend Setup

### 1. Create React App
```bash
npx create-react-app frontend
cd frontend
```

### 2. Install Dependencies
```bash
npm install lucide-react
```

### 3. Replace src/App.js
Copy the React component code into `src/App.js`

### 4. Update src/index.js
```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
```

### 5. Add Tailwind CSS
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**tailwind.config.js:**
```javascript
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
}
```

**src/index.css:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 6. Start Frontend
```bash
npm start
```

---

## Default Admin Credentials
- **Email:** admin@system.com
- **Password:** Admin@123

---

## API Endpoints Summary

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| PUT | `/api/auth/password` | Change password |

### Admin Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard` | Get statistics |
| GET | `/api/admin/users` | List users (with filters) |
| POST | `/api/admin/users` | Create user |
| GET | `/api/admin/users/:id` | Get user details |
| GET | `/api/admin/stores` | List stores |
| POST | `/api/admin/stores` | Create store + owner |

### Store Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stores` | List stores for users |
| POST | `/api/ratings` | Submit/update rating |

### Store Owner Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/owner/dashboard` | Get store stats |

---

## Validation Rules
- **Name:** 20-60 characters
- **Email:** Valid email format
- **Password:** 8-16 chars, 1 uppercase, 1 special character
- **Address:** Max 400 characters
- **Rating:** 1-5 integer

---

## Database Schema

### Users Table
| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY |
| name | VARCHAR(60) | NOT NULL, CHECK(length >= 20) |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| password | VARCHAR(255) | NOT NULL |
| address | VARCHAR(400) | - |
| role | VARCHAR(20) | CHECK IN ('admin','user','store_owner') |
| store_id | INTEGER | FK → stores.id |

### Stores Table
| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY |
| name | VARCHAR(60) | NOT NULL, CHECK(length >= 20) |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| address | VARCHAR(400) | - |
| owner_id | INTEGER | FK → users.id |

### Ratings Table
| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PRIMARY KEY |
| user_id | INTEGER | FK → users.id, NOT NULL |
| store_id | INTEGER | FK → stores.id, NOT NULL |
| rating | INTEGER | CHECK(1-5), NOT NULL |
| UNIQUE | (user_id, store_id) | - |

---

## Features Checklist

### System Administrator ✓
- [x] Dashboard with stats
- [x] Add stores with owners
- [x] Add users (normal/admin)
- [x] View user list with filters
- [x] View store list with filters
- [x] Sort all tables
- [x] View user details
- [x] Logout

### Normal User ✓
- [x] Register/Login
- [x] Change password
- [x] View stores list
- [x] Search by name/address
- [x] Submit ratings (1-5)
- [x] Modify ratings
- [x] Logout

### Store Owner ✓
- [x] Login
- [x] Change password
- [x] View average rating
- [x] View rating users list
- [x] Logout