/**
 * Modified from:
 * https://github.com/AleksandrHovhannisyan/aleksandrhovhannisyan.com/blob/d19a3e7e1414740cfa6f8704a264b56ed48c6ae0/packages/web/build.js
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import esbuild from 'esbuild';
import postcss from 'postcss';
import postcssImport from 'postcss-import';
import postcssUrl from 'postcss-url';

const isProductionBuild = process.env.ELEVENTY_ENV === 'production';

/**
 * Builds all assets for the site and returns an assets manifest.
 * @param {Object} options - Configuration options.
 * @param {string|undefined} options.pathPrefix - Optional URL path prefix to prepend
 *   to asset URLs. If provided, all generated asset references will be prefixed
 *   with this string (e.g. "/amr/"). If omitted or `undefined`, assets will be
 *   referenced from the root ("/").
 * @param {string} options.outputRoot - Root path to the output directory
 * @returns {Promise<Record<string, string>>}
 */
export async function buildAssets({
  pathPrefix,
  outputRoot = ''
}) {
  // Build scripts
  const scriptsBuildOutput = await esbuild.build({
    entryPoints: [
      'src/assets/scripts/pages/main.ts'
    ],
    outdir: `${outputRoot}/assets/scripts`,
    loader: {
      '.svg': 'text'
    },
    format: 'esm',
    bundle: true,
    splitting: true,
    entryNames: isProductionBuild ? '[dir]/[name]-[hash]' : '[dir]/[name]',
    sourcemap: true,
    minify: isProductionBuild,
    metafile: true, // <-- will output a json manifest for the build
    external: pathPrefix ? [`${pathPrefix}*`] : ['/assets/*']
  });

  // Build styles: concatenate imports, and, if needed, add prefix to urls referenced from css
  const stylesBuildOutput = await esbuild.build({
    entryPoints: [
      'src/assets/css/home-page.css',
      'src/assets/css/main-page.css',
      'src/assets/css/documentation-page.css'
    ],
    outdir: `${outputRoot}/assets/css`,
    loader: {
      '.css': 'css',
    },
    entryNames: isProductionBuild ? '[dir]/[name]-[hash]' : '[dir]/[name]',
    minify: isProductionBuild,
    metafile: true, // <-- will output a json manifest for the build
    // external: pathPrefix ? [`${pathPrefix}*`] : ['/assets/*'],
    plugins: [
      {
        name: 'postcss',
        setup(build) {
          build.onLoad({ filter: /\.css$/ }, async (args) => {
            const source = await fs.readFile(args.path, 'utf8');
            const result = await postcss([
              postcssImport(),
              postcssUrl({
                url: (asset) => {
                  // Only rewrite absolute /assets/... references
                  if (pathPrefix && asset.url.startsWith('/assets/')) {
                    return path.join(pathPrefix, asset.url);
                  }
                  return asset.url;
                }
              })
            ]).process(source, {
              from: args.path,
            });
            return { contents: result.css, loader: 'css' };
          });
        },
      },
    ],
  });

  const buildOutput = {
    ...scriptsBuildOutput.metafile.outputs,
    ...stylesBuildOutput.metafile.outputs
  };
  const assetsManifest = {};

  for (const [outputPath, { entryPoint }] of Object.entries(buildOutput)) {
    if (entryPoint) {
      assetsManifest[entryPoint] = outputPath;
    }
  }
  return assetsManifest;
}