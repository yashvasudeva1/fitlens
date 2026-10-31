# FitLens Deployment Guide for Vultr Cloud

This guide provides end-to-end instructions for deploying the **FitLens IOMETE Account Fit Analyzer** on **Vultr Cloud Compute (VPS)** or **Vultr Container Engine**.

---

## Architecture Overview

- **Frontend**: React 19 + Tailwind CSS + Lucide Icons (compiled to static SPA assets in `dist/`).
- **Backend**: Express + Google GenAI SDK (bundled with esbuild into a high-performance, single-file ESM server in `dist-server/server.js`).
- **Persistent Data**: Zero static mock data. CRM prospect database is stored on disk at `data/prospects_db.json` and mounted via Docker volume for seamless persistence across container upgrades.
- **Port**: Listens on port `3000` (or custom `$PORT`).
- **Health Check**: Automated health probe at `GET /health`.

---

## Zero-Static Data Assurance

FitLens is configured with **zero static mock data**:
1. `data/prospects_db.json` starts as an empty JSON array (`[]`).
2. The server (`server.ts`) initializes with empty records and **never auto-seeds** mock or sample companies.
3. The live editor starts clean, allowing users to:
   - Type or paste an account specification.
   - Upload any `.md` or `.txt` file.
   - Click **Load 7-Section Skeleton Template** for a blank specification schema.
   - Execute **Stage 0 Live Web Research** powered by Gemini with Google Search Grounding to research any real organization in real-time.
4. The CRM Prospect Database table shows an empty state until accounts are analyzed or saved.

---

## 1. Sizing & Provisioning on Vultr

### Recommended Server Specs
- **Server Type**: Cloud Compute (Regular Performance or High Performance).
- **Location**: Choose any region close to your target users (e.g., Frankfurt, Amsterdam, New York, Silicon Valley).
- **Operating System**: **Ubuntu 24.04 LTS x64** (or Ubuntu 22.04 LTS).
- **Plan**:
  - Minimum: 1 vCPU, 1 GB RAM ($6.00/month)
  - **Recommended**: 1 vCPU, 2 GB RAM ($10.00 - $12.00/month)
- **SSH Keys**: Add your public SSH key for passwordless login.
- **Firewall Group**: Enable ports:
  - `22` (SSH)
  - `80` (HTTP)
  - `443` (HTTPS)
  - `3000` (Direct FitLens test port, optional if using Nginx)

---

## 2. Deployment Method A: Docker & Docker Compose (Recommended)

Docker Compose provides container isolation, automated healthchecks, volume persistence, and one-command upgrades.

### Step 1: Connect to your Vultr Instance
```bash
ssh root@<YOUR_VULTR_SERVER_IP>
```

### Step 2: Clone or Copy Your Codebase
```bash
git clone <YOUR_GIT_REPO_URL> /opt/fitlens
cd /opt/fitlens
```
*(Or transfer files directly via `rsync` or `scp`)*

### Step 3: Run the Automated Deployment Script
```bash
chmod +x deploy/vultr-deploy.sh
./deploy/vultr-deploy.sh
```

The script will automatically:
- Install Docker & Docker Compose Plugin (if not present).
- Configure UFW firewall rules.
- Prepare the `data/` directory with an empty database.
- Build the multi-stage production container.
- Launch the application with `restart: unless-stopped`.
- Verify the `/health` endpoint responds `200 OK`.

### Step 4: Configure Your Gemini API Key
Edit the `.env` file to add your API key from Google AI Studio:
```bash
nano .env
```
Set:
```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
GEMINI_API_KEY=AIzaSy...your_actual_key_here...
APP_URL=https://your-domain.com
```

Apply the changes:
```bash
docker compose up -d
```

### Step 5: Verify Deployment
Check container status and logs:
```bash
docker compose ps
docker compose logs -f
curl http://127.0.0.1:3000/health
```

---

## 3. Deployment Method B: Native Node.js & Systemd Service

If you prefer to run directly on the host operating system without Docker:

