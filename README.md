# Sportio Hub — MERN authentication starter

A working full-stack starter for Sportio Hub with:
- React + Vite registration and login portal
- Email OTP verification (6 digits, 10-minute expiry)
- Password hashing with bcrypt
- JWT-based authenticated session
- MongoDB + Mongoose user storage
- Athlete, coach, and institution account roles
- Rate limiting and basic security headers

## Requirements
- Node.js 18+
- MongoDB local installation or MongoDB Atlas database
- SMTP credentials for real email delivery

## 1. Configure backend
```bash
cd server
cp .env.example .env
```
Edit `server/.env`:
- `MONGODB_URI`: your local MongoDB URI or Atlas connection string
- `JWT_SECRET`: use a long random secret
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: your email provider SMTP details
- `CLIENT_ORIGIN=http://localhost:5173`

For Gmail, enable 2-Step Verification and create a Google App Password. Use that App Password as `SMTP_PASS`; do not use your normal Gmail password.

`DEV_SHOW_OTP=true` returns the OTP in the API response only when `NODE_ENV=development`. This is a local testing convenience. Set it to `false` before any public deployment. The email is still sent through SMTP when configured.

## 2. Configure frontend
```bash
cd ../client
cp .env.example .env
```
The default API URL is `http://localhost:5000/api`.

## 3. Install and run
From the project root:
```bash
npm install
npm run install:all
npm run dev
```
Open http://localhost:5173. The API runs at http://localhost:5000.

Alternatively, run backend and frontend in separate terminals:
```bash
cd server && npm install && npm run dev
cd client && npm install && npm run dev
```

## API endpoints
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | API and database status |
| POST | `/api/auth/register` | Create pending account and send OTP |
| POST | `/api/auth/verify-email` | Verify OTP and issue JWT |
| POST | `/api/auth/resend-otp` | Resend OTP (60-second cooldown) |
| POST | `/api/auth/login` | Login verified account |
| GET | `/api/auth/me` | Return current user (Bearer token) |

### Example register body
```json
{
  "name": "Demo Athlete",
  "email": "athlete@example.com",
  "password": "strong-password",
  "role": "athlete"
}
```

## Important before deployment
- Set `DEV_SHOW_OTP=false`.
- Use HTTPS and a production-grade secret.
- Configure production SMTP and verify sender/domain.
- Restrict CORS to the deployed frontend domain.
- Add monitoring, backups, and a production rate-limit strategy.
- For a production app, consider storing JWTs in secure, HttpOnly cookies rather than localStorage, add CSRF protection, and add account recovery and email-change workflows.
- OTPs are hashed in MongoDB and expire after 10 minutes. This starter does not yet implement OTP attempt counters, account lockout, or a full password-reset flow.
- This project is a starter implementation; it is not deployed or connected to your private MongoDB/SMTP accounts until you configure the environment variables.
