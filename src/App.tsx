import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { FileCode2, FilePlus2, FolderGit2, Github, Loader2, LogOut, Plus, Save, Settings2, Trash2 } from 'lucide-react';
import { Block, CmsConfig, DEFAULT_CONFIG, PageDocument, createBlock, createPageDocument, getOutputPath, renderPageHtml } from './cms';
import { moveItem, sanitizeRichText, slugify } from './editor';
import { CONFIG_PATH, Repo, deletePage, getOptionalContentFile, loadConfig, loadPage, loadPages, request, saveFile, savePage } from './github';

type User = {
  login: string;
  avatar_url: string;
  name?: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);
const RepoContext = createContext<{
  repo: Repo | null;
  setRepo: (repo: Repo | null) => void;
  config: CmsConfig;
  setConfig: React.Dispatch<React.SetStateAction<CmsConfig>>;
} | null>(null);

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('Missing auth context');
  return context;
};

const useRepo = () => {
  const context = useContext(RepoContext);
  if (!context) throw new Error('Missing repo context');
  return context;
};

const LoadingScreen = ({ label = 'Loading' }: { label?: string }) => (
  <div className="grid min-h-screen place-items-center bg-ink text-paper">
    <div className="flex items-center gap-3 text-sand">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span>{label}</span>
    </div>
  </div>
);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const refresh = async () => {
      try {
        const { data } = await request('/api/auth/me');
        setUser(data);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    refresh();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') refresh();
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login: async () => {
          const { data } = await request('/api/auth/url');
          window.open(data.url, 'github_oauth', 'width=640,height=760');
        },
        logout: async () => {
          await request('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
          setUser(null);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

const LoginPage = () => {
  const { login } = useAuth();

  return (
    <div className="min-h-screen overflow-hidden bg-ink text-paper">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-10 px-6 py-16 lg:flex-row lg:items-center lg:px-10">
        <div className="max-w-2xl space-y-6">
          <p className="text-xs uppercase tracking-[0.3em] text-mint">Thistleberry</p>
          <h1 className="max-w-xl text-5xl font-black uppercase leading-none md:text-7xl">
            Structured editing.
            <br />
            Deterministic HTML.
          </h1>
          <p className="max-w-xl text-lg leading-8 text-sand">
            Visual editing for Git-backed flat HTML sites. Keep structured source in the repo and render deterministic output without a database.
          </p>
        </div>

        <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-black/20">
            <Github className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold">Connect GitHub</h2>
          <p className="mt-3 text-sm leading-6 text-sand">
            No database. The app reads and writes repository files through the GitHub API.
          </p>
          <button
            onClick={login}
            className="mt-8 inline-flex w-full items-center justify-center gap-3 rounded-full bg-mint px-5 py-3 font-semibold text-ink transition hover:bg-mint/90"
          >
            <Github className="h-4 w-4" />
            Continue with GitHub
          </button>
        </div>
      </div>
    </div>
  );
};

const RepoPicker = () => {
  const { setRepo, setConfig } = useRepo();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        const { data } = await request('/api/github/user/repos?sort=updated&per_page=100');
        setRepos(data);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  if (loading) return <LoadingScreen label="Loading repositories" />;

  const filtered = repos.filter((repo) => repo.full_name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="min-h-screen bg-ink px-6 py-10 text-paper lg:px-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-mint">Choose repository</p>
            <h1 className="mt-2 text-4xl font-black uppercase">Attach the CMS to a repo</h1>
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter repositories"
            className="h-12 w-full rounded-full border border-white/10 bg-white/5 px-5 text-sm outline-none placeholder:text-sand md:w-80"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((repo) => (
            <button
              key={repo.full_name}
              onClick={async () => {
                setRepo(repo);
                const loaded = await loadConfig(repo);
                setConfig(loaded.config);
              }}
              className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 text-left transition hover:border-mint/50 hover:bg-white/8"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">{repo.name}</h2>
                  <p className="mt-2 text-sm text-sand">{repo.full_name}</p>
                </div>
                <FolderGit2 className="h-6 w-6 text-mint" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const NavButton = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const active = location.pathname === to;

  return (
    <button
      onClick={() => navigate(to)}
      className={`flex w-full items-center gap-3 rounded-full px-4 py-3 text-left transition ${
        active ? 'bg-mint text-ink' : 'bg-white/5 text-paper hover:bg-white/10'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
};

const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const { repo, setRepo } = useRepo();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-ink text-paper">
      <div className="mx-auto grid min-h-screen max-w-[1500px] grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-white/10 bg-black/20 px-6 py-8 lg:border-b-0 lg:border-r">
          <div className="space-y-8">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-mint">Thistleberry</p>
              <h1 className="mt-3 text-3xl font-black uppercase leading-none">Simple by design</h1>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-sand">Repository</p>
              <p className="mt-3 font-semibold">{repo?.full_name}</p>
              <button onClick={() => setRepo(null)} className="mt-4 text-sm text-mint hover:underline">
                Switch repository
              </button>
            </div>

            <nav className="space-y-2">
              <NavButton to="/" icon={<FileCode2 className="h-4 w-4" />} label="Pages" />
              <NavButton to="/pages/new" icon={<FilePlus2 className="h-4 w-4" />} label="New page" />
              <NavButton to="/settings" icon={<Settings2 className="h-4 w-4" />} label="Settings" />
            </nav>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
              <p className="font-semibold">{user?.name || user?.login}</p>
              <p className="mt-1 text-sm text-sand">@{user?.login}</p>
              <button
                onClick={async () => {
                  await logout();
                  navigate('/');
                }}
                className="mt-4 inline-flex items-center gap-2 text-sm text-sand transition hover:text-paper"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </aside>

        <main className="px-6 py-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { repo, config } = useRepo();
  const [pages, setPages] = useState<PageDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!repo) return;
    const run = async () => {
      setLoading(true);
      try {
        setPages(await loadPages(repo, config));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [repo, config]);

  if (loading) return <LoadingScreen label="Loading pages" />;

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-mint">Visual translation layer</p>
        <h2 className="mt-3 text-4xl font-black uppercase">Edit structured source, generate final HTML</h2>
        <p className="mt-4 max-w-3xl text-sand">
          Source lives in <code>{config.sourceDir}</code>. Generated HTML lives in <code>{config.outputDir}</code>.
          Thistleberry stays block-based so content remains reviewable and deterministic in Git.
        </p>
      </section>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Pages</h3>
          <p className="mt-1 text-sm text-sand">{pages.length} source files in this repository</p>
        </div>
        <button
          onClick={() => navigate('/pages/new')}
          className="inline-flex items-center gap-2 rounded-full bg-mint px-5 py-3 font-semibold text-ink transition hover:bg-mint/90"
        >
          <Plus className="h-4 w-4" />
          New page
        </button>
      </div>

      <div className="grid gap-4">
        {pages.length === 0 && (
          <div className="rounded-[1.75rem] border border-dashed border-white/15 bg-white/5 p-10 text-center text-sand">
            No pages yet. Create one and the CMS will write both source JSON and rendered HTML into the repo.
          </div>
        )}

        {pages.map((page) => (
          <button
            key={page.slug}
            onClick={() => navigate(`/pages/${page.slug}`)}
            className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 text-left transition hover:border-mint/50 hover:bg-white/8"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h4 className="text-xl font-bold">{page.title}</h4>
                <p className="mt-2 text-sm text-sand">/{page.slug}.html</p>
              </div>
              <div className="text-sm text-sand">
                <p>{page.blocks.length} blocks</p>
                <p>Updated {new Date(page.updatedAt).toLocaleDateString()}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

const Field = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => (
  <label className="grid gap-2">
    <span className="text-sm font-medium text-sand">{label}</span>
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-12 rounded-2xl border border-white/10 bg-black/20 px-4 text-paper outline-none placeholder:text-sand"
    />
  </label>
);

const SettingsView = () => {
  const { repo, config, setConfig } = useRepo();
  const [draft, setDraft] = useState<CmsConfig>(config);
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft(config), [config]);
  if (!repo) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-mint">Configuration</p>
        <h2 className="mt-3 text-3xl font-black uppercase">Keep the contract explicit</h2>
        <p className="mt-4 text-sand">The CMS stores its own config in <code>{CONFIG_PATH}</code>.</p>
      </section>

      <div className="grid gap-5 rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <Field label="Site title" value={draft.siteTitle} onChange={(value) => setDraft((current) => ({ ...current, siteTitle: value }))} />
        <Field label="Source directory" value={draft.sourceDir} onChange={(value) => setDraft((current) => ({ ...current, sourceDir: value }))} />
        <Field label="Rendered HTML directory" value={draft.outputDir} onChange={(value) => setDraft((current) => ({ ...current, outputDir: value }))} />

        <button
          onClick={async () => {
            setSaving(true);
            try {
              const existing = await getOptionalContentFile(repo, CONFIG_PATH);
              const nextConfig = {
                ...draft,
                siteTitle: draft.siteTitle.trim() || DEFAULT_CONFIG.siteTitle,
                sourceDir: draft.sourceDir.trim() || DEFAULT_CONFIG.sourceDir,
                outputDir: draft.outputDir.trim() || DEFAULT_CONFIG.outputDir,
              };
              await saveFile(repo, CONFIG_PATH, JSON.stringify(nextConfig, null, 2), 'cms: update config', existing?.sha);
              setConfig(nextConfig);
            } finally {
              setSaving(false);
            }
          }}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-mint px-5 py-3 font-semibold text-ink transition hover:bg-mint/90 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save settings
        </button>
      </div>
    </div>
  );
};

const AddBlockMenu = ({ onAdd }: { onAdd: (type: Block['type']) => void }) => (
  <div className="flex flex-wrap gap-3">
    {(['hero', 'richText', 'image', 'cta'] as Block['type'][]).map((type) => (
      <button
        key={type}
        onClick={() => onAdd(type)}
        className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm font-medium capitalize transition hover:border-mint/40 hover:text-mint"
      >
        + {type}
      </button>
    ))}
  </div>
);

const MiniButton = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button onClick={onClick} type="button" className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-sm transition hover:border-mint/40 hover:text-mint">
    {label}
  </button>
);

const RichTextEditor = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  }, [value]);

  const run = (command: string, commandValue?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, commandValue);
    onChange(sanitizeRichText(ref.current?.innerHTML ?? '<p></p>'));
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <MiniButton label="Paragraph" onClick={() => run('formatBlock', 'p')} />
        <MiniButton label="H2" onClick={() => run('formatBlock', 'h2')} />
        <MiniButton label="H3" onClick={() => run('formatBlock', 'h3')} />
        <MiniButton label="Bold" onClick={() => run('bold')} />
        <MiniButton label="Italic" onClick={() => run('italic')} />
        <MiniButton label="Bullet list" onClick={() => run('insertUnorderedList')} />
        <MiniButton label="Link" onClick={() => {
          const href = window.prompt('Enter link URL');
          if (href) run('createLink', href);
        }} />
      </div>

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(sanitizeRichText(ref.current?.innerHTML ?? '<p></p>'))}
        className="min-h-56 rounded-[1.5rem] border border-white/10 bg-white px-5 py-4 text-ink outline-none"
      />
    </div>
  );
};

const BlockEditor = ({
  block,
  index,
  total,
  onChange,
  onRemove,
  onMove,
}: {
  block: Block;
  index: number;
  total: number;
  onChange: (block: Block) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}) => (
  <article className="rounded-[1.75rem] border border-white/10 bg-black/20 p-6">
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-sand">Block {index + 1}</p>
        <h3 className="mt-2 text-xl font-bold capitalize">{block.type}</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => onMove(-1)} disabled={index === 0} className="rounded-full border border-white/10 px-3 py-2 text-sm disabled:opacity-40">Move up</button>
        <button onClick={() => onMove(1)} disabled={index === total - 1} className="rounded-full border border-white/10 px-3 py-2 text-sm disabled:opacity-40">Move down</button>
        <button onClick={onRemove} className="rounded-full border border-red-400/35 px-3 py-2 text-sm text-red-200">Remove</button>
      </div>
    </div>

    <div className="mt-6">
      {block.type === 'hero' && (
        <div className="grid gap-4">
          <Field label="Kicker" value={block.kicker} onChange={(value) => onChange({ ...block, kicker: value })} />
          <Field label="Headline" value={block.headline} onChange={(value) => onChange({ ...block, headline: value })} />
          <label className="grid gap-2">
            <span className="text-sm font-medium text-sand">Subheading</span>
            <textarea value={block.subheading} onChange={(event) => onChange({ ...block, subheading: event.target.value })} className="min-h-28 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none" />
          </label>
        </div>
      )}
      {block.type === 'richText' && <RichTextEditor value={block.html} onChange={(value) => onChange({ ...block, html: value })} />}
      {block.type === 'image' && (
        <div className="grid gap-4">
          <Field label="Image URL" value={block.src} onChange={(value) => onChange({ ...block, src: value })} />
          <Field label="Alt text" value={block.alt} onChange={(value) => onChange({ ...block, alt: value })} />
          <Field label="Caption" value={block.caption} onChange={(value) => onChange({ ...block, caption: value })} />
        </div>
      )}
      {block.type === 'cta' && (
        <div className="grid gap-4">
          <Field label="Label" value={block.label} onChange={(value) => onChange({ ...block, label: value })} />
          <Field label="Href" value={block.href} onChange={(value) => onChange({ ...block, href: value })} />
          <Field label="Supporting note" value={block.note} onChange={(value) => onChange({ ...block, note: value })} />
        </div>
      )}
    </div>
  </article>
);

const EditorView = ({ isNew = false }: { isNew?: boolean }) => {
  const { slug } = useParams();
  const { repo, config } = useRepo();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<PageDocument>(createPageDocument());
  const [sourceSha, setSourceSha] = useState('');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew || !repo || !slug) {
      setDoc(createPageDocument());
      setLoading(false);
      return;
    }
    const run = async () => {
      setLoading(true);
      try {
        const loaded = await loadPage(repo, config, slug);
        setDoc(loaded.doc);
        setSourceSha(loaded.sha);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [config, isNew, repo, slug]);

  const safeDoc = useMemo(() => ({
    ...doc,
    slug: slugify(doc.slug || doc.title),
    title: doc.title.trim() || 'Untitled page',
    description: doc.description.trim(),
    updatedAt: new Date().toISOString(),
    blocks: doc.blocks.map((block) => (block.type === 'richText' ? { ...block, html: sanitizeRichText(block.html) } : block)),
  }), [doc]);

  if (!repo || loading) return <LoadingScreen label="Loading editor" />;

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="grid flex-1 gap-4">
              <Field label="Title" value={doc.title} onChange={(value) => setDoc((current) => ({ ...current, title: value }))} />
              <Field label="Slug" value={doc.slug} onChange={(value) => setDoc((current) => ({ ...current, slug: slugify(value) }))} />
              <label className="grid gap-2">
                <span className="text-sm font-medium text-sand">Description</span>
                <textarea value={doc.description} onChange={(event) => setDoc((current) => ({ ...current, description: event.target.value }))} className="min-h-28 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none" />
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={async () => {
                  setSaving(true);
                  try {
                    await savePage(repo, config, safeDoc, sourceSha || undefined);
                    navigate('/');
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-mint px-5 py-3 font-semibold text-ink transition hover:bg-mint/90 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save page
              </button>
              {!isNew && (
                <button
                  onClick={async () => {
                    if (!window.confirm(`Delete ${safeDoc.slug}?`)) return;
                    setSaving(true);
                    try {
                      await deletePage(repo, config, safeDoc.slug);
                      navigate('/');
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-full border border-red-400/35 px-5 py-3 font-semibold text-red-200 transition hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-mint">Visual editor</p>
              <h2 className="mt-2 text-2xl font-bold">Build the page as blocks</h2>
            </div>
            <AddBlockMenu onAdd={(type) => setDoc((current) => ({ ...current, blocks: [...current.blocks, createBlock(type)] }))} />
          </div>

          <div className="mt-8 space-y-5">
            {doc.blocks.map((block, index) => (
              <BlockEditor
                key={block.id}
                block={block}
                index={index}
                total={doc.blocks.length}
                onChange={(next) => setDoc((current) => ({ ...current, blocks: current.blocks.map((item) => (item.id === next.id ? next : item)) }))}
                onRemove={() => setDoc((current) => ({ ...current, blocks: current.blocks.filter((item) => item.id !== block.id) }))}
                onMove={(direction) => setDoc((current) => ({ ...current, blocks: moveItem(current.blocks, index, direction) }))}
              />
            ))}
          </div>
        </section>
      </div>

      <section className="space-y-6 rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-mint">Generated HTML</p>
          <h2 className="mt-2 text-2xl font-bold">Live preview</h2>
          <p className="mt-3 text-sm leading-6 text-sand">
            This preview uses the same renderer that writes to <code>{getOutputPath(config, safeDoc.slug)}</code>.
          </p>
        </div>
        <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white">
          <iframe title="HTML preview" srcDoc={renderPageHtml(safeDoc, config)} className="h-[900px] w-full bg-white" />
        </div>
      </section>
    </div>
  );
};

const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <LoginPage />;
  return <>{children}</>;
};

export default function App() {
  const [repo, setRepo] = useState<Repo | null>(null);
  const [config, setConfig] = useState<CmsConfig>(DEFAULT_CONFIG);

  return (
    <AuthProvider>
      <RepoContext.Provider value={{ repo, setRepo, config, setConfig }}>
        <BrowserRouter>
          <AuthGate>
            {!repo ? (
              <RepoPicker />
            ) : (
              <AppShell>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/pages/new" element={<EditorView isNew />} />
                  <Route path="/pages/:slug" element={<EditorView />} />
                  <Route path="/settings" element={<SettingsView />} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </AppShell>
            )}
          </AuthGate>
        </BrowserRouter>
      </RepoContext.Provider>
    </AuthProvider>
  );
}
