"""Path/repo resolution for the fix PR - no network."""

from nightshift.datahub.fixpr import candidate_paths, normalize_repo


def test_normalize_repo_rejects_env_literal(monkeypatch):
 monkeypatch.setenv("NIGHTSHIFT_FIX_REPO", "Mossab28/nightshift-dbt-demo")
 assert normalize_repo("NIGHTSHIFT_FIX_REPO") == "Mossab28/nightshift-dbt-demo"
 assert normalize_repo("$NIGHTSHIFT_FIX_REPO") == "Mossab28/nightshift-dbt-demo"
 assert normalize_repo(None) == "Mossab28/nightshift-dbt-demo"
 assert normalize_repo("acme/other") == "acme/other"


def test_candidate_paths_covers_common_guesses(monkeypatch):
 monkeypatch.setenv("NIGHTSHIFT_FIX_PATH", "models/analytics/order_details.sql")
 paths = candidate_paths("models/order_details.sql")
 assert "models/order_details.sql" in paths
 assert "models/analytics/order_details.sql" in paths
