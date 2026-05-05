import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { remarkObsidian } from './src/lib/remark-obsidian.mjs';
import { rehypeObsidianCallouts } from './src/lib/rehype-obsidian-callouts.mjs';

export default defineConfig({
  site: 'https://ben-daming.github.io',
  trailingSlash: 'always',
  integrations: [sitemap()],
  markdown: {
    remarkPlugins: [remarkGfm, remarkMath, remarkObsidian],
    rehypePlugins: [rehypeKatex, rehypeObsidianCallouts],
    shikiConfig: {
      theme: 'github-light',
      wrap: true
    }
  }
});
