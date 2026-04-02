import argparse
import json
import re
from pathlib import Path
from typing import Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


REPO_URL_PATTERN = re.compile(r"https://github.com/([^\)\s]+)")
DEFAULT_ONE_LINER = "待补充"


def fetch_starred_repos(username: str) -> list[dict[str, str]]:
    repos: list[dict[str, str]] = []
    page = 1

    while True:
        query = urlencode({"per_page": 100, "page": page})
        url = f"https://api.github.com/users/{username}/starred?{query}"
        request = Request(
            url,
            headers={
                "Accept": "application/vnd.github+json",
                "User-Agent": "kayns-choices-sync",
            },
        )

        try:
            with urlopen(request) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except HTTPError as error:
            raise RuntimeError(f"GitHub API request failed with status {error.code}") from error
        except URLError as error:
            raise RuntimeError(f"GitHub API request failed: {error.reason}") from error

        if not payload:
            break

        repos.extend(payload)
        page += 1

    return repos


def extract_repo_urls(markdown_text: str) -> set[str]:
    return set(REPO_URL_PATTERN.findall(markdown_text))


def normalize_one_liner(description: str | None) -> str:
    cleaned = (description or "").replace("\n", " ").replace("|", "-").strip()
    return cleaned or DEFAULT_ONE_LINER


def format_inbox_row(repo: dict[str, str]) -> str:
    return (
        f"| [{repo['full_name']}]({repo['html_url']}) | "
        f"{normalize_one_liner(repo.get('description'))} |"
    )


def find_inbox_table_bounds(lines: list[str]) -> tuple[int, int]:
    inbox_heading_index = None
    header_index = None
    separator_index = None

    for index, line in enumerate(lines):
        if inbox_heading_index is None:
            if line.strip() == "## Inbox":
                inbox_heading_index = index
            continue

        if line.startswith("## "):
            break

        if header_index is None and line.strip() == "| Repo | One-liner |":
            header_index = index
            continue

        if header_index is not None and separator_index is None and line.strip() == "|---|---|":
            separator_index = index
            continue

        if separator_index is not None and line.strip().startswith("[Back to top]"):
            return separator_index + 1, index

    if separator_index is not None:
        return separator_index + 1, len(lines)

    raise ValueError("Could not find the Inbox table in README.md")


def update_readme_inbox(readme_text: str, starred_repos: Iterable[dict[str, str]]) -> tuple[str, list[str]]:
    lines = readme_text.splitlines()
    insert_at, rows_end = find_inbox_table_bounds(lines)

    existing_repos = extract_repo_urls(readme_text)
    new_repos = [repo for repo in starred_repos if repo["full_name"] not in existing_repos]
    if not new_repos:
        return readme_text, []

    new_rows = [format_inbox_row(repo) for repo in new_repos]
    updated_lines = lines[:insert_at] + new_rows + lines[insert_at:rows_end] + lines[rows_end:]
    updated_text = "\n".join(updated_lines)
    if readme_text.endswith("\n"):
        updated_text += "\n"

    return updated_text, [repo["full_name"] for repo in new_repos]


def sync_readme(username: str, readme_path: Path) -> tuple[bool, list[str]]:
    readme_text = readme_path.read_text(encoding="utf-8")
    starred_repos = fetch_starred_repos(username)
    updated_text, added_repos = update_readme_inbox(readme_text, starred_repos)

    if updated_text != readme_text:
        readme_path.write_text(updated_text, encoding="utf-8")
        return True, added_repos

    return False, []


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sync new GitHub stars into the README Inbox.")
    parser.add_argument("--username", default="KaynXu", help="GitHub username to sync starred repos from")
    parser.add_argument(
        "--readme",
        default="README.md",
        help="Path to the README file that contains the Inbox table",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    changed, added_repos = sync_readme(args.username, Path(args.readme))

    print(f"SYNC_CHANGED={changed}")
    print(f"SYNC_ADDED_COUNT={len(added_repos)}")
    print(f"SYNC_ADDED_REPOS={added_repos}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())