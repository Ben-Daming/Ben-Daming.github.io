import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { getExcerpt, getPostUrl, sortPosts } from '../lib/blog';
import { siteConfig } from '../site.config';

export async function GET(context: { site: URL }) {
  const posts = sortPosts(await getCollection('blog', ({ data }) => !data.draft));

  return rss({
    title: siteConfig.title,
    description: siteConfig.description,
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: getExcerpt(post, 180),
      pubDate: post.data.date,
      link: getPostUrl(post)
    }))
  });
}
