function getTextContent(node) {
  if (!node) return '';
  if (node.type === 'text') return node.value;
  if (!Array.isArray(node.children)) return '';
  return node.children.map((child) => getTextContent(child)).join('');
}

function createText(value) {
  return { type: 'text', value };
}

function createElement(tagName, properties, children) {
  return { type: 'element', tagName, properties, children };
}

function normalizeCallout(node) {
  if (node.type !== 'element' || node.tagName !== 'blockquote' || !Array.isArray(node.children) || node.children.length === 0) {
    return;
  }

  const firstParagraph = node.children.find((child) => child.type === 'element' && child.tagName === 'p');
  if (!firstParagraph) return;

  const paragraphText = getTextContent(firstParagraph);
  const [titleLine, ...restLines] = paragraphText.split('\n');
  const match = titleLine.trimStart().match(/^\[!([^\]]+)\]([+-])?\s*(.*)$/);
  if (!match) return;

  const [, rawType, , rawTitle] = match;
  const calloutType = rawType.trim().toLowerCase();
  const title = rawTitle.trim() || rawType.trim();
  const remainder = restLines.join('\n').trim();

  const className = Array.isArray(node.properties?.className) ? node.properties.className : [];
  node.properties = {
    ...(node.properties ?? {}),
    className: [...new Set([...className, 'obsidian-callout', `obsidian-callout-${calloutType}`])],
    'data-callout': calloutType
  };

  const nextChildren = [
    createElement('p', { className: ['obsidian-callout-title'] }, [createText(title)])
  ];

  if (remainder) {
    const codeLines = restLines.map((line) => line.trimEnd());
    const looksLikeCode = codeLines.length > 1 || /[{}=<>]/.test(remainder);

    if (looksLikeCode) {
      nextChildren.push(
        createElement('pre', {}, [
          createElement('code', {}, [createText(remainder)])
        ])
      );
    } else {
      nextChildren.push(createElement('p', {}, [createText(remainder)]));
    }
  }

  let skipped = false;
  for (const child of node.children) {
    if (!skipped && child === firstParagraph) {
      skipped = true;
      continue;
    }
    nextChildren.push(child);
  }

  node.children = nextChildren;
}

function visit(node, visitor) {
  visitor(node);
  if (!Array.isArray(node.children)) return;
  for (const child of node.children) {
    visit(child, visitor);
  }
}

export function rehypeObsidianCallouts() {
  return (tree) => {
    visit(tree, (node) => {
      normalizeCallout(node);
    });
  };
}
