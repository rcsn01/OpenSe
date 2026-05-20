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

SEED_FILES=(
  "supabase/seeds/00_cleanup.sql"
  "supabase/seeds/10_auth_users.sql"
  "supabase/seeds/20_public_core.sql"
  "supabase/seeds/30_etl_core.sql"
  "supabase/seeds/40_stoqr_reference_membership.sql"
  "supabase/seeds/50_stoqr_catalog_inventory.sql"
  "supabase/seeds/55_stoqr_reports_demo.sql"
  "supabase/seeds/56_stoqr_procurement_workflows.sql"
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
  (cd "$ROOT_DIR" && npx supabase "$@")
}

read_env_value() {
  local key="$1"
  local file line value

  for file in "$ROOT_DIR/.env" "$ROOT_DIR/opense-stack/.env" "$SUPABASE_DIR/.env"; do
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

  warn "Full reset will drop and recreate the ${target} database, then insert seed data."
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
  local function_url
  local sql

  if [[ "$target" == "remote" ]]; then
    function_url="https://${project_ref}.functions.supabase.co/send-stoqr-alert-notifications"
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

full_reset() {
  local target project_ref token

  target="$(choose_target)"
  confirm_destructive_reset "$target"
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
    success "Linked remote database reset."

    configure_alert_dispatch "$target" "$token" "$project_ref"
  else
    info "Resetting local database..."
    run_supabase db reset --yes
    success "Local database reset."

    configure_alert_dispatch "$target" "$token"
  fi
}

insert_seed_data() {
  local target seed_file sql_payload

  target="$(choose_target)"
  warn "Seed insertion runs the seed files in order. The first seed file cleans existing seeded rows."
  read -r -p "Type SEED to continue: " confirmation
  if [[ "$confirmation" != "SEED" ]]; then
    fail "Seed insertion cancelled."
  fi

  for seed_file in "${SEED_FILES[@]}"; do
    [[ -f "$ROOT_DIR/$seed_file" ]] || fail "Missing seed file: $seed_file"
    info "Running $seed_file"
    sql_payload="$(cat "$ROOT_DIR/$seed_file")"
    if [[ "$target" == "remote" ]]; then
      run_supabase db query --linked "$sql_payload"
    else
      run_supabase db query "$sql_payload"
    fi
  done

  success "Seed data inserted."
}

main_menu() {
  print_header
  echo "Database targets:"
  echo "  Remote: linked Supabase project"
  echo "  Local: local Supabase Docker database"
  echo
  echo "Select an action:"
  echo "  1) Full reset (remote also deploys alert Edge Functions)"
  echo "  2) Insert DB seed data only"
  echo "  3) Exit"
  echo
  read -r -p "Action [1]: " action
  action="${action:-1}"

  case "$action" in
    1) full_reset ;;
    2) insert_seed_data ;;
    3) exit 0 ;;
    *) fail "Unknown action: $action" ;;
  esac
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main_menu
fi
