import { CmsConfig, DEFAULT_CONFIG, PageDocument, getOutputPath, getSourcePath, renderPageHtml } from './cms';

export type RequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  data?: unknown;
};

export type Repo = {
  full_name: string;
  name: string;
  default_branch: string;
};

export type GitHubContent = {
  content: string;
  sha: string;
  name: string;
  path: string;
};

export const CONFIG_PATH = '.gitscribe/config.json';

export const request = async (url: string, options: RequestOptions = {}) => {
  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    body: options.data ? JSON.stringify(options.data) : undefined,
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(data?.message || data?.error || 'Request failed');
    (error as any).response = { status: response.status, data };
    throw error;
  }

  return { data };
};

export const encodeBase64 = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

export const decodeBase64 = (value: string) => {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

export const fetchContentFile = async (repo: Repo, path: string) => {
  const { data } = await request(`/api/github/repos/${repo.full_name}/contents/${path}`);
  return data as GitHubContent;
};

export const getOptionalContentFile = async (repo: Repo, path: string) => {
  try {
    return await fetchContentFile(repo, path);
  } catch (error: any) {
    if (error.response?.status === 404) return null;
    throw error;
  }
};

export const saveFile = async (repo: Repo, path: string, text: string, message: string, sha?: string) => {
  const payload: Record<string, unknown> = {
    message,
    branch: repo.default_branch,
    content: encodeBase64(text),
  };

  if (sha) payload.sha = sha;

  return request(`/api/github/repos/${repo.full_name}/contents/${path}`, {
    method: 'PUT',
    data: payload,
  });
};

export const deleteFile = async (repo: Repo, path: string, sha: string, message: string) =>
  request(`/api/github/repos/${repo.full_name}/contents/${path}`, {
    method: 'DELETE',
    data: {
      message,
      branch: repo.default_branch,
      sha,
    },
  });

export const loadConfig = async (repo: Repo) => {
  const file = await getOptionalContentFile(repo, CONFIG_PATH);
  if (!file) return { config: DEFAULT_CONFIG, sha: '' };
  return {
    config: { ...DEFAULT_CONFIG, ...JSON.parse(decodeBase64(file.content)) } as CmsConfig,
    sha: file.sha,
  };
};

export const loadPages = async (repo: Repo, config: CmsConfig) => {
  try {
    const { data } = await request(`/api/github/repos/${repo.full_name}/contents/${config.sourceDir}`);
    const entries = (data as GitHubContent[]).filter((item) => item.name.endsWith('.json'));
    const pages = await Promise.all(
      entries.map(async (entry) => {
        const raw = await fetchContentFile(repo, entry.path);
        return JSON.parse(decodeBase64(raw.content)) as PageDocument;
      }),
    );

    return pages.sort((a, b) => a.slug.localeCompare(b.slug));
  } catch (error: any) {
    if (error.response?.status === 404) return [];
    throw error;
  }
};

export const loadPage = async (repo: Repo, config: CmsConfig, slug: string) => {
  const sourceFile = await fetchContentFile(repo, getSourcePath(config, slug));
  const doc = JSON.parse(decodeBase64(sourceFile.content)) as PageDocument;
  return { doc, sha: sourceFile.sha };
};

export const savePage = async (
  repo: Repo,
  config: CmsConfig,
  doc: PageDocument,
  sourceSha?: string,
) => {
  const sourcePath = getSourcePath(config, doc.slug);
  const outputPath = getOutputPath(config, doc.slug);
  const existingHtml = await getOptionalContentFile(repo, outputPath);

  await saveFile(
    repo,
    sourcePath,
    JSON.stringify(doc, null, 2),
    `cms: save source for ${doc.slug}`,
    sourceSha,
  );

  await saveFile(
    repo,
    outputPath,
    renderPageHtml(doc, config),
    `cms: render html for ${doc.slug}`,
    existingHtml?.sha,
  );
};

export const deletePage = async (repo: Repo, config: CmsConfig, slug: string) => {
  const sourcePath = getSourcePath(config, slug);
  const outputPath = getOutputPath(config, slug);
  const sourceFile = await getOptionalContentFile(repo, sourcePath);
  const outputFile = await getOptionalContentFile(repo, outputPath);

  if (sourceFile) {
    await deleteFile(repo, sourcePath, sourceFile.sha, `cms: delete source for ${slug}`);
  }

  if (outputFile) {
    await deleteFile(repo, outputPath, outputFile.sha, `cms: delete html for ${slug}`);
  }
};
