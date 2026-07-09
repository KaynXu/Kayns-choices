import type { AtlasFilters, Repository } from "./types";

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}

export function filterRepositories(
  repositories: Repository[],
  filters: AtlasFilters,
) {
  const queryTerms = normalize(filters.query).split(/\s+/).filter(Boolean);
  const selectedTags = [...new Set(filters.tags.map(normalize).filter(Boolean))];

  return repositories.filter((repository) => {
    if (filters.category && repository.categorySlug !== filters.category) {
      return false;
    }

    const repositoryTags = repository.tags.map(normalize);
    if (!selectedTags.every((tag) => repositoryTags.includes(tag))) {
      return false;
    }

    const searchableText = normalize(
      [
        repository.fullName,
        repository.note,
        repository.category,
        repository.categorySlug,
        ...repository.tags,
      ].join(" "),
    );

    return queryTerms.every((term) => searchableText.includes(term));
  });
}

export function readFilters(
  searchParams: URLSearchParams,
  validCategories: string[],
  validTags: string[],
): AtlasFilters {
  const query = searchParams.get("q")?.trim() ?? "";
  const requestedCategory = searchParams.get("category") ?? "";
  const category = validCategories.includes(requestedCategory)
    ? requestedCategory
    : "";
  const validTagSet = new Set(validTags);
  const tags = [
    ...new Set(
      (searchParams.get("tags") ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => validTagSet.has(tag)),
    ),
  ];

  return { query, category, tags };
}

export function writeFilters(filters: AtlasFilters) {
  const searchParams = new URLSearchParams();
  const query = filters.query.trim();
  const tags = [...new Set(filters.tags.map((tag) => tag.trim()).filter(Boolean))].sort();

  if (query) {
    searchParams.set("q", query);
  }
  if (filters.category) {
    searchParams.set("category", filters.category);
  }
  if (tags.length > 0) {
    searchParams.set("tags", tags.join(","));
  }

  return searchParams;
}
