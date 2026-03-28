# RICOGPA

A full-stack GPA calculator and academic progress tracker for university students.

## Tech Stack

- **Frontend:** React, React Router, Axios
- **Backend:** Node.js, Express, JWT
- **Database:** MongoDB

## Project Structure

```
ricogpa/
  server/          # Express API
  client/          # React app
```

## Setup & Run

### Prerequisites

- Node.js v16+
- MongoDB running locally (or a MongoDB Atlas URI)

### 1. Clone and enter the project

```bash
cd RicoGPA
```

### 2. Setup the backend

```bash
cd server
cp .env.example .env
# Edit .env with your MongoDB URI and a JWT secret
npm install
npm run dev
```

The server runs at `http://localhost:5000`.

### 3. Setup the frontend

Open a new terminal:

```bash
cd client
cp .env.example .env
npm install
npm start
```

The app runs at `http://localhost:3000`.

## Environment Variables

### Server (.env)

| Variable     | Description                    | Example                              |
|-------------|--------------------------------|--------------------------------------|
| PORT        | Server port                    | 5000                                 |
| MONGO_URI   | MongoDB connection string      | mongodb://localhost:27017/ricogpa     |
| JWT_SECRET  | Secret key for JWT tokens      | any-random-string-here               |

### Client (.env)

| Variable           | Description       | Example                  |
|-------------------|-------------------|--------------------------|
| REACT_APP_API_URL | Backend API URL   | http://localhost:5000    |

## API Endpoints

| Method | Route                | Auth | Description          |
|--------|----------------------|------|----------------------|
| POST   | /api/auth/register   | No   | Register new user    |
| POST   | /api/auth/login      | No   | Login                |
| GET    | /api/gpa/me          | Yes  | Dashboard summary    |
| GET    | /api/gpa/courses     | Yes  | List all courses     |
| POST   | /api/gpa/add-course  | Yes  | Add a course         |
| DELETE | /api/gpa/course/:id  | Yes  | Delete a course      |
| GET    | /api/gpa/forecast    | Yes  | GPA forecast         |

## Grade Mapping

| Grade | Points |
|-------|--------|
| A+    | 5.0    |
| A     | 5.0    |
| B+    | 4.0    |
| B     | 3.0    |
| C+    | 2.0    |
| C     | 1.0    |
| D     | 0.5    |
| F     | 0.0    |

Edit `server/utils/gradeMap.js` to change the scale.

## Testing Checklist

- [ ] Register a new account
- [ ] Login with the account
- [ ] See empty dashboard
- [ ] Add a course (e.g., "Math 101", Year 1, Full, 3 credits, A)
- [ ] Dashboard shows updated GPA, credits, and course count
- [ ] Add more courses across different years
- [ ] Courses page shows all courses grouped by year
- [ ] Delete a course and verify GPA recalculates
- [ ] Forecast page: select "Distinction" with 60 remaining credits
- [ ] Forecast shows current GPA, target, needed GPA, and advice
- [ ] Logout and verify redirect to login
- [ ] Try accessing dashboard URL without login (should redirect)

## Assumptions Made

1. **Grade scale:** Uses UNZA-style 5-point scale as specified
2. **Forecast remaining credits:** Defaults to 60 if not specified; user can change the value
3. **Course types:** "Full" and "Half" are labels only — credit hours are entered manually
4. **No email verification:** MVP does not verify email addresses
5. **Single user sessions:** No refresh token rotation; JWT expires in 7 days
6. **MongoDB local:** Default setup assumes MongoDB running locally
7. **Classification thresholds:** Distinction >= 4.0, Merit >= 3.0, Credit >= 2.0, Pass >= 1.0
