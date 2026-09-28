# Mergington High School Activities API

A super simple FastAPI application that allows students to view and sign up for extracurricular activities.

## Features

- View all available extracurricular activities
- Teachers can register and unregister students after signing in
- Anonymous visitors can view activities and their participant lists

## Getting Started

1. Install the dependencies from the repository root:

   ```
   pip install -r requirements.txt
   ```

2. From the `src` directory, create a local teacher credentials file from the template:

   ```
   cp teachers.example.json teachers.json
   ```

   Generate a password hash (run this from `src`) and add a teacher record to `teachers.json`:

   ```
   python -c "from getpass import getpass; from app import hash_password; print(hash_password(getpass('Teacher password: ')))"
   ```

   ```json
   {
     "teachers": [
       {"username": "teacher1", "password_hash": "paste-generated-hash-here"}
     ]
   }
   ```

   Do not commit `teachers.json` or real passwords. The template contains no accounts.

3. From `src`, set a stable session secret and start the application:

   ```
   export SESSION_SECRET="replace-with-a-long-random-secret"
   uvicorn app:app --reload
   ```

   Keep the same `SESSION_SECRET` across app instances. For HTTPS deployments, also set `SESSION_COOKIE_SECURE=true`.

4. Open your browser and go to:
   - API documentation: http://localhost:8000/docs
   - Alternative documentation: http://localhost:8000/redoc

## API Endpoints

| Method | Endpoint                                                          | Description                                                         |
| ------ | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| GET    | `/activities`                                                     | Get all activities with their details and current participant count |
| GET    | `/auth/status`                                                     | Check whether the current browser has a teacher session              |
| POST   | `/auth/login`                                                      | Sign in with a teacher username and password                         |
| POST   | `/auth/logout`                                                     | Sign out the current teacher session                                 |
| POST   | `/activities/{activity_name}/signup?email=student@mergington.edu` | Teacher-only student registration                                    |
| DELETE | `/activities/{activity_name}/unregister?email=student@mergington.edu` | Teacher-only student removal                                      |

## Data Model

The application uses a simple data model with meaningful identifiers:

1. **Activities** - Uses activity name as identifier:

   - Description
   - Schedule
   - Maximum number of participants allowed
   - List of student emails who are signed up

2. **Students** - Uses email as identifier:
   - Name
   - Grade level

Activity and participant data is stored in memory, which means it resets when the server restarts. Teacher password hashes are stored locally in `teachers.json`; signed sessions last one hour.
