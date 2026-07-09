import { readFile, writeFile } from "node:fs/promises";

import { parseRepositoryAtlas } from "./repo-parser.mjs";

const readmePath = new URL("../../README.md", import.meta.url);
const outputPath = new URL("../app/data/repos.generated.json", import.meta.url);
const atlas = parseRepositoryAtlas(await readFile(readmePath, "utf8"));

await writeFile(outputPath, `${JSON.stringify(atlas, null, 2)}\n`);
console.log(`Generated ${atlas.repositories.length} repositories.`);
