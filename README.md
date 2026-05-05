# Online Examination System

Full-stack real-time online examination website with:
- Admin: login, question bank (add/edit/delete), create exams with timer, view results, download CSV reports.
- Student: register, login, view available exams, start exam, answer questions, submit, view results.
- Features: authentication, question bank, exam creation, timer, auto-submission, result calculation.
- Question types: MCQ, passage-based, true/false, match-the-following.

## Tech Stack
- Frontend: React (Vite)
- Backend: Node.js + Express + Socket.IO
- Storage: JSON file (`backend/data.json`) for easy setup

## Project Structure
- `frontend/`
- `backend/`

## Run Backend
```bash
cd backend
npm install
npm run dev
```

Backend URL: `http://localhost:5000`

Create `backend/.env` from `backend/.env.example` before starting the backend.

Default admin credentials:
- Email: `admin@exam.com`
- Password: `admin123`

## Run Frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

## Team Setup
- This project now uses MongoDB Atlas. All teammates must point `backend/.env` to the same Atlas database if they want to see the same modules, topics, questions, and exams.
- Do not commit `backend/.env` to GitHub. Share the values separately and let each teammate create their own local `.env`.
- Recommended shared backend env values:

```env
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@cluster0.example.mongodb.net/online_exam?retryWrites=true&w=majority&appName=Cluster0
PORT=5000
JWT_SECRET=replace_with_a_shared_team_secret
```

- Atlas checklist for teammates:
- Add the teammate IP in Atlas Network Access, or use `0.0.0.0/0` only for temporary development.
- Confirm everyone is using the same database name, such as `online_exam`.
- Import question CSV files after creating the matching module and topic in the shared database.

## Importing CSV Questions
Run imports from the `backend` folder:

```bash
npm run import:csv -- ./src/imports/aptitude/profit-and-loss-25.csv
```

Repeat for any other CSV in `backend/src/imports/`.

## Main APIs
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET/POST/PUT/DELETE /api/admin/questions`
- `GET/POST/PUT /api/admin/exams`
- `GET /api/admin/results`
- `GET /api/admin/reports/:examId`
- `GET /api/student/exams`
- `POST /api/student/exams/:examId/start`
- `GET /api/student/attempts/:attemptId`
- `PATCH /api/student/attempts/:attemptId/answers`
- `POST /api/student/attempts/:attemptId/submit`
- `GET /api/student/results`

## Real-Time Behavior
- `Socket.IO` emits `result:submitted` when any attempt is submitted.
- Admin dashboard listens and shows live submissions.
- Server auto-submits expired in-progress attempts every 5 seconds.
"# OnlineExa" 
