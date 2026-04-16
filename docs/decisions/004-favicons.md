# Favicons

Date: 2025-10-14

Acccording to a [guideline](https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs) on which assets to use for a favicon on a modern website, the list of files required for a robust favicon can be reduced to a very short one.

The repository of the Visual Framework has a [directory](https://github.com/visual-framework/vf-core/tree/35b4b18a0be6bac26391cdf00fee9aa2a05d4efe/components/embl-favicon) of assets for EMBL-EBI favicon, and a snippet of markup demoing their use. However:

- It does not include an svg file, although modern browsers seem to have good support for svgs
- It has files that no longer seem to be necessary (such as a black-and-white mask file for pinned Safari tabs)

Because of this, I am taking favicon.ico and apple-touch-icon.png (180x180px) from the Visual Framework repo, and adding an svg of the EMBL hexagon (adenovirus) image, which I created out of the svg of the full EMBL logo from Wikimedia ([link](https://commons.wikimedia.org/wiki/File:EMBL_logo.svg)).