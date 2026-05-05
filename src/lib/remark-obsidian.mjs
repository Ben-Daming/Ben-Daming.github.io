import fs from 'node:fs';
import path from 'node:path';

const BLOG_DIR = path.resolve(process.cwd(), 'src/content/blog');
const DATED_PREFIX = /^\d{4}-\d{1,2}-\d{1,2}-/;
const IMAGE_EXTENSIONS = new Set(['.avif', '.gif', '.jpg', '.jpeg', '.png', '.svg', '.webp']);

let cachedWikiMap;

function normalizeNoteKey(value) {
  return value
    .trim()
    .replace(/\.(md|mdx)$/i, '')
    .replace(/\\/g, '/')
    .toLocaleLowerCase('zh-CN');
}

function stripDatePrefix(value) {
  return value.replace(DATED_PREFIX, '');
}

function encodePathSegment(value) {
  return value
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function slugifyHeading(value) {
  return value
    .trim()
    .toLocaleLowerCase('zh-CN')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-');
}

function extractFrontmatterValue(source, key) {
  const frontmatter = source.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatter) return '';

  const pattern = new RegExp(`^${key}:\\s*(.+)$`, 'm');
  const match = frontmatter[1].match(pattern);
  if (!match) return '';

  return match[1].trim().replace(/^['"]|['"]$/g, '');
}

function addWikiAlias(map, alias, href) {
  if (!alias) return;
  map.set(normalizeNoteKey(alias), href);
}

function buildWikiMap() {
  const map = new Map();
  const entries = fs.readdirSync(BLOG_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile() || !/\.(md|mdx)$/i.test(entry.name)) continue;

    const fullPath = path.join(BLOG_DIR, entry.name);
    const source = fs.readFileSync(fullPath, 'utf8');
    const baseName = entry.name.replace(/\.(md|mdx)$/i, '');
    const slug = stripDatePrefix(baseName);
    const href = `/${encodePathSegment(slug)}/`;
    const title = extractFrontmatterValue(source, 'title');

    addWikiAlias(map, baseName, href);
    addWikiAlias(map, slug, href);
    addWikiAlias(map, title, href);
    addWikiAlias(map, path.basename(baseName), href);
  }

  return map;
}

function getWikiMap() {
  if (!cachedWikiMap) {
    cachedWikiMap = buildWikiMap();
  }

  return cachedWikiMap;
}

function resolveWikiHref(rawTarget) {
  const [notePart, headingPart = ''] = rawTarget.split('#');
  const cleanedNote = notePart.trim();
  const map = getWikiMap();
  const fallbackSlug = stripDatePrefix(cleanedNote.replace(/\.(md|mdx)$/i, ''));
  const baseHref = map.get(normalizeNoteKey(cleanedNote)) ?? `/${encodePathSegment(fallbackSlug)}/`;

  if (!headingPart) return baseHref;
  return `${baseHref}#${slugifyHeading(headingPart)}`;
}

function resolveEmbed(rawTarget) {
  const target = rawTarget.trim();
  const extension = path.extname(target).toLocaleLowerCase('zh-CN');

  if (!IMAGE_EXTENSIONS.has(extension)) {
    return null;
  }

  const normalized = target.replace(/^\/+/, '');
  return `/${encodePathSegment(normalized)}`;
}

function createTextNode(value) {
  return { type: 'text', value };
}

function createLinkNode(target, label) {
  return {
    type: 'link',
    url: resolveWikiHref(target),
    title: null,
    children: [createTextNode(label)]
  };
}

function createImageNode(url, alt) {
  return {
    type: 'image',
    url,
    title: null,
    alt
  };
}

function createMarkNode(value) {
  return {
    type: 'strong',
    data: {
      hName: 'mark',
      hProperties: { className: ['obsidian-mark'] }
    },
    children: [createTextNode(value)]
  };
}

function flattenInlineText(children) {
  return children
    .map((child) => {
      if (child.type === 'text' || child.type === 'inlineCode') return child.value;
      if (Array.isArray(child.children)) return flattenInlineText(child.children);
      return '';
    })
    .join('');
}

function transformInlineText(value) {
  const pattern = /(!)?\[\[([^[\]]+)\]\]|==([^=]+)==/g;
  const nodes = [];
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(value)) !== null) {
    const [fullMatch, embedFlag, wikiInner, markInner] = match;

    if (match.index > lastIndex) {
      nodes.push(createTextNode(value.slice(lastIndex, match.index)));
    }

    if (typeof markInner === 'string') {
      nodes.push(createMarkNode(markInner));
    } else if (typeof wikiInner === 'string') {
      const separatorIndex = wikiInner.indexOf('|');
      const target = separatorIndex >= 0 ? wikiInner.slice(0, separatorIndex).trim() : wikiInner.trim();
      const alias = separatorIndex >= 0 ? wikiInner.slice(separatorIndex + 1).trim() : '';
      const [notePart, headingPart = ''] = target.split('#');
      const label = alias || headingPart || notePart;

      if (embedFlag) {
        const imageUrl = resolveEmbed(target);
        if (imageUrl) {
          nodes.push(createImageNode(imageUrl, label));
        } else {
          nodes.push(createLinkNode(target, label));
        }
      } else {
        nodes.push(createLinkNode(target, label));
      }
    }

    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex === 0) {
    return [createTextNode(value)];
  }

  if (lastIndex < value.length) {
    nodes.push(createTextNode(value.slice(lastIndex)));
  }

  return nodes.filter((node) => node.type !== 'text' || node.value.length > 0);
}

