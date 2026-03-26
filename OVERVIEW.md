## 1. Project Overview

**What this project does**  
This is a full‑stack **Blockchain‑Based Academic Certificate Verification System**. It lets universities issue certificates, students manage and share them, and employers/verifiers check authenticity using blockchain, IPFS, and cryptographic hashes.

**The problem it solves**  
- **Forgery and tampering**: Traditional PDF/printed certificates can be edited or forged.  
- **Difficult verification**: Employers usually email universities or rely on screenshots, which is slow and manual.  
- **Centralized trust**: If the university database is compromised or offline, verification breaks.  
This system anchors certificate data on **Ethereum (or compatible chains)** and files on **IPFS**, so verifiers can independently confirm that a certificate is genuine and not revoked.

**Main features**
- **Admin (University)**
  - Issue certificates by uploading a PDF.
  - Compute a **SHA‑256 hash** of the PDF.
  - Upload the PDF to **IPFS (Pinata)** and store the CID.
  - Call a **Solidity smart contract** (`CertificateRegistry`) to store the hash + metadata on‑chain.
  - Revoke certificates (on‑chain with an indexed revocation mapping).
  - View all issued certificates and verification logs.
- **Student**
  - Register/login and connect a **MetaMask** wallet.
  - View all certificates issued to them (status, hash, IPFS CID, blockchain tx).
  - Download the original PDF from the server.
  - Open the certificate file on IPFS.
  - Share **verification links** and **QR codes** that third parties can scan.
  - See verification history.
- **Verifier (Employer/Organization)**
  - Register/login as a verifier.
  - Verify certificates by **hash, link, or PDF upload**.
  - See if a certificate exists, is valid, or revoked.
  - View their verification history and stats.
- **Public**
  - Public verification endpoint for a hash and IPFS view endpoint.

**Target users**
- **Universities / issuing institutions** that want tamper‑resistant certificates.
- **Students** who want portable, verifiable credentials they can share.
- **Employers / verifiers** who need a quick way to check authenticity.
- **Developers/researchers** interested in a practical blockchain + IPFS + web stack example.

---

## 2. Architecture Explanation

**Overall system architecture**

At a high level (also reflected in `README.md`):

- **Frontend (`client/`)**: React + Vite SPA (Tailwind UI) with dashboards for Admin, Student, Verifier and a public verification page. It talks to the backend via REST APIs and to MetaMask via `ethers.js`.
- **Backend (`server/`)**: Node.js + Express REST API. Handles:
  - Authentication (JWT).
  - Role‑based access (admin/student/verifier).
  - File uploads (Multer) and storage path management.
  - IPFS uploads via Pinata.
  - Blockchain interactions via `ethers.js` using a deployed `CertificateRegistry` contract.
  - MySQL persistence with Sequelize.
  - Rate limiting, CORS, and error handling.
- **Blockchain (`blockchain/`)**: Hardhat project with the `CertificateRegistry.sol` smart contract and deployment scripts. Keeps an on‑chain mapping of certificate hashes to metadata and a revocation index for O(1) revocation checks.
- **Database (`database/schema.sql`)**: MySQL schema defining `users`, `certificates`, `verification_logs`, and `verifiers` tables with indices for email, wallet, and hash lookups.

**How different components interact**
- **User -> Frontend**: User uses the React SPA (auth pages, dashboards, verify page).
- **Frontend -> Backend**: SPA calls REST APIs under `/api/...` (e.g. `/api/auth/login`, `/api/certificate/issue`, `/api/verify/by-hash`).
- **Backend -> Database**: Express controllers use Sequelize models (`User`, `Certificate`, `VerificationLog`, `Verifier`) to persist users, certificates, and verification logs.
- **Backend -> IPFS**: `ipfsService` uploads PDFs and JSON metadata to IPFS (Pinata) and returns CIDs.
- **Backend -> Blockchain**: `blockchainService` uses `ethers.js` to call the Solidity contract functions (`issueCertificate`, `verifyCertificate`, `revokeCertificate`) using RPC credentials from `.env`.
- **Frontend -> Blockchain**: The React app connects to MetaMask via `ethers.providers.Web3Provider` on the client side to get the student’s wallet and link it to their account.

**Folder structure explanation (high‑level)**
- `client/`
  - `src/App.jsx`: Root component, routing, and auth/wallet context.
  - `src/pages/*.jsx`: Page‑level components (admin/student/verifier dashboards, login screens, verification page).
  - `src/components/*.jsx`: Shared UI pieces such as auth forms, wallet connect, etc.
- `server/`
  - `index.js`: Express app initialization, middleware, route mounting, DB and blockchain bootstrapping.
  - `config/database.js`: Sequelize connection and `testConnection`.
  - `config/blockchain.js`: Initializes contract instance with RPC + private key.
  - `models/`: Sequelize models and associations for `User`, `Certificate`, `VerificationLog`, `Verifier`.
  - `controllers/`: Request handlers implementing business logic (auth, certificates, verification, students, verifiers).
  - `routes/`: Express routers for `/auth`, `/certificate`, `/student`, `/verifier`, `/verify`, `/users`.
  - `middleware/`: JWT auth (`authenticate`, `requireAdmin`, …) and Multer upload config.
  - `services/ipfsService.js`: IPFS/Pinata file & JSON upload helpers.
  - `services/blockchainService.js`: Ethers‑based wrapper for calling `CertificateRegistry`.
