# Student Placement & Internship Portal

A full-stack web application designed to help students discover internship and job opportunities, manage their profiles, apply for opportunities, and track application progress. Administrators can manage opportunities and student applications through a dedicated dashboard.

## Features

### Student
- Student registration and login
- Secure authentication using JWT
- View and update student profile
- Browse available internships and jobs
- View opportunity details and eligibility criteria
- Apply for opportunities
- Track application status

### Administrator
- Secure admin login
- Create and manage placement opportunities
- View student applications
- Update application statuses
- Manage recruitment opportunities

## Technology Stack

**Frontend**
- HTML5
- CSS3
- JavaScript (Vanilla JavaScript)

**Backend**
- Node.js
- Express.js

**Database**
- MongoDB
- Mongoose

**Authentication & Security**
- JSON Web Tokens (JWT)
- bcryptjs

## Project Structure

```text
Student-Placement-Portal/
│
├── client/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── admin.js
│   │   ├── api.js
│   │   ├── applications.js
│   │   ├── auth.js
│   │   ├── dashboard.js
│   │   ├── opportunities.js
│   │   └── profile.js
│   ├── admin.html
│   ├── applications.html
│   ├── dashboard.html
│   ├── index.html
│   ├── opportunities.html
│   └── profile.html
│
├── server/
│   ├── config/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── scripts/
│   └── server.js
│
├── .env.example
├── .gitignore
├── package.json
└── package-lock.json
```

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/pranaycharde01/Student-Placement-Portal.git
```

### 2. Open the project directory

```bash
cd Student-Placement-Portal
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

Create a `.env` file in the project root using `.env.example` as a reference.

Add your own configuration:

```env
PORT=5000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5000

MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key

ADMIN_NAME=Your Admin Name
ADMIN_EMAIL=your_admin_email
ADMIN_PASSWORD=your_secure_admin_password
```

Replace the sample values with your actual configuration. Never upload your `.env` file to GitHub.

### 5. Start the application

```bash
npm run dev
```

### 6. Open in your browser

```text
http://localhost:5000
```

## Application Pages

| Page | Description |
|---|---|
| Login / Registration | Student authentication |
| Dashboard | Student dashboard |
| Profile | Manage student information |
| Opportunities | Browse internships and jobs |
| Applications | Track submitted applications |
| Admin Dashboard | Manage opportunities and applications |

## Application Statuses

- Submitted
- Under Review
- Shortlisted
- Rejected
- Selected

## Future Enhancements

- Resume upload functionality
- Email notifications
- Advanced opportunity filtering
- Placement analytics and reports
- Online deployment

## Author

**Pranay Charde**

- GitHub: https://github.com/pranaycharde01
- LinkedIn: https://linkedin.com/in/pranay-charde-61680427a/

## License

This project is developed for educational and learning purposes.