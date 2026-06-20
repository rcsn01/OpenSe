#!/usr/bin/env bash

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUPABASE_DIR="$ROOT_DIR/supabase"
SUPABASE_CLI_PACKAGE="${SUPABASE_CLI_PACKAGE:-supabase@2.107.0}"

SEED_FILES=(
  "supabase/seeds/00_cleanup.sql"
  "supabase/seeds/10_auth_users.sql"
  "supabase/seeds/20_public_core.sql"
  "supabase/seeds/30_etl_core.sql"
  "supabase/seeds/40_stoqr_reference_membership.sql"
  "supabase/seeds/50_stoqr_catalog_inventory.sql"
  "supabase/seeds/55_stoqr_reports_demo.sql"
  "supabase/seeds/56_stoqr_procurement_workflows.sql"
  "supabase/seeds/57_open_kb_demo.sql"
  "supabase/seeds/60_admin_audit.sql"
  "supabase/seeds/90_synthetic_volume.sql"
)

print_header() {
  echo -e "${BOLD}${BLUE}----------------------------------------------------------------------${NC}"
  echo -e "${BOLD}${BLUE} OpenSe / StoQR Setup ${NC}"
  echo -e "${BOLD}${BLUE}----------------------------------------------------------------------${NC}"
  echo
}

info() {
  echo -e "${BLUE}>${NC} $*" >&2
}

success() {
  echo -e "${GREEN}[ok]${NC} $*" >&2
}

warn() {
  echo -e "${YELLOW}[!]${NC} $*" >&2
}

fail() {
  echo -e "${RED}[error]${NC} $*" >&2
  exit 1
}

run_supabase() {
  (cd "$ROOT_DIR" && npx --yes "$SUPABASE_CLI_PACKAGE" "$@")
}

run_seed_files() {
  local target="$1"
  local seed_file seed_path

  for seed_file in "${SEED_FILES[@]}"; do
    seed_path="$ROOT_DIR/$seed_file"
    [[ -f "$seed_path" ]] || fail "Missing seed file: $seed_file"
    info "Running $seed_file"
    if [[ "$target" == "remote" ]]; then
      run_supabase db query --linked --file "$seed_path"
    else
      run_supabase db query --local --file "$seed_path"
    fi
  done
}

read_env_value() {
  local key="$1"
  local file line value

  for file in "$ROOT_DIR/.env" "$ROOT_DIR/src/.env" "$SUPABASE_DIR/.env"; do
    if [[ -f "$file" ]]; then
      line="$(grep -E "^${key}=" "$file" | tail -n 1 || true)"
      if [[ -n "$line" ]]; then
        value="${line#*=}"
        value="${value%\"}"
        value="${value#\"}"
        value="${value%\'}"
        value="${value#\'}"
        printf '%s' "$value"
        return 0
      fi
    fi
  done

  return 1
}

infer_project_ref() {
  local ref="${SUPABASE_PROJECT_REF:-}"
  local supabase_url="${SUPABASE_URL:-}"

  if [[ -z "$ref" ]]; then
    ref="$(read_env_value SUPABASE_PROJECT_REF || true)"
  fi

  if [[ -z "$supabase_url" ]]; then
    supabase_url="$(read_env_value VITE_SUPABASE_URL || true)"
  fi

  if [[ -z "$supabase_url" ]]; then
    supabase_url="$(read_env_value SUPABASE_URL || true)"
  fi

  if [[ -z "$ref" && "$supabase_url" =~ ^https://([a-z0-9-]+)\.supabase\.co/?$ ]]; then
    ref="${BASH_REMATCH[1]}"
  fi

  printf '%s' "$ref"
}

generate_token() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  elif command -v uuidgen >/dev/null 2>&1; then
    uuidgen | tr '[:upper:]' '[:lower:]'
  else
    date +%s | shasum -a 256 | awk '{print $1}'
  fi
}

get_dispatch_token() {
  local token="${STOQR_ALERT_DISPATCH_TOKEN:-}"

  if [[ -z "$token" ]]; then
    token="$(read_env_value STOQR_ALERT_DISPATCH_TOKEN || true)"
  fi

  token="$(printf '%s' "$token" | tr -d '\r\n[:space:]')"

  if [[ -z "$token" || ! "$token" =~ ^[A-Za-z0-9._~:-]{16,128}$ ]]; then
    token="$(generate_token)"
    warn "Generated a clean alert dispatch token for this setup run."
  fi

  printf '%s' "$token"
}

choose_target() {
  echo "Choose database target:" >&2
  echo "  1) Linked remote Supabase project" >&2
  echo "  2) Local Supabase database" >&2
  echo >&2
  read -r -p "Target [1]: " target_choice
  target_choice="${target_choice:-1}"

  case "$target_choice" in
    1) printf '%s' "remote" ;;
    2) printf '%s' "local" ;;
    *) fail "Unknown target: $target_choice" ;;
  esac
}

