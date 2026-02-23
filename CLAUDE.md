# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal academic portfolio website for Yuxuan FAN, built with Jekyll using the Academic Pages template. The site is hosted on GitHub Pages at https://yuxuanfanOrion.github.io.

## Development Commands

```bash
# Install dependencies
bundle install

# Run local development server (auto-rebuilds on changes)
bundle exec jekyll serve -l -H localhost

# Alternative: Run with Docker
docker compose up
```

The site will be available at `localhost:4000`.

## Architecture

### Content Collections
- `_pages/` - Main site pages (about.md is the homepage at `/`)
- `_publications/` - Publication entries (markdown with YAML frontmatter)
- `_posts/` - Blog posts
- `_portfolio/`, `_talks/`, `_teaching/` - Additional content types (currently disabled in config)

### Key Configuration
- `_config.yml` - Site-wide settings, author info, enabled collections
- `_data/navigation.yml` - Header navigation links (most currently commented out)

### Theming & Layout
- `_layouts/` - Page templates (default.html, single.html, etc.)
- `_includes/` - Reusable HTML components
- `_sass/` - SCSS stylesheets
- `assets/` - CSS, JS, fonts, webfonts

### Static Files
- `images/` - Site images including profile photo and icons
- `files/` - Downloadable files (PDFs, etc.)

## Homepage Structure

The homepage (`_pages/about.md`) uses a custom single-page layout with sections:
- Profile cover with rotating background images
- Biography, Experiences, Education (timeline format)
- News, Publications, Services, Hobbies

## Workflow Rules

- After completing all file changes, always `git add` the changed files, commit with a descriptive message, and let the post-commit hook handle the push automatically.
- Use VPN proxy for git operations: `export https_proxy=http://127.0.0.1:7897 http_proxy=http://127.0.0.1:7897 all_proxy=socks5://127.0.0.1:7897`

## Adding Content

### New News
Add an entry to `_data/news.yml`:
```yaml
- date: "Mar 2026"
  text: "One paper accepted by ICML'26!"
```

### New Publication
Add an entry to `_data/publications.yml`:
```yaml
- title: "Paper Title"
  authors: '<b>Yuxuan Fan</b>, Co-Author'
  venue: "CVPR 2026"
  paper_url: "https://arxiv.org/abs/xxx"
  image: "/images/pub_xxx.png"      # optional
  code_url: "https://github.com/xxx" # optional
  project_url: "https://xxx"         # optional
```

### Enabling Navigation Sections
Uncomment entries in `_data/navigation.yml` and ensure corresponding collections are enabled in `_config.yml`.
