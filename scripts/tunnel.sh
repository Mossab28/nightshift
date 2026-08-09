#!/usr/bin/env bash
# SSH tunnel to the DataHub instance on the VPS.
# GMS (API) on 8080, UI on 9002 -- both stay bound to the VPS's localhost;
# this tunnel is the only way in.
set -euo pipefail
HOST="${1:-intrudr-prod}"
echo "Tunneling localhost:18080 (GMS) and localhost:19002 (UI) -> $HOST"
exec ssh -N \
  -L 18080:127.0.0.1:8080 \
  -L 19002:127.0.0.1:9002 \
  "$HOST"
