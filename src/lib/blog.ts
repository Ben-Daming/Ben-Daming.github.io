import type { CollectionEntry } from 'astro:content';

export type BlogPost = CollectionEntry<'blog'>;

const datedPrefix = /^\d{4}-\d{1,2}-\d{1,2}-/;

export function getPostSlug(post: BlogPost) {
  const id = post.id.replace(/\.(md|mdx)$/i, '');
  return id.replace(datedPrefix, '');
}

export function getPostUrl(post: BlogPost) {
  return `/${getPostSlug(post)}/`;
}

export function normalizeTag(tag: string) {
  return tag.trim().replace(/^#+/, '');
}

export function getTagSlug(tag: string) {
  return normalizeTag(tag)
    .toLocaleLowerCase('zh-CN')
    .replace(/\s+/g, '-');
}

export function getTagUrl(tag: string) {
  return `/tags/${encodeURIComponent(getTagSlug(tag))}/`;
}

export function getTagDomId(tag: string) {
  return `tag-${getTagSlug(tag)}`;
}

export function getPostTags(post: BlogPost) {
  return post.data.tags.map(normalizeTag).filter(Boolean);
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

export function sortPosts(posts: BlogPost[], direction: 'asc' | 'desc' = 'desc') {
  return [...posts].sort((a, b) => {
    const delta = a.data.date.getTime() - b.data.date.getTime();
    return direction === 'asc' ? delta : -delta;
  });
}

export function getExcerpt(post: BlogPost, maxLength = 140) {
  const raw = post.data.description ?? post.body ?? '';
  const text = raw
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[>#*_~\-`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

export function collectTags(posts: BlogPost[]) {
  const tags = new Map<string, BlogPost[]>();
  for (const post of posts) {
    for (const tag of getPostTags(post)) {
      const entries = tags.get(tag) ?? [];
      entries.push(post);
      tags.set(tag, entries);
    }
  }
  return [...tags.entries()]
    .map(([tag, entries]) => ({ tag, slug: getTagSlug(tag), posts: sortPosts(entries) }))
    .sort((a, b) => b.posts.length - a.posts.length || a.tag.localeCompare(b.tag));
}

export function getAdjacentPosts(posts: BlogPost[], current: BlogPost) {
  const chronological = sortPosts(posts, 'asc');
  const currentSlug = getPostSlug(current);
  const index = chronological.findIndex((post) => getPostSlug(post) === currentSlug);

  return {
    older: index > 0 ? chronological[index - 1] : undefined,
    newer: index >= 0 && index < chronological.length - 1 ? chronological[index + 1] : undefined
  };
}
