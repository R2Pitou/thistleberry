export const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled-page';

export const moveItem = <T,>(items: T[], index: number, direction: -1 | 1) => {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item);
  return next;
};

export const sanitizeRichText = (html: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const allowed = new Set(['P', 'BR', 'H2', 'H3', 'UL', 'OL', 'LI', 'STRONG', 'EM', 'A', 'BLOCKQUOTE', 'CODE']);

  const cleanNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent ?? '';
    }

    if (!(node instanceof HTMLElement)) {
      return '';
    }

    if (!allowed.has(node.tagName)) {
      return Array.from(node.childNodes).map(cleanNode).join('');
    }

    if (node.tagName === 'BR') {
      return '<br />';
    }

    const children = Array.from(node.childNodes).map(cleanNode).join('');
    if (node.tagName === 'A') {
      const href = node.getAttribute('href') || '#';
      const safeHref = href.startsWith('javascript:') ? '#' : href;
      return `<a href="${safeHref}">${children}</a>`;
    }

    return `<${node.tagName.toLowerCase()}>${children}</${node.tagName.toLowerCase()}>`;
  };

  const root = doc.body.firstElementChild;
  return root ? Array.from(root.childNodes).map(cleanNode).join('') : '<p></p>';
};
