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


def open_fix_pr(
    *,
    repo: str,
    file_path: str,
    old_snippet: str,
    new_snippet: str,
    title: str,
    body: str,
) -> OpenedPR:
    """Open a draft PR replacing `old_snippet` with `new_snippet` in one file."""
    with _client() as gh:
        base = gh.get(f"/repos/{repo}").json().get("default_branch", "main")
        ref = gh.get(f"/repos/{repo}/git/ref/heads/{base}").json()
        base_sha = ref["object"]["sha"]

        blob = gh.get(f"/repos/{repo}/contents/{file_path}", params={"ref": base}).json()
        if "content" not in blob:
            raise FixPRError(f"{file_path} not found in {repo}")
        content = base64.b64decode(blob["content"]).decode()
        if old_snippet not in content:
            raise FixPRError(
                f"the snippet to replace was not found in {file_path}; "
                "the fix must be derived from the real file, not invented"
            )
        fixed = content.replace(old_snippet, new_snippet, 1)

        branch = f"nightshift/fix-{int(time.time())}"
        gh.post(
            f"/repos/{repo}/git/refs",
            json={"ref": f"refs/heads/{branch}", "sha": base_sha},
        ).raise_for_status()
        gh.put(
            f"/repos/{repo}/contents/{file_path}",
            json={
                "message": title,
                "content": base64.b64encode(fixed.encode()).decode(),
                "sha": blob["sha"],
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