function rewriteInlineNodes(node) {
  if (!Array.isArray(node.children)) return;

  const nextChildren = [];

  for (const child of node.children) {
    if (child.type === 'text') {
      nextChildren.push(...transformInlineText(child.value));
      continue;
    }

    if (Array.isArray(child.children) && child.type !== 'link') {
      rewriteInlineNodes(child);
    }

    nextChildren.push(child);
  }

  node.children = nextChildren;
}

function normalizeCallout(blockquote) {
  if (!Array.isArray(blockquote.children) || blockquote.children.length === 0) return;

  const firstChild = blockquote.children[0];
  if (firstChild.type !== 'paragraph' || !Array.isArray(firstChild.children) || firstChild.children.length === 0) return;

  const paragraphText = flattenInlineText(firstChild.children);
  const [titleLine, ...restLines] = paragraphText.split('\n');
  const match = titleLine.trimStart().match(/^\[!([^\]]+)\]([+-])?\s*(.*)$/);
  if (!match) return;

  const [, rawType, , rawTitle] = match;
  const calloutType = rawType.trim().toLocaleLowerCase('zh-CN');
  const title = rawTitle.trim() || rawType.trim();
  const remainingText = restLines.join('\n').trimEnd();

  blockquote.data = {
    ...(blockquote.data ?? {}),
    hName: 'aside',
    hProperties: {
      ...((blockquote.data ?? {}).hProperties ?? {}),
      className: ['obsidian-callout', `obsidian-callout-${calloutType}`],
      'data-callout': calloutType
    }
  };

  const nextChildren = [
    {
      type: 'paragraph',
      data: {
        hProperties: { className: ['obsidian-callout-title'] }
      },
      children: [createTextNode(title)]
    },
  ];

  if (remainingText) {
    const codeLines = restLines
      .map((line) => line.replace(/^\t/, ''))
      .filter((line) => line.length > 0);

    if (codeLines.length > 0 && restLines.every((line) => line === '' || /^\t/.test(line))) {
      nextChildren.push({
        type: 'code',
        lang: null,
        meta: null,
        value: codeLines.join('\n')
      });
    } else {
      nextChildren.push({
        type: 'paragraph',
        children: [createTextNode(remainingText.trimStart())]
      });
    }
  }

  nextChildren.push(...blockquote.children.slice(1));
  blockquote.children = nextChildren;
}

function visitTree(node, visitor) {
  visitor(node);

  if (!Array.isArray(node.children)) return;

  for (const child of node.children) {
    visitTree(child, visitor);
  }
}

export function remarkObsidian() {
  return (tree) => {
    cachedWikiMap = buildWikiMap();

    visitTree(tree, (node) => {
      if (Array.isArray(node.children)) {
        rewriteInlineNodes(node);
      }

      if (node.type === 'blockquote') {
        normalizeCallout(node);
      }
    });
  };
}
