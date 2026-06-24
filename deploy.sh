# ── Deploy PostPilot to Production ──────────────────────
# Usage: ./deploy.sh [env_file]
#   env_file — optional path to .env file with production secrets
#              (default: .env.production)

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[deploy]${NC} $*"; }
warn() { echo -e "${YELLOW}[deploy]${NC} $*"; }
err()  { echo -e "${RED}[deploy]${NC} $*" >&2; }

ENV_FILE="${1:-.env.production}"

# ── Pre-flight checks ────────────────────────────────
if ! command -v docker &>/dev/null; then
  err "Docker is not installed. Install Docker first."
  exit 1
fi

if ! command -v docker-compose &>/dev/null && ! docker compose version &>/dev/null 2>&1; then
  err "docker-compose is not installed."
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  warn "Environment file '$ENV_FILE' not found."
  warn "Creating from .env.example..."
  cp api/.env.example "$ENV_FILE"
  echo ""
  echo "⚠  Edit '$ENV_FILE' with your production secrets (JWT_SECRET, STRIPE keys) before deploying."
  echo "   Then re-run: ./deploy.sh $ENV_FILE"
  exit 1
fi

# ── Build and deploy ─────────────────────────────────
log "Building PostPilot images..."
docker compose --env-file "$ENV_FILE" build --pull

log "Stopping existing containers..."
docker compose --env-file "$ENV_FILE" down --remove-orphans 2>/dev/null || true

log "Starting PostPilot..."
docker compose --env-file "$ENV_FILE" up -d

log "Waiting for health check..."
sleep 5

if docker compose --env-file "$ENV_FILE" ps | grep -q "Up"; then
  log "✅ PostPilot is running!"
  docker compose --env-file "$ENV_FILE" ps
else
  err "❌ PostPilot failed to start. Check logs:"
  docker compose --env-file "$ENV_FILE" logs
  exit 1
fi

# ── Post-deploy info ─────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  PostPilot deployed successfully!"
echo ""
echo "  URL:      http://$(curl -s ifconfig.me 2>/dev/null || echo 'localhost'):3000"
echo "  Health:   http://localhost:3000/api/health"
echo "  Logs:     docker compose logs -f"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"