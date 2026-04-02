import unittest

from scripts.sync_stars import extract_repo_urls, update_readme_inbox


README_SAMPLE = """# Starred Repos Atlas

## Inbox

刚 star、还没认真归类的先扔这里。

| Repo | One-liner |
|---|---|
| [owner/existing-inbox](https://github.com/owner/existing-inbox) | Existing inbox item |

[Back to top](#starred-repos-atlas)

## Developer-Tools

| Repo | One-liner | Tags |
|---|---|---|
| [owner/categorized](https://github.com/owner/categorized) | Already categorized | tools |

[Back to top](#starred-repos-atlas)
"""


class ExtractRepoUrlsTests(unittest.TestCase):
    def test_extract_repo_urls_reads_all_repo_links(self):
        repo_urls = extract_repo_urls(README_SAMPLE)

        self.assertEqual(
            repo_urls,
            {
                "owner/existing-inbox",
                "owner/categorized",
            },
        )


class UpdateReadmeInboxTests(unittest.TestCase):
    def test_handles_intro_text_before_inbox_table(self):
        updated_text, added_repos = update_readme_inbox(
            README_SAMPLE,
            [
                {
                    "full_name": "owner/new-repo",
                    "html_url": "https://github.com/owner/new-repo",
                    "description": "Brand new repo",
                }
            ],
        )

        self.assertEqual(added_repos, ["owner/new-repo"])
        self.assertIn("刚 star、还没认真归类的先扔这里。", updated_text)
        self.assertIn(
            "| [owner/new-repo](https://github.com/owner/new-repo) | Brand new repo |",
            updated_text,
        )

    def test_adds_only_missing_repos_to_inbox(self):
        updated_text, added_repos = update_readme_inbox(
            README_SAMPLE,
            [
                {
                    "full_name": "owner/new-repo",
                    "html_url": "https://github.com/owner/new-repo",
                    "description": "Brand new repo",
                },
                {
                    "full_name": "owner/categorized",
                    "html_url": "https://github.com/owner/categorized",
                    "description": "Should not duplicate",
                },
            ],
        )

        self.assertEqual(added_repos, ["owner/new-repo"])
        self.assertIn(
            "| [owner/new-repo](https://github.com/owner/new-repo) | Brand new repo |",
            updated_text,
        )
        self.assertEqual(updated_text.count("owner/categorized"), 2)

    def test_new_rows_are_inserted_at_top_of_inbox_rows(self):
        updated_text, _ = update_readme_inbox(
            README_SAMPLE,
            [
                {
                    "full_name": "owner/new-repo",
                    "html_url": "https://github.com/owner/new-repo",
                    "description": "Brand new repo",
                }
            ],
        )

        inbox_section = updated_text.split("## Inbox", 1)[1].split("[Back to top]", 1)[0]
        expected_order = [
            "|---|---|",
            "| [owner/new-repo](https://github.com/owner/new-repo) | Brand new repo |",
            "| [owner/existing-inbox](https://github.com/owner/existing-inbox) | Existing inbox item |",
        ]

        for earlier, later in zip(expected_order, expected_order[1:]):
            self.assertLess(inbox_section.index(earlier), inbox_section.index(later))

    def test_uses_placeholder_when_description_missing(self):
        updated_text, _ = update_readme_inbox(
            README_SAMPLE,
            [
                {
                    "full_name": "owner/no-description",
                    "html_url": "https://github.com/owner/no-description",
                    "description": "",
                }
            ],
        )

        self.assertIn(
            "| [owner/no-description](https://github.com/owner/no-description) | 待补充 |",
            updated_text,
        )

    def test_raises_when_inbox_table_is_missing(self):
        with self.assertRaises(ValueError):
            update_readme_inbox("# Empty\n", [])


if __name__ == "__main__":
    unittest.main()