### Step 1: Install Node.js 22 LTS
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x  sudo -E bash -
sudo apt-get install -y nodejs
```

### Step 2: Install Project Dependencies and Build
```bash
cd /opt/fitlens
npm ci
npm run build
```

### Step 3: Create a Dedicated System User
```bash
sudo useradd -r -s /bin/false fitlens  true
sudo chown -R fitlens:fitlens /opt/fitlens
sudo chmod 775 /opt/fitlens/data
```

### Step 4: Install and Start Systemd Service
```bash
sudo cp deploy/systemd/fitlens.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable fitlens
sudo systemctl start fitlens
```

### Step 5: Check Status
```bash
sudo systemctl status fitlens
journalctl -u fitlens -f
```

---

## 4. Setting Up Domain Name, Nginx Reverse Proxy & SSL (HTTPS)

To serve FitLens securely on a custom domain (e.g., `fitlens.yourdomain.com`) over port 80/443 with automated Let's Encrypt SSL:

### Step 1: Point your Domain DNS
In your DNS provider (e.g., Cloudflare, Namecheap, Vultr DNS), create an **A record**:
```
fitlens.yourdomain.com  ->  <YOUR_VULTR_SERVER_IP>
```

### Step 2: Install Nginx and Certbot
```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

### Step 3: Configure Nginx
Copy the pre-configured Nginx template:
```bash
sudo cp deploy/nginx/fitlens.conf /etc/nginx/sites-available/fitlens.conf
```

Edit the file and replace `fitlens.yourdomain.com` with your actual domain:
```bash
sudo nano /etc/nginx/sites-available/fitlens.conf
```

Enable the site and test Nginx configuration:
```bash
sudo ln -sf /etc/nginx/sites-available/fitlens.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### Step 4: Issue Free SSL Certificate with Let's Encrypt
```bash
sudo certbot --nginx -d fitlens.yourdomain.com
```
Certbot will obtain the certificate, configure HTTPS, and set up automated renewal cron jobs.

---

## 5. Persistent Storage & TigerData Integration

FitLens supports dual-mode persistence:
1. **TigerData (Tiger Cloud PostgreSQL)** *(Recommended for production multi-node / cloud deployment)*:
   - Stores prospects, qualification results, and audit trails in TigerData cloud PostgreSQL.
   - Provides automated backups, TLS encryption in transit, and high availability.
   - Simply set `TIGERDATA_DATABASE_URL` in your `.env`. FitLens will auto-migrate the database tables upon startup.
2. **Local Disk (`data/prospects_db.json`)**:
   - If `TIGERDATA_DATABASE_URL` is omitted, FitLens automatically stores prospects in `data/prospects_db.json`.

### How to Connect TigerData:
1. Create a service in the [TigerData Cloud Console](https://console.cloud.tigerdata.com).
2. Copy your PostgreSQL connection URI:
   ```
   postgres://tsdbadmin:YOUR_PASSWORD@your-host.tigerdata.cloud:5432/tsdb?sslmode=require
   ```
3. Add it to your `.env` on your Vultr server:
   ```bash
   TIGERDATA_DATABASE_URL="postgres://tsdbadmin:YOUR_PASSWORD@your-host.tigerdata.cloud:5432/tsdb?sslmode=require"
   ```
4. Restart FitLens:
   ```bash
   docker compose up -d
   ```
5. Check health status:
   ```bash
   curl http://localhost:3000/health
   ```
   You will see `"database": { "backend": "tigerdata", "connected": true }`.

---

## 6. Local Disk Backups (When Not Using TigerData)

If you are using the local JSON disk storage instead of TigerData:
The prospect CRM database is stored in:
```
/opt/fitlens/data/prospects_db.json
```

### Automated Nightly Backup (Cron)
Add a simple backup cron to preserve database records:
```bash
sudo crontab -e
```
Add the following line to backup daily at 3:00 AM:
```cron
0 3 * * * cp /opt/fitlens/data/prospects_db.json /opt/fitlens/data/prospects_backup_$(date +\%F).json
```

---

## 6. Updating the Application (Zero Downtime)

When you make changes or push updates to your repository:

### For Docker Compose Deployment:
```bash
cd /opt/fitlens
git pull
docker compose build --pull
docker compose up -d
```
Docker will rebuild the container in the background, recreate the running instance, and preserve your mounted `data/` folder.

### For Systemd Deployment:
```bash
cd /opt/fitlens
git pull
npm ci
npm run build
sudo systemctl restart fitlens
```

---

## 7. Useful Operational Commands

 Action  Docker Command  Systemd Command 
 :---  :---  :--- 
 **Check Status**  `docker compose ps`  `sudo systemctl status fitlens` 
 **View Live Logs**  `docker compose logs -f --tail=100`  `journalctl -u fitlens -f` 
 **Restart Service**  `docker compose restart`  `sudo systemctl restart fitlens` 
 **Health Probe**  `curl http://localhost:3000/health`  `curl http://localhost:3000/health` 
 **Inspect CRM DB**  `cat data/prospects_db.json`  `cat data/prospects_db.json` 
