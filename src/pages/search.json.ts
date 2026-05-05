import { getCollection } from 'astro:content';
import { formatDate, getExcerpt, getPostTags, getPostUrl, sortPosts } from '../lib/blog';

export async function GET() {
  const posts = sortPosts(await getCollection('blog', ({ data }) => !data.draft));
  const payload = posts.map((post) => ({
    title: post.data.title,
    url: getPostUrl(post),
    date: formatDate(post.data.date),
    tags: getPostTags(post),
    excerpt: getExcerpt(post, 140)
  }));

  return new Response(JSON.stringify(payload), {
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}
