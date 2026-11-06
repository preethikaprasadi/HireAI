# HireAI – AI-Powered Recruitment Platform

HireAI is a full-stack recruitment management platform designed to simplify and improve the hiring process using AI-powered resume analysis and candidate-job matching. It helps recruiters manage job openings, review applications, analyze candidate profiles, and identify suitable candidates more efficiently.

## 🚀 Key Features

### 👤 Authentication & Role-Based Access
- Secure user authentication and authorization.
- Role-based access for candidates, recruiters, and company owners.
- Company-based membership and access management.

### 📄 Resume Management & AI Analysis
- Upload and manage candidate resumes.
- Extract structured information from resumes.
- Analyze candidate skills, experience, and professional background.

### 🤖 AI-Powered Candidate Matching
- Match candidates with job requirements.
- Evaluate candidates using skill, experience, and role matching.
- Use semantic similarity to assess relevance between candidate profiles and job descriptions.
- Generate overall candidate match scores to support recruitment decisions.

### 💼 Job & Application Management
- Create and manage job vacancies.
- Define required and preferred skills.
- Track applications and candidate progress.
- Review candidate profiles and matching results.

### 🏢 Company & Recruiter Management
- Manage company information and settings.
- Add and manage recruiter memberships.
- Organize departments and recruiter assignments.
- Apply owner-specific administrative permissions.

## 🛠️ Technologies Used

| Category | Technologies |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Backend | Python, FastAPI |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| AI & NLP | Ollama (Qwen3), Sentence Transformers |
| API Documentation | Swagger / OpenAPI |
| Version Control | Git, GitHub |
| Frontend Deployment | Vercel |
| Backend Deployment | Render |

## 🏗️ Project Architecture

```text
HireAI/
│
├── backend/
│   ├── app/
│   │   ├── models/
│   │   ├── routers/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   └── package.json
│
└── README.md
```

## ⚙️ Local Setup

### Prerequisites
- Python
- Node.js and npm
- PostgreSQL
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/preethikaprasadi/HireAI.git
cd HireAI
```

### 2. Backend Setup

```bash
cd backend

python -m venv venv
```

Activate the virtual environment:

**Windows:**
```powershell
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Configure the backend environment variables and PostgreSQL database connection using your local environment configuration.

Start the backend:

```bash
uvicorn app.main:app --reload
```

Backend API documentation:

```text
http://localhost:8000/docs
```

### 3. Frontend Setup

Open another terminal:

```bash
cd frontend

npm install
```

Configure the frontend environment variable:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the frontend:

```bash
npm run dev
```

Open the application:

```text
http://localhost:3000
```

## 🌐 Deployment

HireAI is deployed using:

- **Frontend:** Vercel
- **Backend:** Render
- **Database:** PostgreSQL

The frontend communicates with the deployed FastAPI backend through the configured API URL.

## 🎯 Project Objective

The goal of HireAI is to make recruitment more efficient by combining traditional recruitment management features with AI-powered resume analysis and candidate matching.

The platform demonstrates full-stack software development, REST API development, database management, AI integration, and cloud deployment.

## 👩‍💻 Developer

**Preethika Prasadi**  
Software Engineering Graduate | Full-Stack Developer

- GitHub: [preethikaprasadi](https://github.com/preethikaprasadi)

---

⭐ If you find this project interesting, feel free to explore the repository!
HireAI\backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload

python test_ai_resume.py

HireAI\frontend
npm run dev
