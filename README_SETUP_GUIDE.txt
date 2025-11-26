RicoGPA - Setup Guide

This package contains a React frontend and Node/Express backend.

1) Backend setup
- Open terminal:
  cd backend
  cp .env.example .env
  # Edit .env and set MONGO_URI and JWT_SECRET
  npm install
  npm run dev

Default admin credentials (preset):
  Email: admin@ricogpa.com
  Password: Admin123

2) Frontend setup
- Open another terminal:
  cd frontend
  npm install
  npm start
- The frontend runs at http://localhost:3000 and talks to backend at http://localhost:5000

3) Notes
- The backend uses MongoDB. You can use MongoDB Atlas free tier and put the connection string into .env MONGO_URI.
- The uploaded image (UNZA grading scale) is included at src/assets/unza_scale.jpeg for your reference.


---
ADDITIONAL FEATURES ADDED
- Admin panel UI and backend admin routes (list/delete users)
- Forecast endpoint and dashboard widget to compute required average grade-point and recommended minimal grade
- Deployment helpers: Procfile, render.yaml example, vercel.json, Dockerfile

DEPLOYMENT QUICK GUIDE
1) Backend to Render
   - Create a Git repo and push your project. Replace repo in render.yaml or connect repo on Render dashboard.
   - On Render, create a new Web Service pointing to backend folder, set build/start commands as in render.yaml.
   - Set environment variables (MONGO_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD) in Render dashboard.
2) Frontend to Vercel
   - Create a Vercel project, set root to / (this repo), and use the provided vercel.json.
   - Ensure the frontend build output is served and the backend URL (Render) is used for API calls (change API base URLs in frontend if needed).
3) MongoDB Atlas
   - Create a free cluster on MongoDB Atlas, create a database user, whitelist IPs (or allow anywhere for testing), then copy the connection string into MONGO_URI in Render environment.

SEED ADMIN USER
- To create the preset admin, register with the admin email and password (admin@ricogpa.com / Admin123) on the Register page.

If you want, I can:
- Push this repo to a GitHub repo for you (I will provide the git commands to run locally).
- Walk you through live deployment steps and required environment variable values.