- `blockchain/`
  - `contracts/CertificateRegistry.sol`: Core smart contract.
  - `scripts/deploy.js`: Hardhat deployment script.
  - `hardhat.config.js`: Network + compiler configuration.
- `database/schema.sql`: MySQL schema and seed users.
- `student-module/README.md`: Documentation focused specifically on the student module.

**Data flow from frontend to backend (key scenarios)**

- **Issuing a certificate (Admin)**
  1. Admin logs in via `/api/auth/login` and gets a JWT.
  2. Admin opens `AdminDashboard` and selects a student + uploads a PDF.
  3. Frontend `POST /api/certificate/issue` with `FormData` (`certificate`, `studentId`, `certificateName`, `certificateDescription`) and `Authorization: Bearer <token>`.
  4. Backend:
     - Auth middleware checks JWT and role (`requireAdmin`).
     - Multer saves PDF to `server/uploads/certificates/...`.
     - Controller:
       - Reads file, computes **SHA‑256 hash** via `generateCertificateHash`.
       - Uploads PDF to IPFS via `uploadToIPFS` → gets `ipfsCID`.
       - Creates metadata JSON and uploads to IPFS via `uploadJSONToIPFS` → `metadataCID`.
       - Calls `issueCertificate` on the smart contract with hash, CID, student wallet, and issuer name → gets tx hash.
       - Stores a row in `certificates` (MySQL) with hash, CIDs, student id, issuer info, tx hash, and local file path.
       - Generates a QR code (using `qrcode`) for the verification link (`/verify?hash=...`).
     - Returns JSON with certificate info, link, QR, and blockchain result.

- **Student viewing certificates**
  1. Student logs in via `/api/auth/login` (role: `student`) and optionally connects MetaMask from the UI (frontend calls `/api/users/connect-wallet`).
  2. `StudentDashboard` calls `GET /api/student/certificates` (student‑specific helper) or `GET /api/certificate/student/:id`.
  3. Backend queries `Certificate` with `include: { model: User, as: 'student' }`, adds verification links + QR codes.
  4. Frontend renders cards/table with status, actions (download, share, details).

- **Verifier checking a certificate**
  1. Verifier logs in (or uses public route).
  2. For hash verification: frontend calls `POST /api/verify/by-hash` (public) or `/api/verify/by-hash-auth` (authenticated).
  3. Backend:
     - Optionally authenticates/verifier and logs attempt.
     - Calls `verifyCertificate` in `blockchainService`, which calls the contract’s `verifyCertificate` function.
     - Loads certificate (if exists) from MySQL by `certificate_hash`.
     - Returns combined view: blockchain validity + DB metadata + revoked flag.
  4. For file upload verification: frontend posts a PDF to `/api/verify/upload`; backend hashes the file and reuses the same verification flow.

---

## 3. Technology Stack

Below is how each major tech fits this project, why you chose it, and alternatives you could mention in interviews.

### Frontend

- **React + Vite**
  - **What**: Modern SPA framework with fast dev tooling.
  - **Why chosen**:
    - Component‑based architecture for dashboards and shared components.
    - Vite dev server is extremely fast and simple to configure.
    - Rich ecosystem (React Router, hooks, context).
  - **Problem it solves**: Delivers a responsive, interactive UI for multiple user roles (admin/student/verifier) with client‑side routing and stateful dashboards.
  - **Alternatives**: Next.js, Angular, Vue, SvelteKit.

- **Tailwind CSS**
  - **What**: Utility‑first CSS framework.
  - **Why chosen**:
    - Rapid styling directly in JSX without managing many CSS files.
    - Easy to create consistent “dashboard” look and responsive design.
  - **Problem it solves**: Quickly builds a professional UI for dashboards, tables, and modals without writing custom CSS from scratch.
  - **Alternatives**: Material UI, Chakra UI, Bootstrap, plain CSS/Sass.

- **React Router (`react-router-dom`)**
  - **What**: Client‑side routing library for React.
  - **Why chosen**:
    - Simple setup with `<BrowserRouter>` and `<Routes>`.
    - Easy redirect logic based on role (`Navigate` to `/admin`, `/student`, `/verifier`).
  - **Problem it solves**: Maps URLs to pages and protects routes based on auth/role.
  - **Alternatives**: Next.js built‑in routing, Reach Router, TanStack Router.

- **Ethers.js (frontend)**
  - **What**: Ethereum JS library for interacting with wallets and contracts.
  - **Why chosen**:
    - Clean API to connect MetaMask and read wallet address from the browser.
    - Works well in both Node and browser contexts.
  - **Problem it solves**: Safe interaction with MetaMask to fetch the student’s wallet address and link it to their profile.
  - **Alternatives**: web3.js, wagmi + viem, thirdweb.

