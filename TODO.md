# Deployment TODO - Blockchain Certificate Verification System

## Status Legend
- [ ] **Not Started**
- [x] **Completed**
- [!] **Blocked** (needs user input)

## 1. Setup Requirements (User Actions)
- [*] MetaMask: Install → Add Sepolia → Fund with test ETH (sepoliafaucet.com)
- [*] Export PRIVATE_KEY from MetaMask (Account Details → Export Private Key)
- [*] Pinata: Create account → API Keys → JWT or API Key/Secret
- [*] Alchemy/Infura: Free Sepolia RPC URL (optional, public RPC works)
- [*] Railway.app: Sign up (MySQL DB)
- [*] Render.com: Sign up (Backend)
- [*] Vercel.com: Sign up (Frontend) → Connect GitHub repo?

## 2. Deploy Smart Contract to Sepolia
- [ ] Create `blockchain/.env`:
```
PRIVATE_KEY=0x_your_deployer_private_key_here
```
- [ ] cd e:/New Project/blockchain && npm install
- [ ] npx hardhat run scripts/deploy.js --network sepolia
- [ ] Copy output CONTRACT_ADDRESS
- [ ] Note: ABI already in server/config/blockchain.js

## 3. Setup Database (Railway MySQL)
- [ ] Railway → New Project → Database → MySQL
- [ ] Connect → Copy connection vars: HOST, PORT, DB, USER, PASS
- [ ] **Add to server/.env: DB_SSL=true** (enables SSL, default)
- [ ] Railway → Data tab → Query → Paste database/schema.sql → Run

## 4. Backend Configuration & Deploy (Render)
- [ ] Create `server/.env` (see below)
- [ ] Update CORS in server/index.js
- [ ] Render → New Service → Web → GitHub repo → Build: none, Start: npm start
- [ ] Add all server/.env vars to Render Dashboard

## 5. Frontend Configuration & Deploy (Vercel)
- [ ] Create `client/.env` (see below)
- [ ] Update client/src/App.jsx (API_URL → env var)
- [ ] Vercel → Import GitHub repo → Deploy → Add env vars

## 6. Testing Checklist
- [ ] Backend health: https://your-backend.onrender.com/api/health
- [ ] No CORS errors in browser console
- [ ] Database: Login with admin@university.com / Admin@123
- [ ] MetaMask: Sepolia network, connect works
- [ ] IPFS: Admin → Issue certificate → Check Pinata dashboard
- [ ] Blockchain: Verify on Sepolia Etherscan

## 7. Multi-PC Verification
- [ ] Test frontend public URL on phone/PC 2
- [ ] All flows: Login → Issue → Verify certificate

## Blocked/Notes
- Waiting for user to provide: PRIVATE_KEY, Pinata JWT, hosting accounts

**Next Step: User completes #1 → I execute #2 (contract deploy needs PRIVATE_KEY)**

Updated: After each step completion, mark [x] and run `git add . && git commit -m "Complete step X"` (optional).
