export interface Category {
  name: string;
  slug: string;
  count: number;
}

export interface Repository {
  id: string;
  fullName: string;
  owner: string;
  url: string;
  avatarUrl: string;
  note: string;
  tags: string[];
  category: string;
  categorySlug: string;
}

export interface TagCount {
  name: string;
  count: number;
}

export interface RepositoryAtlas {
  categories: Category[];
  repositories: Repository[];
  tags: TagCount[];
}

export interface AtlasFilters {
  query: string;
  category: string;
  tags: string[];
}