- **html5-qrcode / qrcode**
  - **What**: Libraries for generating and scanning QR codes.
  - **Why chosen**:
    - `qrcode` used server‑side to generate QR image data URLs for verification links.
    - `html5-qrcode` used client‑side for QR scanning in the verifier dashboard.
  - **Problem it solves**: Lets verifiers scan physical/printed certificates and quickly jump to the verification URL.
  - **Alternatives**: `qrcode.react`, `jsQR`, custom QR code APIs.

### Backend

- **Node.js + Express**
  - **What**: JavaScript runtime and minimal web framework.
  - **Why chosen**:
    - Simple to set up REST endpoints.
    - Same language (JS/TS) across frontend, backend, and blockchain tooling.
    - Integrates smoothly with middleware (JWT, Multer, rate limiting).
  - **Problem it solves**: Provides a thin, flexible API layer for auth, certificate issuance, verification, and admin dashboards.
  - **Alternatives**: NestJS, Fastify, Spring Boot (Java), Django/FastAPI (Python), Laravel (PHP).

- **Sequelize + MySQL**
  - **What**: ORM and relational database.
  - **Why chosen**:
    - MySQL is widely used, good for relational data and indexing.
    - Sequelize provides model definitions, associations, and query helpers.
  - **Problem it solves**: Persistent storage for users, certificates, and verification logs with referential integrity and indexes on email/wallet/hash.
  - **Alternatives**:
    - Database: PostgreSQL, MariaDB, MongoDB.
    - ORM: TypeORM, Prisma, Knex, raw SQL.

- **Multer**
  - **What**: Middleware for file uploads.
  - **Why chosen**:
    - Simple to support `multipart/form-data` for PDF uploads.
    - Easy integration with Express routes (`upload.single('certificate')`).
  - **Problem it solves**: Handles PDF uploads in certificate issuance and verification by upload.
  - **Alternatives**: Busboy, formidable, direct upload to S3 or object storage.

- **jsonwebtoken + bcryptjs**
  - **What**: Libraries for JWT auth and password hashing.
  - **Why chosen**:
    - Simple token‑based auth model for SPA + API.
    - Bcrypt is standard for password hashing.
  - **Problem it solves**: Secure session handling without server‑side session storage and secure password storage.
  - **Alternatives**: Passport.js, OAuth providers, Keycloak, Auth0.

- **express-rate-limit**
  - **What**: Rate limiting middleware.
  - **Why chosen**:
    - Protects login and verification endpoints from abuse.
  - **Problem it solves**: Prevents brute‑force login and excessive verification spam.
  - **Alternatives**: Nginx/LB‑level rate limiting, Cloudflare, custom Redis‑based throttling.

- **axios (backend & frontend)**  
  - Used (primarily backend) for HTTP calls, e.g., to IPFS/Pinata APIs.
  - Could also be used in the frontend (though you mostly use `fetch` there).

### Blockchain & IPFS

- **Solidity + Hardhat**
  - **What**: Smart contract language and development framework.
  - **Why chosen**:
    - Industry standard for EVM chains.
    - Hardhat simplifies compilation, testing, and deployment across local and test networks.
  - **Problem it solves**: On‑chain, immutable record of certificate hashes and a revocation index for trustless verification.
  - **Alternatives**: Foundry, Truffle, Brownie, Wagmi/viem for client SDK.

- **IPFS (Pinata)**
  - **What**: Decentralized file storage, with Pinata as a pinning service.
  - **Why chosen**:
    - Keeps the raw certificate PDFs off‑chain but still verifiable and content‑addressed by CID.
    - Offloads storage from your server while providing a permanent content identifier.
  - **Problem it solves**: Scalable, tamper‑resistant file storage for PDFs and metadata.
  - **Alternatives**: Filecoin, Arweave, S3 with integrity checks (not decentralized).

---

## 4. Backend Explanation

**APIs and endpoints**

Documented in `README.md` and implemented in the `routes/` and `controllers/` folders:
- **Auth (`/api/auth`)**
  - `POST /register` – register new user (admin can create accounts; or open registration configs).
  - `POST /login` – login and issue JWT (login rate‑limited).
  - `GET /me` – get current user profile (JWT protected).
  - `PUT /wallet` – update wallet address.
  - `GET /users` – admin‑only user listing (supports filtering, e.g. `?role=student`).
- **Users (`/api/users`)**
  - Endpoint like `/api/users/connect-wallet` used by the frontend to attach a MetaMask address to the currently logged‑in user.
- **Certificates (`/api/certificate`)** (see `certificateRoutes.js` / `certificateController.js`)
  - Public: `POST /verify` – verify by hash or file upload.
  - Admin: `POST /issue`, `POST /revoke`, `GET /all`, `GET /verification-logs`.
  - Student: `GET /student/:studentId` – get own certificates.
  - Authenticated: `GET /:id`, `GET /:id/download`.
