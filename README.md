# Tim Meko Portfolio 2025 v2

A modern portfolio website built with [Eleventy](https://11ty.dev) showcasing visual journalism, data visualization, and mapping work.

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

This starts the Eleventy development server with live reload at `http://localhost:8080`.

## Build

```bash
npm run build
```

Builds the site to the `_site` directory.

## CSV Data Ingestion

To populate content from CSV files:

```bash
npm run ingest
```

This reads CSV files from `../PORTFOLIO CSVs/` and creates markdown files for items where `include=1`.

Future image fetching capability:
```bash
npm run ingest:fetch
```

## Site Structure

**Grid-Based Layout:**
- **Featured Work**: 6 flagship mapping and visualization projects (3x2 desktop, 2x3 mobile)
- **Insights & Talks**: 6 external articles, presentations, and thought pieces (3x2 desktop, 2x3 mobile)  
- **Editing & Production**: 6 collaborative editing and production work items (3x2 desktop, 2x3 mobile)
- **More Work**: Additional portfolio pieces in a responsive grid (4-5 across desktop, 2 mobile)
- **About**: Background and contact information

## Collections

The site uses Eleventy collections for content organization:
- `flagship`: Featured mapping work (exactly 5 items)
- `insights`: Articles and talks that link externally
- `editing`: Editorial and production work  
- `more`: Additional portfolio work displayed in a grid

All collections are automatically sorted by date (newest first), with items missing dates appearing at the end sorted alphabetically by title.

## Design

The site uses a modern, responsive design with:
- Mobile-first responsive grid layouts
- CSS-only zoom effects for portfolio grids
- Clean typography and consistent spacing
- Accessible color contrast and semantic markup

## Content Management

Content is managed through:
- Individual markdown files in `src/` subdirectories
- CSV ingestion for bulk content import
- Front matter for metadata and configuration
- External linking for insights and editing work