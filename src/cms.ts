export type Block =
  | {
      id: string;
      type: 'hero';
      kicker: string;
      headline: string;
      subheading: string;
    }
  | {
      id: string;
      type: 'richText';
      html: string;
    }
  | {
      id: string;
      type: 'image';
      src: string;
      alt: string;
      caption: string;
    }
  | {
      id: string;
      type: 'cta';
      label: string;
      href: string;
      note: string;
    };

export interface PageDocument {
  slug: string;
  title: string;
  description: string;
  blocks: Block[];
  updatedAt: string;
}

export interface CmsConfig {
  siteTitle: string;
  sourceDir: string;
  outputDir: string;
}

export const DEFAULT_CONFIG: CmsConfig = {
  siteTitle: 'Thistleberry',
  sourceDir: '.gitscribe/pages',
  outputDir: 'site',
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const createId = () =>
  Math.random().toString(36).slice(2, 10);

export const createBlock = (type: Block['type']): Block => {
  switch (type) {
    case 'hero':
      return {
        id: createId(),
        type: 'hero',
        kicker: 'Section',
        headline: 'New page',
        subheading: 'Introduce the page with a short, factual summary.',
      };
    case 'richText':
      return {
        id: createId(),
        type: 'richText',
        html: '<p>Start writing here.</p>',
      };
    case 'image':
      return {
        id: createId(),
        type: 'image',
        src: '',
        alt: '',
        caption: '',
      };
    case 'cta':
      return {
        id: createId(),
        type: 'cta',
        label: 'Call to action',
        href: '/',
        note: 'Explain what happens next.',
      };
  }
};

export const createPageDocument = (): PageDocument => ({
  slug: 'new-page',
  title: 'New Page',
  description: 'A simple page managed in Git.',
  updatedAt: new Date().toISOString(),
  blocks: [
    createBlock('hero'),
    createBlock('richText'),
  ],
});

const renderBlock = (block: Block): string => {
  switch (block.type) {
    case 'hero':
      return `
        <section class="hero">
          <p class="eyebrow">${escapeHtml(block.kicker)}</p>
          <h1>${escapeHtml(block.headline)}</h1>
          <p class="lead">${escapeHtml(block.subheading)}</p>
        </section>
      `;
    case 'richText':
      return `
        <section class="rich-text">
          ${block.html}
        </section>
      `;
    case 'image':
      return `
        <figure class="media">
          <img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt)}" />
          ${block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ''}
        </figure>
      `;
    case 'cta':
      return `
        <section class="cta">
          <a class="cta-link" href="${escapeHtml(block.href)}">${escapeHtml(block.label)}</a>
          ${block.note ? `<p>${escapeHtml(block.note)}</p>` : ''}
        </section>
      `;
  }
};

export const getSourcePath = (config: CmsConfig, slug: string) =>
  `${config.sourceDir}/${slug}.json`;

export const getOutputPath = (config: CmsConfig, slug: string) =>
  `${config.outputDir}/${slug}.html`;

export const renderPageHtml = (doc: PageDocument, config: CmsConfig): string => `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(doc.title)} | ${escapeHtml(config.siteTitle)}</title>
    <meta name="description" content="${escapeHtml(doc.description)}" />
    <style>
      :root {
        --ink: #161616;
        --muted: #5c5c5c;
        --line: #dfd7cc;
        --surface: #fffdf8;
        --accent: #0f766e;
        --accent-strong: #115e59;
        --max: 76rem;
      }

      * { box-sizing: border-box; }
      html { font-size: 16px; }
      body {
        margin: 0;
        font-family: Georgia, "Times New Roman", serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(15, 118, 110, 0.08), transparent 30%),
          linear-gradient(180deg, #fffdf8 0%, #f7f1e8 100%);
      }

      .shell {
        max-width: var(--max);
        margin: 0 auto;
        padding: 3rem 1.25rem 5rem;
      }

      header.site-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        margin-bottom: 3rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--line);
      }

      .site-title {
        margin: 0;
        font-size: 0.9rem;
        letter-spacing: 0.24em;
        text-transform: uppercase;
      }

      .page-slug {
        color: var(--muted);
        font-family: ui-monospace, SFMono-Regular, monospace;
        font-size: 0.9rem;
      }

      main {
        display: grid;
        gap: 2rem;
      }

      section {
        background: rgba(255, 255, 255, 0.66);
        border: 1px solid rgba(223, 215, 204, 0.9);
        border-radius: 1.5rem;
        padding: 2rem;
        box-shadow: 0 10px 30px rgba(22, 22, 22, 0.05);
      }

      .hero {
        padding: 3rem 2rem;
      }

      .eyebrow {
        margin: 0 0 1rem;
        color: var(--accent-strong);
        font-size: 0.8rem;
        font-family: ui-monospace, SFMono-Regular, monospace;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }

      h1 {
        margin: 0;
        font-size: clamp(2.5rem, 5vw, 4.8rem);
        line-height: 0.95;
      }

      .lead {
        max-width: 46rem;
        margin: 1.5rem 0 0;
        font-size: 1.25rem;
        line-height: 1.65;
        color: var(--muted);
      }

      .rich-text {
        font-size: 1.1rem;
        line-height: 1.75;
      }

      .rich-text h2,
      .rich-text h3 {
        margin-top: 0;
        font-family: Arial, Helvetica, sans-serif;
      }

      .rich-text p:first-child,
      .rich-text h2:first-child,
      .rich-text h3:first-child {
        margin-top: 0;
      }

      .rich-text a {
        color: var(--accent-strong);
      }

      .media img {
        display: block;
        width: 100%;
        border-radius: 1rem;
      }

      figcaption {
        margin-top: 0.75rem;
        color: var(--muted);
        font-size: 0.95rem;
      }

      .cta {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }

      .cta-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 3rem;
        padding: 0.85rem 1.2rem;
        border-radius: 999px;
        color: white;
        background: var(--accent);
        text-decoration: none;
        font-family: Arial, Helvetica, sans-serif;
        font-weight: 700;
      }

      .cta-link:hover {
        background: var(--accent-strong);
      }

      .meta {
        margin-top: 3rem;
        color: var(--muted);
        font-size: 0.95rem;
      }

      @media (max-width: 720px) {
        header.site-header {
          flex-direction: column;
          align-items: flex-start;
        }

        .shell {
          padding-top: 2rem;
        }

        section,
        .hero {
          padding: 1.25rem;
        }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <header class="site-header">
        <p class="site-title">${escapeHtml(config.siteTitle)}</p>
        <span class="page-slug">/${escapeHtml(doc.slug)}.html</span>
      </header>
      <main>
        ${doc.blocks.map(renderBlock).join('\n')}
      </main>
      <p class="meta">Last generated ${escapeHtml(new Date(doc.updatedAt).toLocaleString())}</p>
    </div>
  </body>
</html>
`;
