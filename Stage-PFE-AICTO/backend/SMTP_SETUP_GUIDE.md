# Gmail SMTP Setup Guide for Password Reset

## Step 1: Prepare Your Gmail Account

1. **Sign in to your Gmail account** at https://mail.google.com

2. **Enable 2-Step Verification** (required for App Passwords):
   - Go to https://myaccount.google.com/security
   - Under "Signing in to Google", click on "2-Step Verification"
   - Follow the prompts to enable it
   - Wait a few minutes for it to activate

3. **Generate an App Password**:
   - Go to https://myaccount.google.com/app-passwords
   - Select app: "Mail"
   - Select device: "Other (Custom name)"
   - Enter name: "SARAI Backend"
   - Click "Generate"
   - **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)
   - Remove spaces when putting in `.env` file

## Step 2: Update Backend `.env` File

Edit `backend/.env` and update these lines:

```env
# SMTP Configuration (Gmail)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=your-real-email@gmail.com
SMTP_PASSWORD=abcdefghijklmnop

# Frontend URL (Vite dev server on port 3001)
FRONTEND_URL=http://localhost:3001
```

**Important**:
- `SMTP_EMAIL`: Your actual Gmail address
- `SMTP_PASSWORD`: The 16-character app password (NO spaces)
- `FRONTEND_URL`: Must match your Vite dev server port (3001)

## Step 3: Verify Configuration

Start your backend server:
```bash
cd backend
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Look for these log messages:
```
[EMAIL] SMTP_SERVER: smtp.gmail.com
[EMAIL] SMTP_PORT: 587
[EMAIL] SMTP_EMAIL: your-real-email@gmail.com
[EMAIL] SMTP_PASSWORD configured: True
```

If you see `SMTP_PASSWORD configured: False`, check your `.env` file.

## Step 4: Test Email Sending

### Option A: Using Swagger UI
1. Open http://127.0.0.1:8000/docs
2. Find `POST /api/users/forgot-password`
3. Click "Try it out"
4. Enter a valid email from your database:
   ```json
   {
     "email": "user@example.com"
   }
   ```
5. Click "Execute"
6. Check response (should be 200)
7. Check email inbox (and spam folder)

### Option B: Using curl
```bash
curl -X POST "http://127.0.0.1:8000/api/users/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

## Troubleshooting

### Error: SMTP Authentication Failed
- Verify 2-Step Verification is enabled
- Regenerate App Password
- Make sure no spaces in the password in `.env`

### Error: Connection Timeout
- Check if port 587 is not blocked by firewall
- Try port 465 with SSL instead (would need code change)

### Email in Spam?
- Check spam/junk folder
- Mark as "Not Spam"
- Add sender to contacts

### Still Not Working?
Check backend logs for detailed error messages:
```
[EMAIL] ❌ SMTP Authentication failed! Check email/password.
[EMAIL] ❌ SMTP error: ...
```

## Security Notes

⚠️ **Never commit real credentials to Git!**
- Add `.env` to `.gitignore`
- Use environment variables in production
- Consider using OAuth2 for production instead of App Passwords

## Production Deployment

For production, use environment variables:
```bash
export SMTP_EMAIL="noreply@yourdomain.com"
export SMTP_PASSWORD="your-app-password"
export FRONTEND_URL="https://yourdomain.com"
```

Or use a service like:
- SendGrid
- Mailgun
- AWS SES
- Postmark
