import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

const REQUIRED_COLUMNS = ["Repo", "One-liner", "Tags"];

function nodeText(node) {
  if (typeof node.value === "string") {
    return node.value;
  }

  if (!Array.isArray(node.children)) {
    return "";
  }

  return node.children.map(nodeText).join("");
}

function findLink(node) {
  if (node.type === "link") {
    return node;
  }

  if (!Array.isArray(node.children)) {
    return null;
  }

  for (const child of node.children) {
    const link = findLink(child);
    if (link) {
      return link;
    }
  }

  return null;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseRepositoryLink(link, categoryName, rowNumber) {
  let url;

  try {
    url = new URL(link.url);
  } catch {
    throw new Error(`${categoryName} row ${rowNumber} has an invalid GitHub repository link`);
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (url.protocol !== "https:" || url.hostname !== "github.com" || parts.length !== 2) {
    throw new Error(`${categoryName} row ${rowNumber} has an invalid GitHub repository link`);
  }

  const owner = parts[0];
  const repository = parts[1].replace(/\.git$/, "");
  if (!owner || !repository) {
    throw new Error(`${categoryName} row ${rowNumber} has an invalid GitHub repository link`);
  }

  return {
    owner,
    fullName: `${owner}/${repository}`,
    url: `https://github.com/${owner}/${repository}`,
  };
}

function parseTags(value) {
  return [...new Set(value.split(",").map((tag) => tag.trim()).filter(Boolean))];
}

function countTags(repositories) {
  const counts = new Map();

  for (const repository of repositories) {
    for (const tag of repository.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
}

function tableColumns(table, categoryName) {
  const header = table.children[0];
  const columns = header.children.map((cell) => nodeText(cell).trim());

  for (const requiredColumn of REQUIRED_COLUMNS) {
    if (categoryName === "Inbox" && requiredColumn === "Tags") {
      continue;
    }

    if (!columns.includes(requiredColumn)) {
      throw new Error(`${categoryName} table is missing required column: ${requiredColumn}`);
    }
  }

  return Object.fromEntries(columns.map((column, index) => [column, index]));
}

function parseTable(table, category, seenRepositories, seenRepositoryIds) {
  const columns = tableColumns(table, category.name);
  const repositories = [];

  table.children.slice(1).forEach((row, rowIndex) => {
    const rowNumber = rowIndex + 1;
    const repoCell = row.children[columns.Repo];
    const link = repoCell ? findLink(repoCell) : null;

    if (!link) {
      if (category.name === "Inbox" && nodeText(repoCell ?? {}).trim() === "Empty") {
        return;
      }

      throw new Error(`${category.name} row ${rowNumber} has no repository link`);
    }

    const parsedLink = parseRepositoryLink(link, category.name, rowNumber);
    const duplicateKey = parsedLink.fullName.toLowerCase();
    if (seenRepositories.has(duplicateKey)) {
      throw new Error(`Duplicate repository: ${parsedLink.fullName}`);
    }
    seenRepositories.add(duplicateKey);

    const repoIdMatch = link.title?.match(/repo-id:\s*(\d+)/);
    const repositoryId = repoIdMatch?.[1] ?? parsedLink.fullName;
    if (seenRepositoryIds.has(repositoryId)) {
      throw new Error(`Duplicate repository ID: ${repositoryId}`);
    }
    seenRepositoryIds.add(repositoryId);

    const noteCell = row.children[columns["One-liner"]];
    const tagsCell = columns.Tags === undefined ? null : row.children[columns.Tags];

    repositories.push({
      id: repositoryId,
      fullName: parsedLink.fullName,
      owner: parsedLink.owner,
      url: parsedLink.url,
      avatarUrl: `https://github.com/${parsedLink.owner}.png?size=96`,
      note: nodeText(noteCell ?? {}).trim(),
      tags: parseTags(nodeText(tagsCell ?? {}).trim()),
      category: category.name,
      categorySlug: category.slug,
    });
  });

  return repositories;
}

export function parseRepositoryAtlas(markdown) {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown);
  const categories = [];
  const repositories = [];
  const seenRepositories = new Set();
  const seenRepositoryIds = new Set();

  for (let index = 0; index < tree.children.length; index += 1) {
    const node = tree.children[index];
    if (node.type !== "heading" || node.depth !== 2) {
      continue;
    }

    const name = nodeText(node).trim();
    if (name === "Navigation") {
      continue;
    }

    const category = { name, slug: slugify(name), count: 0 };
    categories.push(category);

    for (let nextIndex = index + 1; nextIndex < tree.children.length; nextIndex += 1) {
      const nextNode = tree.children[nextIndex];
      if (nextNode.type === "heading" && nextNode.depth === 2) {
        break;
      }

      if (nextNode.type === "table") {
        const parsedRepositories = parseTable(
          nextNode,
          category,
          seenRepositories,
          seenRepositoryIds,
        );
        category.count += parsedRepositories.length;
        repositories.push(...parsedRepositories);
        break;
      }
    }
  }

  return {
    categories,
    repositories,
    tags: countTags(repositories),
  };
}
