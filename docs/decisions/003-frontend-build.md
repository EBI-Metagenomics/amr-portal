# Front-end build pipeline

Date: 2025-10-03

## Input

### Scripts
- Script files for client-side logic are written in typescript.
- The client-side logic is encapsulated into web components. To help with web components, Lit is used.
- Reusable components are pulled from `@ensembl/ensembl-elements-common` library

### Styles
- The styles are written in plain CSS, using the `@layer` directive for better management of the cascade.
- Styles are written in small css files, and combined into larger ones using the `@import` statement

### Templates
- HTML templates are written in the `nunjucks` templating language.
- Small shared templates that accept parameters (e.g. a `card-link` component) are implemented as nunjucks macros.

### SVG
To keep svg's in their original files (instead of making them part of nunjucks templates), a trick is used, in which a template has an inline `svg` tag that loads the `svg` file itself via the `use` directive:

```html
<svg>
  <use href="path-to-file.svg"></use>
</svg>
```

This approach was inspired by the way it is used on the lit.dev website for lazy svg loading ([link](https://github.com/lit/lit.dev/blob/main/packages/lit-dev-content/src/components/lazy-svg.ts))

## The build

### Static-site generator
The templates are combined into full html pages, and the files are copied into their final destination using [Eleventy](https://www.11ty.dev/). See the `frontend/eleventy.config.js` file for the entry point.

### The call to build static assets
Every time Eleventy renders the site, it first goes through what it calls the "data cascade" to collect all the data out of which the site is built. We hook into that cascade using the `addGlobalData` hook, and, while in it, we call the function that builds the static assets (scripts and styles; see `frontend/utils/build.js`). The output from that function is an assets manifest containing the mapping between the names of the input files, and the names of the output files, which Eleventy then can use to inject the appropriate paths into the html templates.

The setup for the build was modified from [this example](https://github.com/AleksandrHovhannisyan/aleksandrhovhannisyan.com/blob/master/packages/web/.eleventy.js) (also addressed in [this blog article](https://www.aleksandrhovhannisyan.com/notes/cache-busting-assets-in-eleventy/)).

### Transformation of the scripts
Typescript is transformed into javascript with the `esbuild` tool, which was chosen for its speed. During production build, `esbuild` adds hashes to the names of the output files for reliable caching and cache busting. See `frontend/utils/build.js` for the options of the tool, and list of typescript files that are used as entry points.

### Transformation of the styles
CSS styles are written in multiple small files for convenience, and imported into larger files. In production, that would result in multiple http requests to fetch all the styles before the site can be rendered; and so it makes sense to concatenate all style files into a few larger ones. This is done with `postcss` (specifically, `postcss-import` plugin) which is called by `esbuild` for the css loader. Additionally, another `postcss` plugin (`postcss-url`) updates urls to resources called from the css files (e.g. images or fonts) to include in them the `/amr/` path prefix.