confirm_destructive_reset() {
  local target="$1"

  warn "Full reset will drop and recreate the ${target} database without inserting seed data."
  read -r -p "Type RESET to continue: " confirmation
  if [[ "$confirmation" != "RESET" ]]; then
    fail "Reset cancelled."
  fi
}

deploy_alert_functions() {
  local project_ref="$1"
  local token="$2"

  info "Configuring alert dispatch Edge Function secrets..."
  run_supabase secrets set \
    "STOQR_ALERT_DISPATCH_TOKEN=$token" \
    "ALERT_EMAIL_DISPATCH_TOKEN=$token" \
    --project-ref "$project_ref"
  success "Alert dispatch secrets configured."

  info "Deploying alert Edge Functions..."
  run_supabase functions deploy send-stoqr-alert-notifications --project-ref "$project_ref" --use-api
  run_supabase functions deploy manage-stoqr-alert-connectors --project-ref "$project_ref" --use-api
  if [[ -d "$SUPABASE_DIR/functions/send-stoqr-alert-emails" ]]; then
    run_supabase functions deploy send-stoqr-alert-emails --project-ref "$project_ref" --use-api
  fi
  success "Alert Edge Functions deployed."
}

configure_alert_dispatch() {
  local target="$1"
  local token="$2"
  local project_ref="${3:-}"
  local function_url=""
  local sql
  local supabase_url

  if [[ "$target" == "remote" ]]; then
    if [[ -z "$project_ref" ]]; then
      supabase_url="$(read_env_value VITE_SUPABASE_URL || true)"
      if [[ -z "$supabase_url" ]]; then
        supabase_url="$(read_env_value SUPABASE_URL || true)"
      fi
      if [[ "$supabase_url" =~ ^https://([a-z0-9-]+)\.supabase\.co/?$ ]]; then
        project_ref="${BASH_REMATCH[1]}"
      fi
    fi

    if [[ -z "$project_ref" ]]; then
      read -r -p "Supabase project ref (or press Enter to provide a full function URL): " project_ref
      if [[ -z "$project_ref" ]]; then
        read -r -p "Full Edge Function URL: " function_url
        [[ -n "$function_url" ]] || fail "A function URL is required for remote runtime config."
      fi
    fi

    if [[ -z "$function_url" && -n "$project_ref" ]]; then
      function_url="https://${project_ref}.functions.supabase.co/send-stoqr-alert-notifications"
    fi
  else
    function_url="http://host.docker.internal:54321/functions/v1/send-stoqr-alert-notifications"
  fi



  sql="INSERT INTO stoqr.alert_dispatch_config (singleton, function_url, dispatch_token)
VALUES (true, '${function_url}', '${token}')
ON CONFLICT (singleton) DO UPDATE
SET function_url = EXCLUDED.function_url,
    dispatch_token = EXCLUDED.dispatch_token,
    updated_at = timezone('utc'::text, now());"

  info "Configuring database low-stock alert dispatch endpoint..."
  if [[ "$target" == "remote" ]]; then
    run_supabase db query --linked "$sql"
  else
    run_supabase db query "$sql"
  fi
  success "Low-stock alert dispatch endpoint configured."

  if [[ "$target" == "local" ]]; then
    warn "For local dispatch, keep functions running with: npx supabase functions serve"
  fi
}

setup_runtime_config() {
  local app config_dir config_file
  local supabase_url anon_key cookie_domain
  local accounts_url etl_url open_kb_url opense_url stoqr_url ui_url

  prompt_or_env() {
    local key="$1"
    local value
    value="$(read_env_value "$key" || true)"
    if [[ -z "$value" ]]; then
      read -r -p "Enter ${key}: " value
    fi
    printf '%s' "$value"
  }

  supabase_url="$(prompt_or_env VITE_SUPABASE_URL)"
  anon_key="$(prompt_or_env VITE_SUPABASE_ANON_KEY)"
  cookie_domain="$(prompt_or_env VITE_AUTH_COOKIE_DOMAIN)"
  accounts_url="$(prompt_or_env VITE_ACCOUNTS_URL)"
  etl_url="$(prompt_or_env VITE_ETL_PUBLIC_URL)"
  open_kb_url="$(prompt_or_env VITE_OPEN_KB_PUBLIC_URL)"
  opense_url="$(prompt_or_env VITE_OPENSE_PUBLIC_URL)"
  stoqr_url="$(prompt_or_env VITE_STOQR_PUBLIC_URL)"
  ui_url="$(prompt_or_env VITE_UI_PUBLIC_URL)"

  [[ -n "$supabase_url" ]] || fail "VITE_SUPABASE_URL is required."
  [[ -n "$anon_key" ]] || fail "VITE_SUPABASE_ANON_KEY is required."

  info "Writing runtime config.js files for frontend containers..."

  for app in accounts etl open-kb opense stoqr ui-design; do
    config_dir="$ROOT_DIR/src/apps/${app}/public"
    config_file="$config_dir/config.js"

    mkdir -p "$config_dir"

    cat > "$config_file" <<EOF
window.__OPENSE_CONFIG__ = {
  VITE_SUPABASE_URL: '${supabase_url}',
  VITE_SUPABASE_ANON_KEY: '${anon_key}',
  VITE_AUTH_COOKIE_DOMAIN: '${cookie_domain}',
  VITE_ACCOUNTS_URL: '${accounts_url}',
  VITE_ETL_PUBLIC_URL: '${etl_url}',
  VITE_OPEN_KB_PUBLIC_URL: '${open_kb_url}',
  VITE_OPENSE_PUBLIC_URL: '${opense_url}',
  VITE_STOQR_PUBLIC_URL: '${stoqr_url}',
  VITE_UI_PUBLIC_URL: '${ui_url}',
};
EOF

    success "Wrote $config_file"
  done
}


full_reset() {
  local seed_after_reset="${1:-false}"
  local target project_ref token

  target="$(choose_target)"
  if [[ "$seed_after_reset" == "true" ]]; then
    warn "Full reset will drop and recreate the ${target} database, then insert demo seed data."
    read -r -p "Type RESET SEED to continue: " confirmation
    if [[ "$confirmation" != "RESET SEED" ]]; then
      fail "Reset cancelled."
    fi
  else
    confirm_destructive_reset "$target"
  fi
  token="$(get_dispatch_token)"

  if [[ "$target" == "remote" ]]; then
    project_ref="$(infer_project_ref)"
    if [[ -z "$project_ref" ]]; then
      read -r -p "Supabase project ref: " project_ref
    fi
    [[ -n "$project_ref" ]] || fail "Supabase project ref is required for remote reset."

    deploy_alert_functions "$project_ref" "$token"

    info "Resetting linked remote database..."
    run_supabase db reset --linked --yes
    success "Linked remote database reset without auto-seeding."

    configure_alert_dispatch "$target" "$token" "$project_ref"
  else
    info "Resetting local database..."
    run_supabase db reset --yes
    success "Local database reset without auto-seeding."

    configure_alert_dispatch "$target" "$token"
  fi

  if [[ "$seed_after_reset" == "true" ]]; then
    info "Inserting seed data..."
    run_seed_files "$target"
    success "Seed data inserted. Login with founder@gmail.com / !Password1."
  fi
}

insert_seed_data() {
  local target

  target="$(choose_target)"
  warn "Seed insertion runs the seed files in order. The first seed file cleans existing seeded rows."
  read -r -p "Type SEED to continue: " confirmation
  if [[ "$confirmation" != "SEED" ]]; then
    fail "Seed insertion cancelled."
  fi

  run_seed_files "$target"

  success "Seed data inserted. Login with founder@gmail.com / !Password1."
}

main_menu() {
  print_header
  echo "Database targets:"
  echo "  Remote: linked Supabase project"
  echo "  Local: local Supabase Docker database"
  echo
  echo "Select an action:"
  echo "  1) Full reset + seed data (remote also deploys alert Edge Functions)"
  echo "  2) Full reset schema only"
  echo "  3) Insert DB seed data only"
  echo "  4) Setup frontend runtime config (config.js files)"
  echo "  5) Exit"
  echo
  read -r -p "Action [1]: " action
  action="${action:-1}"

  case "$action" in
    1) full_reset true ;;
    2) full_reset false ;;
    3) insert_seed_data ;;
    4) setup_runtime_config ;;
    5) exit 0 ;;
    *) fail "Unknown action: $action" ;;
  esac
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main_menu
fi