- **Verification (`/api/verify`)** (see `verificationRoutes.js`)
  - Public:
    - `POST /by-hash` – verify by hash or link.
    - `GET /public/:hash` – public verification data by hash.
    - `GET /ipfs/:cid` – proxy to get file from IPFS.
  - Authenticated:
    - `POST /upload` – verify by certificate file upload.
    - `POST /by-hash-auth` – verify by hash and log to history.
- **Student module (`/api/student`)**
  - Described in `student-module/README.md`:
    - Public: `/register`, `/login`.
    - Protected: `/profile`, `/certificates`, `/certificate/:hash`, `/download/:hash`, `/verification-history/:hash`, `/wallet`.
- **Verifier module (`/api/verifier`)**
  - Similar pattern for verifier registration, login, profile, history, and stats.

**Business logic (example: issuing & verifying certificates)**

In `certificateController.js`:
- **Issuing (`issueCertificate`)**
  - Validate uploaded PDF and required fields.
  - Find student by ID; ensure `role === 'student'`.
  - Read PDF from disk and compute **SHA‑256** using `generateCertificateHash`.
  - Check DB to ensure hash is unique.
  - Upload file buffer to IPFS via `uploadToIPFS` → get `ipfsCID`.
  - Build metadata JSON (student, issuer, hash, CIDs, timestamps) and upload to IPFS via `uploadJSONToIPFS`.
  - Validate that student has a non‑zero wallet address set.
  - Call contract’s `issueCertificate` via `blockchainService.issueCertificate(...)` and capture tx hash.
  - Insert a `Certificate` row in MySQL with hash, IPFS CID, wallet addresses, tx hash, and file path.
  - Generate a QR code for the verification URL and return all data.

- **Revoking (`revokeCertificate`)**
  - Validate certificate ID.
  - If the certificate was never on‑chain (no tx hash), mark revoked locally.
  - Otherwise, call `revokeCertificate` on the contract.
  - If blockchain call indicates “does not exist”, still mark locally revoked for safety.
  - Update `revoked` + `revoked_at` in DB.

- **Verifying (`verifyCertificate`)**
  - Accept either uploaded file or hash in request.
  - If file present, compute its hash with `generateCertificateHash`.
  - Call contract’s `verifyCertificate` to get `isValid`, `isRevoked`, IPFS, student, issuer, timestamp.
  - Query DB for a matching `Certificate` row (include `student`).
  - If caller is authenticated, log the attempt in `VerificationLog` with result, IPFS CID, issuer, student name, timestamp.
  - Return aggregated info: DB certificate data + blockchain status + verification message.

**Authentication and authorization**
- Implemented by `middleware/auth` (not shown in code here but referenced).
- **JWT**:
  - On login, backend creates a JWT containing user id, email, and role.
  - Subsequent requests send `Authorization: Bearer <token>`.
  - Middleware verifies token and attaches `req.user`.
- **Role‑based access**:
  - `requireAdmin` ensures only admins can call `issue`, `revoke`, or list all certificates.
  - Student routes check that current user matches requested student id before returning certificates or downloads.
  - Verifier‑only routes for stats/history.

**Database interactions**
- All DB operations flow through Sequelize models (e.g. `Certificate.findOne`, `Certificate.findAndCountAll`, `VerificationLog.create`).
- Schema (`database/schema.sql`) has:
  - `users`: id, name, email, password, role(`admin|student|verifier`), wallet_address, timestamps.
  - `certificates`: id, `certificate_hash`, `ipfs_cid`, `student_id` (FK), issuer info, tx hashes, description, file_path, revoked flags, timestamps.
  - `verification_logs`: id, `certificate_hash`, `verified_by`, `verifier_type`, verifier wallet, result enum (`VALID|REVOKED|NOT_FOUND`), IPFS CID, issuer name, student name, timestamp.
  - `verifiers`: extra table for external verifier registrations.
- Indices:
  - Email, wallet, role, hash, revoked status, timestamps to make lookups and analytics efficient.

**Important backend services/modules**
- `services/blockchainService.js`:  
  Wraps contract calls:
  - `issueCertificate(bytes32 hash, string ipfsCID, address student, string issuer)`.
  - `verifyCertificate(bytes32 hash)`.
  - `revokeCertificate(bytes32 hash)`.
  - `generateCertificateHash(buffer)` for SHA‑256.
- `services/ipfsService.js`:
  - Uploads raw files and JSON metadata to IPFS using Pinata API keys in `.env`.
  - Centralizes IPFS logic, making it easy to swap pinning providers later.

---

## 5. Frontend Explanation

**UI framework used**
- **React** with **functional components and hooks**, styled using **Tailwind CSS**.
- Routing handled by `react-router-dom`.

**Component and page structure (from `client/src/`)**
- `App.jsx`
  - Defines `AuthContext` for sharing auth and wallet state.
  - Configures routes:
    - `/login` → `AuthPage`.
    - `/student-login` → `StudentLogin`.
    - `/verifier-login` → `VerifierLogin`.
    - `/verify` → `VerifyCertificate`.
    - `/admin`, `/student`, `/verifier` protected by role checks.
    - Root `/` redirects based on current user role.
