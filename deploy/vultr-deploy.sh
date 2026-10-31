#!/usr/bin/env bash
# =============================================================================
# Automated Vultr VPS Deployment Script for FitLens
# Tested on Ubuntu 22.04 / 24.04 LTS on Vultr Cloud Compute
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}       FitLens Vultr VPS Deployment Script          ${NC}"
echo -e "${BLUE}====================================================${NC}"

# 1. Check Root / Sudo
if [[ $EUID -ne 0 ]]; then
   echo -e "${YELLOW}Notice: This script should be run as root or with sudo.${NC}"
fi

# 2. Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker not found. Installing Docker & Docker Compose...${NC}"
    apt-get update -y
    apt-get install -y ca-certificates curl gnupg lsb-release ufw

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
    echo -e "${GREEN}Docker installed successfully.${NC}"
fi

# 3. Configure Firewall (UFW)
echo -e "${BLUE}Configuring UFW Firewall for Ports 22, 80, 443, and 3000...${NC}"
ufw allow OpenSSH || ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp
ufw --force enable || true

# 4. Check .env configuration
if [[ ! -f .env ]]; then
    if [[ -f .env.example ]]; then
        echo -e "${YELLOW}Creating .env from .env.example...${NC}"
        cp .env.example .env
        echo -e "${YELLOW}PLEASE NOTE: Edit .env to set your GEMINI_API_KEY!${NC}"
    else
        echo -e "${YELLOW}Creating minimal .env...${NC}"
        cat <<EOF > .env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
GEMINI_API_KEY=
TIGERDATA_DATABASE_URL=
APP_URL=http://localhost:3000
EOF
    fi
fi

# 5. Ensure data directory exists with clean zero-static database
mkdir -p data
if [[ ! -f data/prospects_db.json ]] || [[ ! -s data/prospects_db.json ]]; then
    echo "[]" > data/prospects_db.json
fi
chmod 777 data data/prospects_db.json

# 6. Build and launch container using Docker Compose
echo -e "${BLUE}Building and starting FitLens container...${NC}"
docker compose down || true
docker compose build --pull
docker compose up -d

# 7. Health check verification
echo -e "${BLUE}Waiting for service to become healthy...${NC}"
sleep 5

MAX_RETRIES=10
RETRY_COUNT=0
HEALTH_URL="http://127.0.0.1:3000/health"

while [[ $RETRY_COUNT -lt $MAX_RETRIES ]]; do
    if curl -s -f "$HEALTH_URL" > /dev/null; then
        echo -e "${GREEN}====================================================${NC}"
        echo -e "${GREEN}  ✓ FitLens is RUNNING and HEALTHY on port 3000!   ${NC}"
        echo -e "${GREEN}====================================================${NC}"
        echo -e "Health response: $(curl -s $HEALTH_URL)"
        echo -e "Access your application at: http://$(curl -s ifconfig.me || echo 'your-server-ip'):3000"
        exit 0
    fi
    echo -e "${YELLOW}Checking health (attempt $((RETRY_COUNT+1))/$MAX_RETRIES)...${NC}"
    sleep 3
    RETRY_COUNT=$((RETRY_COUNT+1))
done

echo -e "${RED}Health check failed. Check container logs with: docker compose logs${NC}"
exit 1
