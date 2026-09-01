# YourAuth Account Manager

Standalone React account manager with:

- Direct email/password login
- Direct signup
- JWT storage
- Account dashboard
- Edit profile
- Change password
- Sign out

## Run

```bash
npm install
npm run dev -- --port 5174
```

Open:

http://localhost:5174

## Required backend

Backend URL:

http://localhost:5090

Required endpoints:

### POST /api/auth/signup

Request:

```json
{
  "name": "John",
  "email": "john@example.com",
  "password": "password123"
}
```

Response:

```json
{
  "success": true,
  "token": "JWT_TOKEN",
  "user": {
    "id": "USER_ID",
    "name": "John",
    "email": "john@example.com"
  }
}
```

### POST /api/auth/signin

Request:

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

### GET /api/account/me

Authorization:

Bearer JWT_TOKEN

### PUT /api/account/profile

```json
{
  "name": "New Name"
}
```

### PUT /api/account/password

```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword"
}
```

No API key or client ID is used in this direct account login.