- `pages/`
  - `AdminDashboard.jsx`: Admin UI to issue and revoke certificates and list all.
  - `StudentDashboard.jsx`: Student UI to view/download/share certificates and see history.
  - `VerifierDashboard.jsx`: Verifier UI to verify by hash, upload, or QR, see stats.
  - `Login.jsx` / `AuthPage.jsx` / `StudentLogin.jsx` / `VerifierLogin.jsx`: Different login/registration flows per role.
  - `VerifyCertificate.jsx`: Public verification page where anyone can check a certificate hash or link.
- `components/`
  - `AuthCard`, `LoginForm`, `RegisterForm`, `RoleSelector`, `WalletConnect`, `DemoAccounts`, etc. for layout and shared features.

**State management**
- **React Context (`AuthContext`)** in `App.jsx`:
  - Stores `user`, `walletAddress`, loading flags, and helper functions (`login`, `logout`, `connectWallet`, `getToken`, etc.).
  - Persists `token`, `user`, and `walletAddress` in `localStorage`.
  - Provides global access across dashboards and pages without Redux.
- Local `useState` and `useEffect` hooks for:
  - Fetching lists (students, certificates).
  - Toggling tabs and modals.
  - Loading/feedback states.

**API integration**
- `API_URL` is centralized in `App.jsx` (`http://localhost:5000/api` in dev).
- Components use `fetch` with:
  - `Authorization: Bearer <token>` header from `getToken()` where needed.
  - JSON bodies or `FormData` for file uploads.
- Example flows:
  - Admin fetches students via `GET /auth/users?role=student`.
  - Admin issues certificate via `POST /certificate/issue`.
  - Student fetches certificates via `/student/certificates` or `/certificate/student/:id`.
  - Student downloads using `/student/download/:hash` or `/certificate/:id/download`.

**Key UI features**
- **AdminDashboard**
  - Tabbed interface: *Issue Certificate* and *View Certificates*.
  - Form with student selection, name, description, PDF upload.
  - Table of all certificates with revocation status tags and revoke buttons.
- **StudentDashboard**
  - Summary cards: total, valid, revoked certificates.
  - Table listing certificates with status badges.
  - Modals for certificate details: hash, IPFS CID, tx hash, status, revocation date.
  - Buttons to **download**, **share verification link**, and **view on IPFS**.
  - Verification history list per certificate with timestamps and results (VALID/REVOKED/NOT_FOUND).
- **VerifierDashboard** (from other page files)
  - Form for hash or URL input.
  - File upload + QR scanning options.
  - Displays verification result and details returned from backend.
- **MetaMask integration UI**
  - Notifications when wallet not connected.
  - Buttons to connect/disconnect.
  - Graceful handling when MetaMask is not installed.

---

## 6. Database Design

**Database type**
- **Relational database**: MySQL (InnoDB engine, UTF‑8 collation).

**Schema explanation**
- `users`
  - Core identity table for admin, student, and verifier roles.
  - Fields: `id`, `name`, `email`, `password`, `role`, `wallet_address`, timestamps.
  - Indices on `email`, `wallet_address`, and `role` for quick lookups.
- `certificates`
  - Represents an issued certificate.
  - Fields: `certificate_hash` (unique), `ipfs_cid`, `student_id` (FK to users), `issuer_name`, `issuer_wallet_address`, `blockchain_tx`, `blockchain_tx_hash`, `certificate_name`, `certificate_description`, `file_path`, `revoked`, `revoked_at`, timestamps.
- `verification_logs`
  - One row per verification attempt.
  - Fields: `certificate_hash`, `verified_by`, `verifier_type (user|verifier)`, `verifier_wallet_address`, `verification_result (VALID|REVOKED|NOT_FOUND)`, `ipfs_cid`, `issuer_name`, `student_name`, `timestamp`.
  - Indexed on certificate hash, verified_by, result, and timestamp for analytics.
- `verifiers`
  - Separate table to model external verifier organizations.
  - Fields: `organization_name`, `verifier_name`, `email`, `password`, `wallet_address`, timestamps.

**Relationships between tables**
- `users (id)` → `certificates.student_id` (one‑to‑many: a student can have many certificates).
- `users` and `verifiers` → `verification_logs.verified_by` (logical relationship based on `verifier_type` and the application logic).
- `certificates` are linked logically to `verification_logs` by `certificate_hash` (not strict FK, but both are indexed).

**Why this database was used**
- Relational model fits the **user‑certificate‑verification** relationships nicely.
- Support for **constraints and indices** ensures integrity and performance.
- MySQL is widely supported and easy to host; Sequelize handles model mapping.
- Easy to write analytical queries for admin dashboards (e.g., count of revoked vs valid).

---

## 7. Important Files Explained

- **Root `README.md`**
  - High‑level documentation: architecture diagram, features by role, tech stack, project structure, setup steps, environment variables, API summary, and contract description.

