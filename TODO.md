# Task: Fix localhost:5000/api/auth/register ERR_CONNECTION_REFUSED

## Status: 🚀 In Progress

### Steps:

#### 1. ✅ Install server dependencies
- `cd server && npm install`

#### 2. ✅ Examine database.js and setup DB
- MySQL required: DB_HOST=localhost:3306, DB_NAME=certificate_verification, etc.
- Created server/.env template - **UPDATE DB_PASSWORD and start local MySQL**
- Install MySQL if needed: Download MySQL Community Server

#### 3. ✅ Start server
- `cd server && npm start` (executed, check terminal)
- Expected: http://localhost:5000 - Fix DB if error

#### 4. 🔄 Test health endpoint
- Visit http://localhost:5000/api/health
- `curl http://localhost:5000/api/health`

#### 5. [PENDING] Start frontend dev server
- `cd client && npm install && npm run dev`

#### 6. [PENDING] Test register form
- Navigate to /login -> Register tab
- Submit form, verify no connection error

## Notes
- Chrome extension error ignored (not project-related)
- Server uses Sequelize + PORT=5000
- API URLs hardcoded in some files (fix post-startup if needed)

Updated when steps complete.
