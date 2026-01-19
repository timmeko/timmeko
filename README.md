# Tim Meko Portfolio (2025 v2)

A modern, high-performance portfolio site built with [Eleventy](https://11ty.dev). This documentation serves as a guide for both humans and AI agents (like Antigravity/Claude) to maintain and update the site.

## 🚀 Quick Start

1. **Install Dependencies**: `npm install`
2. **Local Development**: `npm run dev` (Starts server at `http://localhost:8080`)
3. **Run Full Build**: `npm run build` (Includes image optimization and site generation)

---

## 🛠 Content Management Workflow

### 1. Adding Portfolio Items (The "Master" CSV)
Most content is driven by `data/portfolio_combined.csv`.
- **To add an item**: Add a row to the CSV.
- **Multi-line Descriptions**: The ingestion script uses `papaparse`, so you can include line breaks within quoted fields in the CSV without breaking the build.
- **Images**: Reference the image by filename (e.g., `my-project.jpg`).

### 2. Processing Data
After updating the CSV, generate the Markdown files:
```bash
npm run csv-to-md
```
This script (located in `scripts/csv-to-md.js`) transforms the CSV rows into individual `.md` files in `src/maps/`, `src/editing/`, and `src/more/`.

### 3. Image Optimization
The site uses a "Raw to Optimized" pipeline:
1. Place high-res assets in `img/raw/`.
2. Run `npm run build` or `npm run optimize-images`.
3. The script (located in `scripts/optimize-images.js`) generates AVIF and JPEG versions in `img/optimized/` at multiple sizes (hero, large, medium, thumb).
4. **Pass-through**: `.eleventy.js` is configured to copy the `img/optimized` folder to `_site/img/optimized`.

### 4. AI Context Profile
The file `src/assets/tim-meko-context.txt` is a synthesized profile designed to be fed into LLMs (ChatGPT, Claude, Gemini) for accurate background retrieval.
- **Update**: Edit this file whenever your leadership philosophy, toolset, or key projects change.
- **Download**: It is automatically included in the site's downloads for visitors.

---

## 🧩 Site Structure & Collections

- **Featured Work** (`collections.flagship`): Driven by files in `src/maps/`.
- **Stories I shaped** (`collections.editing`): Driven by files in `src/editing/`.
- **More Work** (`collections.more`): Driven by files in `src/more/`.
- **Insights** (`collections.insights`): Driven by files in `src/insights/`.

**Sorting**: Most collections are sorted by `date` (newest first).

---

## ⚠️ Important Implementation Notes (The "Headaches" log)

- **CSV Quote Handling**: *Never* manually split the CSV by `\n`. Always use a library like `papaparse` to handle quoted multi-line fields.
- **Layout Errors**: Ensure every Markdown file has a valid `layout`. Most use `base` or `article`. A missing layout will cause Eleventy to fail silently or throw cryptic errors.
- **Image Paths**: When adding items, ensure the `hero` or `image` path in front matter matches the generated optimized path (usually `img/optimized/thumb/filename.jpg` for grids).
- **Pass-through Config**: If images aren't showing up in `_site`, check `.eleventy.js` to ensure the directory is in `addPassthroughCopy`.

---

## 🧪 Experiments
- **A/B Testing**: The site includes an `ab-test-controller` in `index.njk` to toggle between a scrolling hero and a traditional hero. Config is located in `src/_data/abtest.json`.
- **AI Chatbot CTA**: The chatbot section encourages users to copy prompts for AI research. The "Beta" label and styles are managed in `index.njk` and `theme.css`.