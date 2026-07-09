import atlasData from "./data/repos.generated.json";
import { RepoAtlas } from "./components/repo-atlas";
import type { RepositoryAtlas } from "./lib/types";

export default function Home() {
  return <RepoAtlas atlas={atlasData as RepositoryAtlas} />;
}
