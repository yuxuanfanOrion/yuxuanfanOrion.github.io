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

Sub-pages share the homepage's theme through `_layouts/subpage.html`:
- `/projects/` (`_pages/projects.md`, data in `_data/projects.yml`)
- `/blog/` (`_pages/blog.md`, a placeholder until posts exist)

## Workflow Rules

- After completing all file changes, always `git add` the changed files, commit with a descriptive message, and let the post-commit hook handle the push automatically.
- Git operations connect directly (currently in Singapore). Do not set an http/https proxy.

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

### New Project
Add an entry to `_data/projects.yml` (shown on the Projects page `/projects/`, in file order):
```yaml
- name: "Project Name"
  kind: "Foundation model"            # or "Open source", ...
  org: "Team, Company"
  period: "Jan. 2026 – Mar. 2026"     # optional
  logo: "/images/icon/xxx.png"        # optional, shown on the nebula
  sky: cosmic-cliffs                  # a nebula id from _data/nebulae.yml
  image: "/images/project_xxx.png"    # optional, replaces the nebula and logo
  text: "One or two sentences on the part played."
  links:
    - label: "GitHub"
      url: "https://github.com/xxx"
```

### Enabling Navigation Sections
Uncomment entries in `_data/navigation.yml` and ensure corresponding collections are enabled in `_config.yml`.
