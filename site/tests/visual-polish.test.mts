import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(
  new URL("../app/components/repo-atlas.tsx", import.meta.url),
  "utf8",
);
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

function sourceBetween(start: string, end: string) {
  const startIndex = component.indexOf(start);
  const endIndex = component.indexOf(end, startIndex + start.length);

  assert.notEqual(startIndex, -1, `Missing source marker: ${start}`);
  assert.notEqual(endIndex, -1, `Missing source marker: ${end}`);
  return component.slice(startIndex, endIndex);
}

function cssRule(selector: string, source = css) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(
    new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`),
  );

  assert.ok(match, `Missing CSS rule: ${selector}`);
  return match[1];
}

test("routes click filters through the native transition orchestrator", () => {
  const transitionHandler = sourceBetween(
    "const transitionFilters =",
    "const selectCategory =",
  );
  const categoryHandler = sourceBetween(
    "const selectCategory =",
    "const toggleTag =",
  );
  const tagHandler = sourceBetween("const toggleTag =", "const clearFilters =");
  const clearHandler = sourceBetween(
    "const clearFilters =",
    "const categoryNavigation =",
  );
  const popularAllHandler = sourceBetween(
    '<div className="popular-tags" aria-label="Popular tags">',
    "{popularTags.map((tag) => (",
  );

  assert.match(transitionHandler, /runFilterTransition/);
  assert.match(transitionHandler, /flush:\s*flushSync/);
  assert.match(transitionHandler, /startViewTransition\?\.bind\(document\)/);
  assert.match(
    transitionHandler,
    /matchMedia\("\(prefers-reduced-motion: reduce\)"\)\.matches/,
  );
  assert.match(categoryHandler, /transitionFilters\(/);
  assert.doesNotMatch(categoryHandler, /setFilters\(/);
  assert.match(tagHandler, /transitionFilters\(/);
  assert.doesNotMatch(tagHandler, /setFilters\(/);
  assert.match(clearHandler, /transitionFilters\(/);
  assert.doesNotMatch(clearHandler, /setFilters\(/);
  assert.match(popularAllHandler, /transitionFilters\(/);
  assert.match(popularAllHandler, /tags:\s*\[\]/);
  assert.doesNotMatch(popularAllHandler, /setFilters\(/);
});

test("keeps search changes immediate and outside filter transitions", () => {
  const searchHandler = component.match(
    /<input[\s\S]*?placeholder="Search repos, notes, or tags"/,
  )?.[0];
  const searchClearHandler = component.match(
    /<button\s+className="search-clear"[\s\S]*?aria-label="Clear search"/,
  )?.[0];

  assert.ok(searchHandler);
  assert.ok(searchClearHandler);
  assert.match(searchHandler, /setFilters/);
  assert.match(searchClearHandler, /setFilters/);
  assert.doesNotMatch(searchHandler, /transitionFilters|scrollAtlasToTop/);
  assert.doesNotMatch(searchClearHandler, /transitionFilters|scrollAtlasToTop/);
});

test("gives every repository card stable motion and color tokens", () => {
  assert.match(
    component,
    /viewTransitionName:\s*encodeViewTransitionName\(repository\.id\)/,
  );
  assert.match(component, /Math\.min\(index, 12\)/);
  assert.match(component, /"--cat-h"/);
});

test("exposes the approved panel, count, avatar, and entrance states", () => {
  assert.match(component, /className="all-tags-wrap"/);
  assert.match(component, /data-open=\{showAllTags\}/);
  assert.match(component, /aria-hidden=\{!showAllTags\}/);
  assert.match(component, /inert=\{!showAllTags\}/);
  assert.match(component, /className="chevron"/);
  assert.match(component, /className="count-swap"/);
  assert.match(
    component,
    /className=\{\s*imageLoaded\s*\?\s*"repository-avatar is-loaded"\s*:\s*"repository-avatar"\s*\}/,
  );
  assert.match(component, /onLoad=\{\(\) => setImageLoaded\(true\)\}/);
  assert.match(
    component,
    /data-entering=\{filtersReady && !hasInteracted\}/,
  );
});

test("forwards avatar loaded state through the Image adapter className", () => {
  const repositoryCard = sourceBetween(
    "function RepositoryCard(",
    "export function RepoAtlas",
  );
  const avatarMarkup = repositoryCard.match(/<Image[\s\S]*?\/>/)?.[0];
  const loadedAvatarRule = cssRule(".repository-avatar.is-loaded");

  assert.ok(avatarMarkup, "Missing repository avatar image");
  assert.match(
    avatarMarkup,
    /className=\{\s*imageLoaded\s*\?\s*"repository-avatar is-loaded"\s*:\s*"repository-avatar"\s*\}/,
  );
  assert.match(avatarMarkup, /onLoad=\{\(\) => setImageLoaded\(true\)\}/);
  assert.doesNotMatch(repositoryCard, /data-loaded|avatarRef|markLoaded/);
  assert.doesNotMatch(
    repositoryCard,
    /(?:add|remove)EventListener\("load"/,
  );
  assert.doesNotMatch(component, /\buseRef\b/);
  assert.match(loadedAvatarRule, /opacity:\s*1/);
  assert.doesNotMatch(css, /\.repository-avatar\[data-loaded="true"\]/);
});

test("implements the approved canvas, surface, and color system", () => {
  const headerRule = cssRule(".atlas-header");
  const brandRule = cssRule(".brand-title span");
  const brandTotalRule = cssRule(".brand-row p");
  const cardRule = cssRule(".repository-card");
  const cardHoverRule = cssRule(".repository-card:hover");

  assert.match(css, /--radius:\s*10px/);
  assert.match(css, /:root\s*\{[^}]*view-transition-name:\s*none/);
  assert.match(css, /body\s*\{[^}]*background:\s*var\(--paper-soft\)/);
  assert.match(
    css,
    /\.atlas-shell\s*\{[^}]*background:\s*var\(--paper-soft\)/,
  );
  assert.match(headerRule, /background:\s*rgb\(255 255 255 \/ 0\.82\)/);
  assert.match(
    headerRule,
    /-webkit-backdrop-filter:\s*blur\(10px\) saturate\(1\.8\)/,
  );
  assert.match(
    headerRule,
    /(?:^|\n)\s*backdrop-filter:\s*blur\(10px\) saturate\(1\.8\)/,
  );
  assert.doesNotMatch(headerRule, /0\.86/);
  assert.match(
    brandRule,
    /background:\s*linear-gradient\(90deg, var\(--green\), #3fae63\)/,
  );
  assert.match(brandRule, /-webkit-background-clip:\s*text/);
  assert.match(brandRule, /(?:^|\n)\s*background-clip:\s*text/);
  assert.match(brandRule, /-webkit-text-fill-color:\s*transparent/);
  assert.doesNotMatch(brandRule, /110deg|var\(--green-dark\)|#12a14a/);
  assert.match(
    brandTotalRule,
    /font-family:\s*var\(--font-geist-mono\), monospace/,
  );
  assert.match(cardRule, /border:\s*1px solid transparent/);
  assert.match(
    cardRule,
    /box-shadow:\s*0 1px 2px rgb\(17 22 19 \/ 5%\),\s*0 12px 24px -16px rgb\(17 22 19 \/ 10%\)/,
  );
  assert.match(
    cardHoverRule,
    /box-shadow:\s*0 2px 4px rgb\(17 22 19 \/ 6%\),\s*0 16px 32px -12px rgb\(17 22 19 \/ 16%\)/,
  );
  assert.doesNotMatch(
    cardRule,
    /0 1px 2px rgb\(17 22 19 \/ 0\.06\)|0 10px 28px rgb\(17 22 19 \/ 0\.07\)/,
  );
  assert.doesNotMatch(
    cardHoverRule,
    /0 3px 6px rgb\(17 22 19 \/ 0\.08\)|0 16px 36px rgb\(17 22 19 \/ 0\.1\)/,
  );
  assert.match(css, /oklch\(96\.5% 0\.03 var\(--cat-h\)\)/);
  assert.match(
    css,
    /\.tag-filter:hover\s*\{[^}]*border-color:\s*var\(--border-strong\)/,
  );
  assert.match(
    css,
    /\.all-tag-filter\[data-selected="true"\]\s*\{[^}]*background:\s*var\(--green-soft\)/,
  );
  assert.doesNotMatch(css, /--blue(?:-soft)?:/);
});

test("implements compact cards and expandable tag layout", () => {
  const allTagsRule = cssRule(".all-tags-wrap");

  assert.match(css, /\.repository-card\s*\{[^}]*min-height:\s*180px/);
  assert.match(css, /\.repository-note\s*\{[^}]*-webkit-line-clamp:\s*3/);
  assert.match(allTagsRule, /grid-template-rows:\s*0fr/);
  assert.match(
    allTagsRule,
    /transition:\s*grid-template-rows 280ms var\(--motion-curve\)/,
  );
  assert.doesNotMatch(
    allTagsRule,
    /transition:[^;]*(?:margin|height|top)|220ms/,
  );
  assert.match(
    css,
    /\.all-tags-wrap\[data-open="true"\]\s*\{[^}]*grid-template-rows:\s*1fr[^}]*margin-bottom:\s*18px/,
  );
  assert.match(
    css,
    /\.repository-tag\s*\{[^}]*font-family:\s*var\(--font-geist-mono\)/,
  );
  assert.match(
    css,
    /\.count-swap\s*\{[^}]*font-family:\s*var\(--font-geist-mono\)/,
  );
});

test("clips the decorated all-tags panel through an undecorated grid child", () => {
  const allTagsMarkup = sourceBetween(
    '<div className="all-tags-wrap" data-open={showAllTags}>',
    "{repositories.length > 0 ? (",
  );
  const clipRule = cssRule(".all-tags-wrap > .all-tags-clip");
  const panelRule = cssRule(".all-tags-panel");

  assert.match(
    allTagsMarkup,
    /^<div className="all-tags-wrap" data-open=\{showAllTags\}>\s*<div className="all-tags-clip">\s*<section\s+className="all-tags-panel"[\s\S]*?<\/section>\s*<\/div>\s*<\/div>\s*$/,
  );
  assert.match(clipRule, /min-height:\s*0;\s*overflow:\s*hidden;/);
  assert.doesNotMatch(clipRule, /\bpadding(?:-[a-z-]+)?:/);
  assert.doesNotMatch(clipRule, /\bborder(?:-[a-z-]+)?:/);
  assert.doesNotMatch(clipRule, /\bmargin(?:-[a-z-]+)?:/);
  assert.match(panelRule, /padding:\s*14px 0;/);
  assert.match(panelRule, /border-top:\s*1px solid var\(--border\);/);
  assert.match(panelRule, /border-bottom:\s*1px solid var\(--border\);/);
  assert.doesNotMatch(
    css,
    /\.all-tags-wrap\s*>\s*\.all-tags-panel\s*\{/,
  );
});

test("uses one approved curve across every motion hook", () => {
  const rootRule = cssRule(":root");
  const buttonMotionRule = cssRule(".icon-button");
  const viewTransitionRule = cssRule("::view-transition-group(*)");
  const activeBarRule = cssRule(".category-button::before");
  const chevronRule = cssRule(".chevron");
  const countRule = cssRule(".count-swap");
  const allTagsRule = cssRule(".all-tags-wrap");
  const cardRule = cssRule(".repository-card");
  const entranceRule = cssRule(
    '.atlas-shell[data-entering="true"] .repository-card',
  );
  const avatarRule = cssRule(".repository-avatar");
  const externalIconRule = cssRule(".repository-external svg");

  assert.match(
    rootRule,
    /--motion-curve:\s*cubic-bezier\(0\.2, 0, 0, 1\)/,
  );
  assert.deepEqual(css.match(/cubic-bezier\([^)]*\)/g), [
    "cubic-bezier(0.2, 0, 0, 1)",
  ]);
  assert.doesNotMatch(css, /\bease(?:-[a-z]+)*\b/);
  assert.match(
    buttonMotionRule,
    /transition:\s*transform 120ms var\(--motion-curve\)/,
  );
  assert.match(viewTransitionRule, /animation-duration:\s*260ms/);
  assert.match(
    viewTransitionRule,
    /animation-timing-function:\s*var\(--motion-curve\)/,
  );
  assert.match(
    activeBarRule,
    /transition:\s*transform 200ms var\(--motion-curve\)/,
  );
  assert.doesNotMatch(activeBarRule, /180ms|ease/);
  assert.match(
    chevronRule,
    /transition:\s*transform 180ms var\(--motion-curve\)/,
  );
  assert.match(
    countRule,
    /animation:\s*count-in 200ms var\(--motion-curve\)/,
  );
  assert.doesNotMatch(countRule, /count-in 180ms|ease-out/);
  assert.match(
    allTagsRule,
    /transition:\s*grid-template-rows 280ms var\(--motion-curve\)/,
  );
  assert.match(
    cardRule,
    /transition:\s*box-shadow 180ms var\(--motion-curve\),\s*transform 180ms var\(--motion-curve\)/,
  );
  assert.match(
    entranceRule,
    /animation:\s*card-in 480ms var\(--motion-curve\) backwards/,
  );
  assert.match(
    entranceRule,
    /animation-delay:\s*calc\(var\(--card-index\) \* 35ms\)/,
  );
  assert.doesNotMatch(entranceRule, /360ms|30ms|cubic-bezier/);
  assert.match(
    avatarRule,
    /transition:\s*opacity 220ms var\(--motion-curve\)/,
  );
  assert.match(
    externalIconRule,
    /transition:\s*transform 160ms var\(--motion-curve\)/,
  );
});

test("implements scoped entrance and interaction motion", () => {
  assert.match(
    css,
    /::view-transition-group\(\*\)\s*\{[^}]*animation-duration:\s*260ms/,
  );
  assert.match(css, /@keyframes card-in/);
  assert.match(
    css,
    /\.atlas-shell\[data-entering="true"\]\s+\.repository-card\s*\{[^}]*animation:\s*card-in 480ms var\(--motion-curve\) backwards;[^}]*animation-delay:\s*calc\(var\(--card-index\) \* 35ms\)/,
  );
  assert.doesNotMatch(
    css,
    /(?:^|\})\s*\.repository-card\s*\{[^}]*animation:[^;]*card-in/,
  );
  assert.match(
    css,
    /\.repository-card:hover\s*\{[^}]*transform:\s*translateY\(-3px\)/,
  );
  const activeRule = cssRule(".icon-button:active");

  assert.match(
    activeRule,
    /transform:\s*translateY\(1px\) scale\(0\.96\)/,
  );
  assert.doesNotMatch(activeRule, /scale\(0\.98\)/);
  assert.match(
    css,
    /\.repository-card:hover \.repository-external svg\s*\{[^}]*transform:\s*translate\(2px, -2px\)/,
  );
  assert.doesNotMatch(css, /\.repository-external:hover svg/);
  assert.match(
    css,
    /\[aria-expanded="true"\]\s+\.chevron\s*\{[^}]*transform:\s*rotate\(180deg\)/,
  );
  assert.match(css, /\.count-swap\s*\{[^}]*animation:[^;]*count-in/);
  assert.match(
    css,
    /\.category-button\[data-selected="true"\]::before\s*\{[^}]*transform:\s*scaleY\(1\)/,
  );
  assert.match(
    css,
    /\.repository-avatar\.is-loaded\s*\{[^}]*opacity:\s*1/,
  );
});

test("disables motion comprehensively when reduced motion is requested", () => {
  const reducedMotionStart = css.indexOf(
    "@media (prefers-reduced-motion: reduce)",
  );

  assert.notEqual(reducedMotionStart, -1);
  const reducedMotion = css.slice(reducedMotionStart);

  assert.match(reducedMotion, /animation-duration:\s*0\.01ms !important/);
  assert.match(reducedMotion, /animation-delay:\s*0ms !important/);
  assert.match(reducedMotion, /transition-delay:\s*0ms !important/);
  assert.match(
    reducedMotion,
    /\.atlas-shell\[data-entering="true"\]\s+\.repository-card,[^}]*\.count-swap\s*\{[^}]*animation:\s*none !important/,
  );
  assert.match(
    reducedMotion,
    /::view-transition-group\(\*\),[^}]*::view-transition-old\(\*\),[^}]*::view-transition-new\(\*\)\s*\{[^}]*animation:\s*none !important/,
  );
  assert.match(
    reducedMotion,
    /\.repository-card:hover,[^}]*\.repository-card:hover \.repository-external svg\s*\{[^}]*transform:\s*none !important/,
  );
  assert.doesNotMatch(reducedMotion, /\.repository-external:hover svg/);
});