- **`server/index.js`**
  - Bootstraps Express app:
    - Configures CORS with allowed dev origins.
    - Sets up JSON/urlencoded middleware.
    - Serves static uploads under `/uploads`.
    - Attaches rate limiters (general, verification‑specific, login‑specific).
    - Mounts routers for auth/users/certificates/student/verifier/verify.
    - Runs DB connection test and `sequelize.sync` (without alters).
    - Initializes blockchain with `initBlockchain()`.
    - Starts HTTP server and sets global handlers for uncaught errors.

- **`server/routes/certificateRoutes.js`**
  - Wires the certificate endpoints to controllers and middleware:
  - Public:
    - `POST /verify` (upload.single + `verifyCertificate`).
  - Admin protected:
    - `POST /issue`, `POST /revoke`, `GET /all`, `GET /verification-logs`.
  - Student:
    - `GET /student/:studentId` (auth only; controller validates identity).
  - General authenticated:
    - `GET /:id`, `GET /:id/download`.

- **`server/controllers/certificateController.js`**
  - Core business logic for:
    - Issuing certificates (hashing, IPFS upload, blockchain call, DB insert, QR).
    - Revoking certificates (blockchain + DB or DB‑only fallback).
    - Verifying certificates (hash or upload).
    - Fetching by id, student listings, admin listing, and verification logs.

- **`server/routes/verificationRoutes.js` + `server/controllers/verificationController.js`**
  - Public and authenticated verification endpoints:
    - `/by-hash`, `/by-hash-auth`, `/upload`, `/public/:hash`, `/ipfs/:cid`.
  - Adds validation using `express-validator`.

- **`blockchain/contracts/CertificateRegistry.sol`**
  - Smart contract storing:
    - `mapping(bytes32 => Certificate)` with `Certificate` struct fields.
    - `mapping(bytes32 => bool) revocationIndex` for O(1) revocation checks.
  - Public functions:
    - `issueCertificate`, `verifyCertificate`, `revokeCertificate`, `getCertificate`, `getCertificateCount`, `getCertificateByIndex`, `certificateExists`, `checkRevocationStatus`.
  - Emits `CertificateIssued` and `CertificateRevoked` events for off‑chain indexing.

- **`database/schema.sql`**
  - SQL schema plus seeded admin/student/verifier examples with bcrypt‑hashed passwords, helpful for local demo.

- **`client/src/App.jsx`**
  - Defines auth/wallet context and provides:
    - `login`, `logout`, `connectWallet`, `disconnectWallet`, `getToken`, `API_URL`.
  - Handles MetaMask detection, account and chain change listeners.
  - Sets up routes and role‑based redirection for `/admin`, `/student`, `/verifier`.

- **`client/src/pages/AdminDashboard.jsx`**
  - UI + logic for:
    - Fetching students and certificates.
    - Issuing certificates via a form and PDF upload.
    - Revoking certificates via API.
    - Displaying certificate list with status.

- **`client/src/pages/StudentDashboard.jsx`**
  - UI + logic for:
    - Fetching and summarizing the student’s certificates.
    - Viewing certificate details (including IPFS and blockchain info).
    - Downloading certificates from backend.
    - Copying verification links and viewing verification history.

---

## 8. Key Features Implementation (Step‑by‑Step)

### Feature 1: Issuing a blockchain‑backed certificate
1. **Admin authenticates** using email/password (`/api/auth/login`).
2. **Admin connects MetaMask** (optional but recommended).
3. **Admin fills form** on `AdminDashboard`: selects student, enters certificate name/description, uploads PDF.
4. **Frontend sends `POST /api/certificate/issue`** with `FormData` and JWT.
5. **Backend validates**:
   - Admin role via `authenticate` + `requireAdmin`.
   - Student existence and role via `User.findByPk`.
   - File presence and `.pdf` type.
6. **Backend computes hash**:
   - Reads PDF buffer from disk.
   - Calls `generateCertificateHash(buffer)` → SHA‑256 hex string.
   - Checks `Certificate.findOne` to ensure no duplicate hash.
7. **Backend uploads to IPFS**:
   - Calls `uploadToIPFS(buffer, originalName)` → `ipfsCID`.
   - Builds metadata JSON and calls `uploadJSONToIPFS(metadata)` (for future use).
8. **Backend validates student wallet**:
   - Ensures `wallet_address` is set and not zero address.
9. **Backend calls smart contract**:
   - `issueCertificate(hash, ipfsCID, studentWallet, issuerName)` using `ethers.js`.
   - Waits for transaction and gets `transactionHash`.
10. **Backend persists certificate**:
    - Inserts into `certificates` with DB and blockchain fields.
    - Generates QR code data URL pointing to `/verify?hash=...`.
11. **Frontend updates UI**:
    - Shows success message and might display verification link and QR for sharing.

### Feature 2: Verifying a certificate by hash or PDF
1. **Verifier/student/public user** opens verification UI (`VerifyCertificate` or verifier dashboard).
2. They either:
   - Paste a hash or link → frontend calls `POST /api/verify/by-hash`.
   - Upload a PDF → frontend calls `POST /api/verify/upload` (auth required for history logging).
