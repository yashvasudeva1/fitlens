#!/usr/bin/env bash
# =============================================================================
# Vultr Cloud Compute Startup Script (User-Data / Cloud-Init) for FitLens
# Paste this entire script into Vultr's "Startup Script" tab when deploying
# a new Cloud Compute instance (Ubuntu 24.04 LTS recommended).
# =============================================================================

set -euxo pipefail

# 1. Update OS and install prerequisites
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y ca-certificates curl gnupg lsb-release ufw git

# 2. Configure UFW Firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp
ufw --force enable

# 3. Install Docker Engine and Docker Compose Plugin
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable docker
systemctl start docker

# 4. Clone FitLens repository into /opt/fitlens
# NOTE: Replace with your repository URL or transfer files
mkdir -p /opt/fitlens
cd /opt/fitlens

# Ensure data directory exists with clean zero-static database
mkdir -p data
echo "[]" > data/prospects_db.json
chmod -R 777 data

# 5. Optional: Provide environment variables if configured in cloud-init
cat <<EOF > .env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
TIGERDATA_DATABASE_URL=YOUR_TIGERDATA_DATABASE_URL_HERE
APP_URL=http://localhost:3000
EOF

# Note: Once code is in /opt/fitlens, start with:
# cd /opt/fitlens && docker compose up -d --build
