# Ben Daming's blog

This repository now runs on Astro and Tailwind CSS.

## Stack

- Astro
- Tailwind CSS 4
- Markdown content collections
- KaTeX via `remark-math` + `rehype-katex`
- Obsidian-flavored Markdown extensions for `[[wiki links]]`, `![[embeds]]`, callouts, and `==highlight==`

## Local development

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev -- --host
```

Build the site:

```bash
npm run build
```

Run Astro checks:

```bash
npm run check
```

## Content

- Blog posts live in `src/content/blog/`
- Static assets live in `public/`
- Main layouts and components live in `src/layouts/` and `src/components/`
- New posts must include frontmatter with at least `title` and `date`

Example post frontmatter:

```md
---
title: 五子棋项目开发文档
date: 2025-12-01
tags:
  - project
  - Gomoku
toc: true
---
```

## Deployment

GitHub Pages deployment is configured in `.github/workflows/deploy.yml`.
Push to the `main` branch to trigger the deploy workflow.

## Copyright

All posts under `src/content/blog/` are original content by the repository owner. Please ask for permission before reposting.
