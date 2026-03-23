# Replix Backend

AI reply generation server for the Replix Chrome extension.

## Environment Variables (set in Railway)

- `ANTHROPIC_API_KEY` — Your Anthropic API key
- `PREMIUM_SECRET` — A secret string for premium users (make up any random string)
- `PORT` — Set automatically by Railway

## Deploy to Railway

1. Push this code to GitHub
2. Connect repo to Railway
3. Add environment variables
4. Deploy!

## Endpoints

- `GET /` — Health check
- `POST /generate` — Generate a reply
- `GET /usage/:userId` — Check usage
