# Thistleberry

Thistleberry is a template repository for visually editing Git-backed flat HTML sites.

This repository is shaped like a **template repo**, not a blank CMS shell.

The intended flow is:

1. Click **Use this template**
2. Create your new repository
3. In the new repo, open **Settings > Pages**
4. Set **Build and deployment > Source** to **GitHub Actions**
5. Push to `main` or run the workflow once
6. Visit `https://username.github.io/repository-name`

That URL will already have a starter onboarding page waiting in `site/index.html`.

Subtitle:

`Visual editing for Git-backed flat HTML sites`

## Repository contract

This project keeps a strict separation between:

- source content in `.gitscribe/pages/*.json`
- generated public HTML in `site/*.html`
- CMS config in `.gitscribe/config.json`
- Pages deployment in `.github/workflows/deploy-pages.yml`

The Thistleberry app edits the source layer and renders the final HTML layer.

## Starter files included

- [TEMPLATE_SETUP.md](/D:/GIT/Mine/gitcms/TEMPLATE_SETUP.md)
- [.gitscribe/config.json](/D:/GIT/Mine/gitcms/.gitscribe/config.json)
- [.gitscribe/pages/index.json](/D:/GIT/Mine/gitcms/.gitscribe/pages/index.json)
- [site/index.html](/D:/GIT/Mine/gitcms/site/index.html)
- [.github/workflows/deploy-pages.yml](/D:/GIT/Mine/gitcms/.github/workflows/deploy-pages.yml)

## Local CMS development

Create a `.env` file with:

```bash
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
APP_URL=http://localhost:3000
COOKIE_SECRET=change-me
```

Then run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Current shape

- public site deploys from `site/`
- homepage starter content ships in the template
- local CMS remains the authoring tool for structured edits

What this does **not** do yet:

- run the CMS itself on GitHub Pages
- upload repo assets from the public Pages site
- create PR-based editorial workflows
