# Forgot Password - Testing Checklist

## Pre-Testing Setup

1. **Update Gmail Credentials in `backend/.env`**:
   - [ ] `SMTP_EMAIL` = your actual Gmail address
   - [ ] `SMTP_PASSWORD` = 16-char App Password (no spaces)
   - [ ] `FRONTEND_URL` = `http://localhost:3001`

2. **Start Backend Server**:
   ```bash
   cd backend
   uvicorn main:app --reload --host 127.0.0.1 --port 8000
   ```
   - [ ] Check logs show: `[EMAIL] SMTP_PASSWORD configured: True`
   - [ ] Check no import errors

3. **Start Frontend Dev Server**:
   ```bash
   cd frontend
   npm run dev
   ```
   - [ ] Vite running on `http://localhost:3001`

---

## Test 1: Swagger UI (Backend Direct)

**URL**: http://127.0.0.1:8000/docs

1. Find `POST /api/users/forgot-password`
2. Click "Try it out"
3. Enter email of existing user:
   ```json
   {"email": "existing-user@gmail.com"}
   ```
4. Click "Execute"
5. **Expected Results**:
   - [ ] Status: 200
   - [ ] Response: `{"message": "If the email exists, a password reset link has been sent."}`
   - [ ] Backend log: `[FORGOT] User found: ...`
   - [ ] Backend log: `[EMAIL] ✅ Reset email sent successfully`
   - [ ] Email received in inbox (check spam too!)

6. Test with NON-existing email:
   ```json
   {"email": "fake-user@notreal.com"}
   ```
7. **Expected Results**:
   - [ ] Status: 200 (still success - security)
   - [ ] Response same message
   - [ ] Backend log: `[FORGOT] No user found with that email`
   - [ ] No email sent (obviously)

---

## Test 2: Postman (CORS Preflight Check)

**Request**:
- Method: `POST`
- URL: `http://127.0.0.1:8000/api/users/forgot-password`
- Headers:
  - `Content-Type: application/json`
- Body (raw JSON):
  ```json
  {"email": "test@example.com"}
  ```

**Expected Results**:
- [ ] Status: 200 OK
- [ ] CORS headers present:
  - `Access-Control-Allow-Origin: http://localhost:3001`
  - `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH`
- [ ] Email received

---

## Test 3: Browser Frontend

1. Open `http://localhost:3001/forgot-password.html`
2. **Visual Check**:
   - [ ] Page loads correctly
   - [ ] Email input field visible
   - [ ] "Send Reset Link" button visible

3. **Validation Tests**:
   - [ ] Empty submit → "Please enter your email address."
   - [ ] Invalid email (no @) → "Please enter a valid email address."
   - [ ] Invalid email (no domain) → error message

4. **Successful Submit**:
   - [ ] Loading spinner appears
   - [ ] Button disabled during request
   - [ ] Success message: "Check your email! A password reset link..."
   - [ ] Email field disabled after success
   - [ ] Button hidden after success

5. **Check Email**:
   - [ ] Email received within 1-2 minutes
   - [ ] Subject: "Reset Your Password - Regional AI Repository"
   - [ ] "Reset Password" button is clickable
   - [ ] Link goes to: `http://localhost:3001/reset-password.html?token=...`

---

## Test 4: Complete Flow (End-to-End)

1. **Request Reset**:
   - [ ] Go to `http://localhost:3001/forgot-password.html`
   - [ ] Enter registered email
   - [ ] Click "Send Reset Link"
   - [ ] Receive success message

2. **Check Email & Click Link**:
   - [ ] Open email
   - [ ] Click "Reset Password" button
   - [ ] Redirected to `http://localhost:3001/reset-password.html?token=...`

3. **Reset Password**:
   - [ ] Token auto-filled (if implemented) or visible in URL
   - [ ] Enter new password (8+ chars, upper, lower, digit)
   - [ ] Confirm password
   - [ ] Submit
   - [ ] Success message
   - [ ] Redirected to login page

4. **Verify New Password Works**:
   - [ ] Go to `http://localhost:3001/auth.html`
   - [ ] Login with new password
   - [ ] Successfully logged in

---

## Test 5: Error Scenarios

1. **Expired Token**:
   - [ ] Wait 16+ minutes after request
   - [ ] Try to use reset link
   - [ ] Error: "Invalid or expired reset token"

2. **Invalid Token**:
   - [ ] Go to `http://localhost:3001/reset-password.html?token=invalid123`
   - [ ] Try to reset password
   - [ ] Error: "Invalid or expired reset token"

3. **Already Used Token**:
   - [ ] Use token from previous successful reset
   - [ ] Try to reset again
   - [ ] Error: "Invalid or expired reset token"

---

## Debugging Tips

### Backend Logs to Watch For:
```
[FORGOT] === START === Email: ...
[FORGOT] User found: ...
[FORGOT] Token saved: ...
[EMAIL] Sending reset email to ...
[EMAIL] ✅ Reset email sent successfully
```

### If Email Not Received:
1. Check spam/junk folder
2. Verify SMTP credentials in `.env`
3. Check backend logs for SMTP errors
4. Try with a different email provider

### If CORS Error:
1. Check browser console (F12)
2. Verify `CORS_ORIGINS` in `main.py`
3. Make sure frontend URL matches exactly
4. Try incognito mode (no extension interference)

### If 500 Error:
1. Check backend terminal for traceback
2. Verify database connection
3. Check `reset_token` column exists in users table
4. Run migration if needed: `python migrate_add_reset_token.py`

---

## Quick Commands

**Check if backend is running**:
```bash
curl http://127.0.0.1:8000/health
```

**Test forgot-password endpoint**:
```bash
curl -X POST "http://127.0.0.1:8000/api/users/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

**Check database for reset token**:
```sql
SELECT email, reset_token, reset_token_expiry FROM users WHERE email='test@example.com';
```

---

## Success Criteria

- [ ] Forgot password email sends successfully
- [ ] Email arrives within 2 minutes
- [ ] Reset link works correctly
- [ ] Password can be reset
- [ ] New password works for login
- [ ] No CORS errors in browser console
- [ ] All error scenarios handled gracefully
