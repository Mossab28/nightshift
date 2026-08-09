"""The fix that actually lands somewhere: a real pull request.

The agent never merges. It opens a PR with the one-line change it derived from
the catalog, and a human reviews it -- the same boundary a senior on-call
engineer respects at 4am. The graph is the agent's to write; the codebase is
not.

Implemented against the GitHub REST API with a plain token (`GITHUB_TOKEN`),
no git checkout needed: read the file, swap the snippet, commit on a branch,
open the PR.
"""

from __future__ import annotations

import base64
import os
import time
from dataclasses import dataclass

import httpx

API = "https://api.github.com"
DEFAULT_REPO = "Mossab28/nightshift-dbt-demo"
DEFAULT_PATH = "models/analytics/order_details.sql"


class FixPRError(RuntimeError):
    pass


@dataclass(frozen=True)
class OpenedPR:
    url: str
    number: int
    branch: str


def _client() -> httpx.Client:
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("NIGHTSHIFT_GITHUB_TOKEN")
    if not token:
        raise FixPRError("GITHUB_TOKEN is not set; cannot open a fix PR")
    return httpx.Client(
        base_url=API,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
        },
        timeout=30.0,
    )


def normalize_repo(repo: str | None) -> str:
    """Resolve the fix repo. Agents sometimes pass the env var name literally."""
    env_repo = os.environ.get("NIGHTSHIFT_FIX_REPO") or DEFAULT_REPO
    if not repo:
        return env_repo
    cleaned = repo.strip().strip("$").strip("{}")
    if cleaned in {"NIGHTSHIFT_FIX_REPO", "FIX_REPO", env_repo}:
        return env_repo
    if "/" not in cleaned:
        return env_repo
    return cleaned


def candidate_paths(file_path: str | None) -> list[str]:
    """Ordered paths to try when the agent guesses the dbt layout wrong."""
    default = os.environ.get("NIGHTSHIFT_FIX_PATH") or DEFAULT_PATH
    out: list[str] = []
    for path in (file_path, default, DEFAULT_PATH):
        if path and path not in out:
            out.append(path)
    name = (file_path or default).rstrip("/").split("/")[-1]
    if name:
        for guess in (f"models/analytics/{name}", f"models/{name}"):
            if guess not in out:
                out.append(guess)
    return out


def _read_file(gh: httpx.Client, repo: str, file_path: str) -> tuple[str, str]:
    blob = gh.get(f"/repos/{repo}/contents/{file_path}", params={"ref": "HEAD"}).json()
    if "content" not in blob:
        raise FixPRError(f"{file_path} not found in {repo}")
    return base64.b64decode(blob["content"]).decode(), blob["sha"]


def resolve_file(
    gh: httpx.Client, repo: str, file_path: str | None, old_snippet: str
) -> tuple[str, str, str]:
    """Return (path, content, sha) for the first candidate that holds the snippet."""
    errors: list[str] = []
    for path in candidate_paths(file_path):
        try:
            content, sha = _read_file(gh, repo, path)
        except FixPRError as exc:
            errors.append(str(exc))
            continue
        if old_snippet in content:
            return path, content, sha
        errors.append(f"snippet not in {path}")
    raise FixPRError(
        "could not locate the file/snippet to patch; tried "
        + ", ".join(candidate_paths(file_path))
        + (f" ({'; '.join(errors[:3])})" if errors else "")
    )


def open_fix_pr(
    *,
    repo: str | None,
    file_path: str | None,
    old_snippet: str,
    new_snippet: str,
    title: str,
    body: str,
) -> OpenedPR:
    """Open a draft PR replacing `old_snippet` with `new_snippet` in one file."""
    repo = normalize_repo(repo)
    with _client() as gh:
        base = gh.get(f"/repos/{repo}").json().get("default_branch", "main")
        ref = gh.get(f"/repos/{repo}/git/ref/heads/{base}").json()
        base_sha = ref["object"]["sha"]

        path, content, sha = resolve_file(gh, repo, file_path, old_snippet)
        fixed = content.replace(old_snippet, new_snippet, 1)

        branch = f"nightshift/fix-{int(time.time())}"
        gh.post(
            f"/repos/{repo}/git/refs",
            json={"ref": f"refs/heads/{branch}", "sha": base_sha},
        ).raise_for_status()
        gh.put(
            f"/repos/{repo}/contents/{path}",
            json={
                "message": title,
                "content": base64.b64encode(fixed.encode()).decode(),
                "sha": sha,
                "branch": branch,
            },
        ).raise_for_status()
        pr = gh.post(
            f"/repos/{repo}/pulls",
            json={
                "title": title,
                "body": body
                + "\n\n---\n_Opened by Nightshift. The agent never merges: "
                "this change ships only after a human review._",
                "head": branch,
                "base": base,
                "draft": True,
            },
        )
        if pr.status_code >= 300:
            raise FixPRError(f"PR creation failed: {pr.text[:300]}")
        data = pr.json()
        return OpenedPR(url=data["html_url"], number=data["number"], branch=branch)
