# PostPilot — Domain Setup Guide

## Option 1: Railway DNS (recommended)

1. Buy a domain from any registrar (Namecheap, Cloudflare, GoDaddy, Porkbun, etc.)
2. In your Railway project → **Settings** → **Domains** → **Custom Domain**
3. Enter your domain (e.g. `postpilot.app`)
4. Railway will show DNS records to add at your registrar:
   - **CNAME** record pointing `www` to your Railway URL
   - Or **A** records pointing to Railway's IPs
5. Add those records at your domain registrar
6. Wait 5-30 mins for DNS propagation
7. Railway auto-provisions SSL (green padlock)

## Option 2: Cloudflare proxy (if using Cloudflare)

1. Add your domain to Cloudflare
2. In Railway → **Settings** → **Domains** → add your domain
3. In Cloudflare DNS:
   - Create a **CNAME** record for `www` → your Railway URL (orange cloud = proxied)
   - Create a **CNAME** flat record for `@` → your Railway URL (orange cloud)
4. SSL/TLS mode → **Full (strict)**

## Recommended domains (if you haven't bought one):
- `postpilot.app` ($12-15/year)
- `postpilot.launch` (premium)
- `usepostpilot.com` ($10-12/year)
- `postpilotai.com` ($10-12/year)