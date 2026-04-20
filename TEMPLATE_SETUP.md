# Template Setup

This repository is meant to be used through **Use this template**.

Product name: `Thistleberry`
Subtitle: `Visual editing for Git-backed flat HTML sites`

## After creating your repo from the template

1. Open the new repository on GitHub.
2. Go to **Settings**.
3. Open **Pages**.
4. Under **Build and deployment**, set **Source** to **GitHub Actions**.
5. Return to the **Actions** tab and let the `Deploy Pages Site` workflow run.
6. Visit:
   - `https://username.github.io/repository-name`
   - or `https://username.github.io` if the repository itself is named `username.github.io`

## What the repo contains

- `.gitscribe/config.json`
  - CMS config
- `.gitscribe/pages/index.json`
  - source document for the starter homepage
- `site/index.html`
  - generated public homepage for GitHub Pages
- `.github/workflows/deploy-pages.yml`
  - deploys the `site/` directory to GitHub Pages

## Editing model

This repo keeps a strict split:

- edit structured source in `.gitscribe/pages`
- publish generated HTML in `site`

The Thistleberry app is the translation layer between those two.