3. **Backend**:
   - If file uploaded, reads buffer and computes hash.
   - Calls contract’s `verifyCertificate(hash)` via `blockchainService`.
   - Reads `Certificate` row from DB by `certificate_hash`.
   - If authenticated, logs attempt in `verification_logs`.
4. **Backend returns result**:
   - `result: VALID/REVOKED/NOT_FOUND`.
   - Certificate metadata (name, student, issuer, IPFS CID, revocation status).
   - Blockchain verification details.
5. **Frontend displays**:
   - Clear status badge.
   - Any revocation message and metadata (student name, issuer, dates).

### Feature 3: Student dashboard with verification history
1. Student logs in and navigates to `/student`.
2. `StudentDashboard` calls `GET /api/student/certificates` with JWT.
3. Backend responds with certificate list and precomputed verification links + QR codes.
4. Student selects a certificate and clicks “Details”.
5. Frontend calls `GET /api/student/certificate/:hash` and `GET /api/student/verification-history/:hash`.
6. Backend:
   - Returns full `Certificate` record including IPFS CID and blockchain tx hash.
   - Returns `verification_logs` filtered by `certificate_hash`.
7. Frontend opens a modal:
   - Shows revocation banner if revoked.
   - Shows hash, IPFS CID, blockchain tx with Etherscan link.
   - Lists verification history with results and timestamps.

### Feature 4: Revocation and indexed revocation lookup
1. Admin decides to revoke a certificate from `AdminDashboard` (View Certificates tab).
2. Frontend calls `POST /api/certificate/revoke` with `certificateId`.
3. Backend:
   - Validates certificate and checks if already revoked.
   - If the certificate had a valid tx, calls contract `revokeCertificate(hash)`.
   - Updates local DB: set `revoked = true`, `revoked_at = now`.
4. Smart contract:
   - Sets `revocationIndex[hash] = true` for O(1) lookup.
   - Sets `certificates[hash].revoked = true`.
5. Any future verification:
   - Contract’s `verifyCertificate` sees `revocationIndex[hash] == true`.
   - Returns `isValid = false`, `isRevoked = true`, which the backend maps to `REVOKED`.

---

## 9. Challenges & Engineering Decisions

**Possible technical challenges**
- **Keeping on‑chain data minimal**: Storing whole PDFs on‑chain is impossible; you had to store only **hash + IPFS CID + minimal metadata** to keep gas costs reasonable.
- **Revocation speed**: A naive design might require scanning arrays or logs to see if a certificate was revoked. You solved this with a **mapping‑based revocation index** for O(1) revocation checks.
- **Wallet linking and UX**: Ensuring that a student has a valid wallet address before issuing a certificate, but not forcing wallet connection for all flows.
- **Consistency between DB and blockchain**: Handling cases where contract calls can fail or revert while DB operations succeed or vice versa, and implementing fallbacks (e.g. local revocation when on‑chain record is missing).
- **Security and rate‑limiting**: Protecting login, verification, and file upload endpoints from abuse.

**Why certain approaches were used**
- **Separate DB + blockchain**:
  - DB stores rich metadata, file paths, users, and logs.
  - Blockchain stores only what needs to be trustless (hashes and revocation state).
  - This balances **security, cost, and performance**.
- **Indexed revocation mapping**:
  - Chosen over storing revocations only in events or arrays because lookups must be fast and cheap for every verification.
- **IPFS + Pinata**:
  - Keeps PDFs off‑chain but with content integrity, and doesn’t require your backend to scale storage indefinitely.
- **JWT + role‑based access**:
  - Lightweight and stateless auth model that fits well with SPA frontends and microservices.
- **Sequelize & MySQL**:
  - Simple relational model with familiar SQL semantics and indexes; easy to migrate or replace later if needed.

---

## 10. Resume Description

**3 strong resume bullet points**
- Designed and implemented a full‑stack **blockchain‑based academic certificate verification platform** using **React, Node.js/Express, MySQL, Solidity, Hardhat, IPFS, and MetaMask**, enabling tamper‑resistant issuance and instant verification of academic credentials.
- Built backend services to **hash, store, and index certificates** across MySQL, IPFS (Pinata), and an Ethereum smart contract, including an **O(1) revocation index** and detailed verification logging for auditability.
- Developed role‑based dashboards for **admins, students, and verifiers** with JWT authentication, rate‑limited APIs, QR‑code based verification, and real‑time blockchain status, improving verification workflows for students and employers.

**2–3 line project description for resume**
- *Blockchain‑Based Academic Certificate Verification System*: A full‑stack web application that lets universities issue, manage, and revoke academic certificates on Ethereum, while storing PDFs on IPFS and metadata in MySQL.  
- Students view and share their certificates via a React dashboard, and employers can verify authenticity by hash, link, QR code, or file upload through a secure Node.js/Express API integrated with a Solidity smart contract.

---

## 11. Interview Preparation

**10 interview questions and concise answers**

