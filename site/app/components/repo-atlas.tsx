"use client";

import Image from "next/image";
import {
  Boxes,
  BrainCircuit,
  ChartNoAxesColumnIncreasing,
  ChevronDown,
  Code2,
  Database,
  ExternalLink,
  FolderClosed,
  Gamepad2,
  Grid2X2,
  Inbox,
  ListTree,
  Network,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  type CSSProperties,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import { flushSync } from "react-dom";

import { filterRepositories, readFilters, writeFilters } from "../lib/filters";
import {
  encodeViewTransitionName,
  runFilterTransition,
} from "../lib/filter-transition";
import type {
  AtlasFilters,
  Category,
  Repository,
  RepositoryAtlas,
} from "../lib/types";
import { scrollAtlasToTop } from "../lib/viewport";

const EMPTY_FILTERS: AtlasFilters = { query: "", category: "", tags: [] };
const POPULAR_TAG_COUNT = 6;

const categoryIcons: Record<string, LucideIcon> = {
  inbox: Inbox,
  "ai-llm-agents": BrainCircuit,
  "ai-skills": Sparkles,
  "ai-harness": Network,
  "ai-tools": Wrench,
  "developer-tools": Code2,
  infrastructure: Database,
  visualisation: ChartNoAxesColumnIncreasing,
  security: ShieldCheck,
  gamedev: Gamepad2,
  "learning-and-lists": ListTree,
  "assests-and-resources": FolderClosed,
};

const categoryHues: Record<string, number> = {
  inbox: 145,
  "ai-llm-agents": 305,
  "ai-skills": 90,
  "ai-harness": 265,
  "ai-tools": 35,
  "developer-tools": 240,
  infrastructure: 210,
  visualisation: 330,
  security: 155,
  gamedev: 20,
  "learning-and-lists": 75,
  "assests-and-resources": 190,
};

type RepositoryCardStyle = CSSProperties & {
  "--card-index": number;
  "--cat-h": number;
};

interface RepositoryAtlasProps {
  atlas: RepositoryAtlas;
}

interface CategoryButtonProps {
  category?: Category;
  count: number;
  selected: boolean;
  onSelect: () => void;
}

function CategoryButton({
  category,
  count,
  selected,
  onSelect,
}: CategoryButtonProps) {
  const Icon = category ? categoryIcons[category.slug] ?? Boxes : Grid2X2;
  const label = category?.name ?? "All";

  return (
    <button
      className="category-button"
      data-selected={selected}
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
    >
      <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
      <span className="category-label">{label}</span>
      <span className="category-count">{count}</span>
    </button>
  );
}

interface RepositoryCardProps {
  repository: Repository;
  index: number;
  onCategorySelect: (category: string) => void;
  onTagSelect: (tag: string) => void;
}

function RepositoryCard({
  repository,
  index,
  onCategorySelect,
  onTagSelect,
}: RepositoryCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <article
      className="repository-card"
      style={
        {
          viewTransitionName: encodeViewTransitionName(repository.id),
          "--card-index": Math.min(index, 12),
          "--cat-h": categoryHues[repository.categorySlug] ?? 145,
        } as RepositoryCardStyle
      }
    >
      <div className="repository-heading">
        <Image
          className={
            imageLoaded
              ? "repository-avatar is-loaded"
              : "repository-avatar"
          }
          src={repository.avatarUrl}
          alt=""
          width={48}
          height={48}
          unoptimized
          onLoad={() => setImageLoaded(true)}
        />
        <div className="repository-identity">
          <h2>
            <a href={repository.url} target="_blank" rel="noreferrer">
              {repository.fullName}
            </a>
          </h2>
          <button
            className="category-link"
            type="button"
            onClick={() => onCategorySelect(repository.categorySlug)}
          >
            {repository.category}
          </button>
        </div>
        <a
          className="icon-button repository-external"
          href={repository.url}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${repository.fullName} on GitHub`}
          title={`Open ${repository.fullName} on GitHub`}
        >
          <ExternalLink aria-hidden="true" size={20} strokeWidth={1.8} />
        </a>
      </div>

      <p className="repository-note" title={repository.note}>
        {repository.note}
      </p>

      <div className="repository-tags" aria-label={`${repository.fullName} tags`}>
        {repository.tags.map((tag) => (
          <button
            className="repository-tag"
            type="button"
            key={tag}
            onClick={() => onTagSelect(tag)}
          >
            {tag}
          </button>
        ))}
      </div>
    </article>
  );
}

export function RepoAtlas({ atlas }: RepositoryAtlasProps) {
  const [filters, setFilters] = useState<AtlasFilters>(EMPTY_FILTERS);
  const [filtersReady, setFiltersReady] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const allTagsId = useId();
  const validCategories = useMemo(
    () => atlas.categories.map((category) => category.slug),
    [atlas.categories],
  );
  const validTags = useMemo(
    () => atlas.tags.map((tag) => tag.name),
    [atlas.tags],
  );

  useEffect(() => {
    const syncFromUrl = () => {
      setFilters(
        readFilters(
          new URLSearchParams(window.location.search),
          validCategories,
          validTags,
        ),
      );
      setFiltersReady(true);
    };

    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, [validCategories, validTags]);

  useEffect(() => {
    if (!filtersReady) {
      return;
    }

    const query = writeFilters(filters).toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", nextUrl);
  }, [filters, filtersReady]);

  const repositories = useMemo(
    () => filterRepositories(atlas.repositories, filters),
    [atlas.repositories, filters],
  );
  const popularTags = atlas.tags.slice(0, POPULAR_TAG_COUNT);
  const hasFilters =
    filters.query.trim().length > 0 ||
    filters.category.length > 0 ||
    filters.tags.length > 0;

  const transitionFilters = (
    updater: (current: AtlasFilters) => AtlasFilters,
  ) => {
    runFilterTransition({
      commit: () => {
        setHasInteracted(true);
        setFilters(updater);
      },
      scroll: scrollAtlasToTop,
      flush: flushSync,
      start: document.startViewTransition?.bind(document),
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    });
  };

  const selectCategory = (category: string) => {
    transitionFilters((current) => ({ ...current, category }));
  };

  const toggleTag = (tag: string) => {
    transitionFilters((current) => ({
      ...current,
      tags: current.tags.includes(tag)
        ? current.tags.filter((selectedTag) => selectedTag !== tag)
        : [...current.tags, tag],
    }));
  };

  const clearFilters = () => transitionFilters(() => EMPTY_FILTERS);

  const categoryNavigation = (
    <>
      <CategoryButton
        count={atlas.repositories.length}
        selected={!filters.category}
        onSelect={() => selectCategory("")}
      />
      {atlas.categories.map((category) => (
        <CategoryButton
          category={category}
          count={category.count}
          selected={filters.category === category.slug}
          onSelect={() => selectCategory(category.slug)}
          key={category.slug}
        />
      ))}
    </>
  );

  return (
    <div
      className="atlas-shell"
      data-entering={filtersReady && !hasInteracted}
    >
      <header className="atlas-header">
        <div className="header-inner">
          <div className="brand-row">
            <h1 className="brand-title">
              Kayn&apos;s <span>Choices</span>
            </h1>
            <p>{atlas.repositories.length} repositories</p>
          </div>

          <div className="search-row">
            <label className="search-field">
              <span className="sr-only">Search repositories</span>
              <Search aria-hidden="true" size={21} strokeWidth={1.8} />
              <input
                type="search"
                value={filters.query}
                onChange={(event) => {
                  setHasInteracted(true);
                  setFilters((current) => ({
                    ...current,
                    query: event.target.value,
                  }));
                }}
                placeholder="Search repos, notes, or tags"
                autoComplete="off"
              />
              {filters.query ? (
                <button
                  className="search-clear"
                  type="button"
                  onClick={() => {
                    setHasInteracted(true);
                    setFilters((current) => ({ ...current, query: "" }));
                  }}
                  aria-label="Clear search"
                  title="Clear search"
                >
                  <X aria-hidden="true" size={19} />
                </button>
              ) : null}
            </label>
            <button
              className="icon-button filter-toggle"
              type="button"
              aria-expanded={showAllTags}
              aria-controls={allTagsId}
              onClick={() => setShowAllTags((visible) => !visible)}
              title="Show all tags"
              aria-label="Show all tags"
            >
              <SlidersHorizontal aria-hidden="true" size={20} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </header>

      <div className="atlas-layout">
        <aside className="category-rail">
          <nav aria-label="Categories">{categoryNavigation}</nav>
          <button
            className="all-tags-button"
            type="button"
            aria-expanded={showAllTags}
            aria-controls={allTagsId}
            onClick={() => setShowAllTags((visible) => !visible)}
          >
            <Tag aria-hidden="true" size={17} strokeWidth={1.8} />
            <span>All tags</span>
            <ChevronDown
              className="chevron"
              aria-hidden="true"
              size={17}
              strokeWidth={1.8}
            />
          </button>
        </aside>

        <main className="results-area">
          <nav className="mobile-categories" aria-label="Categories">
            {categoryNavigation}
          </nav>

          <div className="results-toolbar">
            <p className="results-count" aria-live="polite">
              <span key={repositories.length} className="count-swap">
                {repositories.length}
              </span>{" "}
              {repositories.length === 1 ? "result" : "results"}
            </p>
            {hasFilters ? (
              <button className="clear-filters" type="button" onClick={clearFilters}>
                <X aria-hidden="true" size={15} />
                Clear filters
              </button>
            ) : null}
          </div>

          <div className="popular-tags" aria-label="Popular tags">
            <button
              className="tag-filter"
              data-selected={filters.tags.length === 0}
              type="button"
              onClick={() =>
                transitionFilters((current) => ({ ...current, tags: [] }))
              }
              aria-pressed={filters.tags.length === 0}
            >
              All
            </button>
            {popularTags.map((tag) => (
              <button
                className="tag-filter"
                data-selected={filters.tags.includes(tag.name)}
                type="button"
                onClick={() => toggleTag(tag.name)}
                aria-pressed={filters.tags.includes(tag.name)}
                key={tag.name}
              >
                {tag.name}
              </button>
            ))}
            <button
              className="tag-filter more-tags"
              type="button"
              aria-expanded={showAllTags}
              aria-controls={allTagsId}
              onClick={() => setShowAllTags((visible) => !visible)}
            >
              +{Math.max(atlas.tags.length - POPULAR_TAG_COUNT, 0)}
              <ChevronDown className="chevron" aria-hidden="true" size={14} />
            </button>
          </div>

          <div className="all-tags-wrap" data-open={showAllTags}>
            <div className="all-tags-clip">
              <section
                className="all-tags-panel"
                id={allTagsId}
                aria-label="All tags"
                aria-hidden={!showAllTags}
                inert={!showAllTags}
              >
                {atlas.tags.map((tag) => (
                  <button
                    className="all-tag-filter"
                    data-selected={filters.tags.includes(tag.name)}
                    type="button"
                    onClick={() => toggleTag(tag.name)}
                    aria-pressed={filters.tags.includes(tag.name)}
                    key={tag.name}
                  >
                    <span>{tag.name}</span>
                    <span>{tag.count}</span>
                  </button>
                ))}
              </section>
            </div>
          </div>

          {repositories.length > 0 ? (
            <section className="repository-grid" aria-label="Repositories">
              {repositories.map((repository, index) => (
                <RepositoryCard
                  repository={repository}
                  index={index}
                  onCategorySelect={selectCategory}
                  onTagSelect={toggleTag}
                  key={repository.id}
                />
              ))}
            </section>
          ) : (
            <section className="empty-state">
              <Search aria-hidden="true" size={24} strokeWidth={1.6} />
              <h2>No repositories found</h2>
              <button type="button" onClick={clearFilters}>
                Reset filters
              </button>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
