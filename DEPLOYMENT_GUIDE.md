# HR Recruitment App - Complete Deployment Guide

This guide details how to deploy the HR Recruitment Application on **Render** (Backend) and **Vercel** (Frontend) with **Google OAuth** enabled.

---

## 1. Backend Deployment (Render)

1. Connect your GitHub repository to [Render](https://render.com).
2. Create a new **Web Service**:
   - **Root Directory**: `backend` (or leave empty if using `render.yaml`)
   - **Build Command**: `npm install` (or `cd backend && npm install`)
   - **Start Command**: `npm start` (or `cd backend && npm start`)
3. Add the following **Environment Variables** in Render Dashboard -> Settings -> Environment:

| Environment Variable | Recommended Value | Description |
|---|---|---|
| `PORT` | `5000` | Server listening port |
| `MONGO_URI` | `mongodb+srv://...` | MongoDB Atlas Connection String |
| `JWT_SECRET` | `your_secret_key_12345` | Random string for JWT tokens |
| `GOOGLE_CLIENT_ID` | `757996309729-i5pjlrbk43b31g1m3mroc07l3c5t5rt9.apps.googleusercontent.com` | Google OAuth Client ID |
| `GROQ_API_KEY` | `gsk_...` | Groq API Key for AI features |

> ⚠️ **Important**: In MongoDB Atlas Network Access, add `0.0.0.0/0` (Allow access from anywhere) so Render backend can connect to MongoDB.

---

## 2. Frontend Deployment (Vercel)

1. Connect your GitHub repository to [Vercel](https://vercel.com).
2. Select the repository and set project settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend` (if importing subfolder)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add the following **Environment Variables** in Vercel Project Settings -> Environment Variables:

| Environment Variable | Value | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `https://hr-recruitment-backend-g3hi.onrender.com/api` | Render Backend API URL |
| `VITE_GOOGLE_CLIENT_ID` | `757996309729-i5pjlrbk43b31g1m3mroc07l3c5t5rt9.apps.googleusercontent.com` | Google OAuth Client ID |

---

## 3. Google OAuth Setup (Google Cloud Console)

1. Go to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Click your **OAuth 2.0 Client ID**.
3. Under **Authorized JavaScript origins**, add:
   - `http://localhost:5173`
   - `http://localhost:3000`
   - `https://<your-app-name>.vercel.app` (Your production Vercel frontend URL)
4. Under **Authorized redirect URIs**, add:
   - `https://<your-app-name>.vercel.app`
5. Save changes.

---

## 4. Verification

- Open your Vercel URL in your browser.
- Test **Email & Password Signup / Login**.
- Test **Google Sign-In**.
- Test **Instant Demo Access** (One-click login).