1. **Q:** Why did you use both a database and a blockchain instead of only blockchain?  
   **A:** The blockchain stores only what needs to be trustless and immutable—certificate hashes and revocation state—because on‑chain storage is expensive. The relational database holds richer metadata (users, descriptions, logs, file paths) and supports complex queries and dashboards. This hybrid design balances cost, performance, and security.

2. **Q:** How does the system detect if a certificate PDF has been tampered with?  
   **A:** When issuing a certificate, the backend computes a SHA‑256 hash of the PDF and stores it on‑chain and in the DB. During verification, it recomputes the hash from the uploaded file or provided hash and compares it to the stored hash. If they match and the revocation index indicates it’s not revoked, the certificate is considered authentic.

3. **Q:** What is the purpose of the `revocationIndex` mapping in the smart contract?  
   **A:** `revocationIndex` maps `certificateHash` to a boolean indicating revocation. It lets the contract check revocation in O(1) time without scanning arrays or logs, which keeps each verification call efficient and gas‑friendly.

4. **Q:** How do you ensure that only authorized users can issue or revoke certificates?  
   **A:** The backend uses JWTs and role‑based middleware. Admin‑only routes (like `/api/certificate/issue` and `/api/certificate/revoke`) are wrapped with `authenticate` plus `requireAdmin`, which ensure the JWT is valid and the user’s role is `admin` before executing controller logic.

5. **Q:** How is MetaMask integrated into the system?  
   **A:** On the frontend, I use `ethers.providers.Web3Provider(window.ethereum)` to request accounts and read the wallet address. That address is saved in local storage and sent to the backend using an authenticated `connect-wallet` endpoint, which persists it in the `users` table. When issuing certificates, the backend requires a valid student wallet address to link the certificate to a blockchain identity.

6. **Q:** What security measures are implemented on the backend?  
   **A:**  
   - JWT authentication and role‑based authorization.  
   - Password hashing with bcrypt.  
   - CORS configuration with explicit allowed origins.  
   - Rate limiting for general API, verification endpoints, and login attempts.  
   - File upload validation to allow only PDFs.  
   - Centralized error handling and 404 responses.

7. **Q:** How does the system handle failures when calling the blockchain?  
   **A:** Blockchain interactions are wrapped in try/catch blocks. If issuing fails, the controller returns an error and does **not** create a DB record, keeping them consistent. For revocation, if the contract reports that a certificate doesn’t exist, the backend still marks the certificate as revoked locally and returns a clear message about the partial revocation.

8. **Q:** Why did you choose React with Vite on the frontend?  
   **A:** React offers a mature component model and ecosystem for building interactive dashboards. Vite provides fast HMR and a simple configuration for a modern JS stack. Together they give a very productive developer experience and a performant SPA build pipeline.

9. **Q:** How do students and verifiers actually use the verification features in practice?  
   **A:** Admins issue certificates, and students see them in their dashboard with a shareable link and QR code. Verifiers can either paste the link/hash into the verification page, upload the certificate PDF, or scan the QR code. Behind the scenes, the backend recomputes the hash and queries both the blockchain and DB to respond with VALID/REVOKED/NOT_FOUND.

10. **Q:** If you had to migrate this system to production mainnet, what would you change?  
    **A:** I’d harden key management (e.g., HSM or dedicated signer), move to robust infrastructure (managed DB, load‑balanced backend), implement mainnet‑specific gas optimizations and monitoring, add more analytics and alerting around verification traffic, and review contract & code with security audits. I’d also improve CI/CD and secrets management for the deployment of both backend and contracts.

---

## 12. Improvements and Scalability

**Potential improvements**
- **Multi‑tenant support**: Add organization/tenant ids so multiple universities can share one deployment safely.
- **Richer analytics dashboards**: Visualizations for verification statistics, revocation trends, and issuer performance.
- **Frontend robustness**: Better error messaging and retries for blockchain and IPFS operations; more polished UX for QR scanning and verification flows.
- **Stronger validation**: Additional server‑side validation using `express-validator` across all routes and stricter file size limits.
- **Access control on contract**: Right now, logic is enforced mostly in the backend. You could add on‑chain role checks or ownership patterns (e.g., only a trusted issuer address can issue/revoke).

**Scalability considerations**
- **Backend/API**
  - Can scale horizontally behind a load balancer since JWTs are stateless.
  - Use connection pooling for MySQL and caching for frequently accessed read endpoints (e.g., public verification).
- **Database**
  - Add more indices and potentially partition `verification_logs` as it grows.
  - Consider read replicas for analytics dashboards.
- **Blockchain**
  - Contract design already keeps storage minimal; can scale by using L2 networks (Polygon, Arbitrum, etc.) instead of mainnet.
  - Off‑chain indexing (e.g., The Graph) could be used for advanced queries.
- **File storage**
  - PDFs are stored on IPFS; as volume grows, you can rely on pinning services or add redundancy across IPFS gateways.

With these explanations, you can confidently walk through the system end‑to‑end in an interview: describe how a certificate moves from an admin upload to being a verifiable, blockchain‑anchored asset that students can share and employers can trust.

