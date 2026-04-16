# Overall frontend setup

Date: 2025-10-03

## Background

As of October 2025, the requirements for the AMR site are as follows:

- The site will have a home page, an about page (or pages), and a help page (or pages)
  - These pages are likely to have mostly static content
    - However, it is not known at this stage how the design (and thus functionality) will evolve. (Consider the interactive elements on the help pages of the new Ensembl website, such as the megamenu, or the history buttons — it is unknown at this stage whether any of that will reappear on the AMR site.)
- The site will have a highly interactive page for main activity, on which the user interrogates the data about antimicrobial resistance by applying different filters.
- The site will be hosted on the EBI domain (ebi.ac.uk), with an `/amr/` pathname prefix — i.e. at https://www.ebi.ac.uk/amr
  - Therefore, it should have the branding (as well as, possibly, the look and feel) of an EBI site.
    - The minimum required elements of EBI branding are a header and a footer
    - For reference, EMBL look and feel is captured in the Visual Framework design system (https://stable.visual-framework.dev/)
    - Note that while the current version of Visual Framework is 2.0, EMBL-EBI header on EBI websites is, as of now, still inherited from the Visual framework 1.3

Beyond this, it is unknown, at least for developers, how the site will evolve.

## Considered options for front-end setup

Given that some pages of the site are highly interactive, while others are barely interactive at all, it seems appropriate to render the non-interactive pages on the server and to include the minimum amount of javascript in them; and, in contrast, to provide a mostly empty shell for highly interactive pages, where javascript will take over. Thus, different pages should, ideally, be treated differently.

We discussed different approaches to setting up the web front-end:
1. An entirely client-side-rendered application (every page needs to load a javascript bundle before it can show anything useful on the screen). Archetype: a Vite + React app
  - Advantages:
    - Very easy to set up, given the abundance of ready-made starter kits
    - Very little requirements for the backend (just an nginx server)
  - Disadvantages:
    - All pages are loaded the same, even those that do not need the javascript. Philosophically, this goes against the grain of traditional web development. Plus, the bundle size inflates.
    - This approach offers no control over the server (http status codes, meta tags in the html, speculation rules for resource prefetching)
2. A full-fledged client/server framework on top of one of the popular front-end libraries. Archetype: a Next.js app
  - Advantages:
    - Easy to set up given availability of starter kits
    - Some pages can be rendered on the server if needed, whereas others can be rendered on the client
    - Provides some degree of control over the server
    - Can treat different pages differently, loading smaller bundles on some pages, and larger bundles on others.
  - Disadvantages:
    - Overreliance on a third-party framework that we do not control
    - Higher requirements for back-end resources compared to option 1
3. Pre-generated html pages with islands of reactivity. Archetype: a site built with a static site generator, such as Astro, Eleventy, Hugo, etc.
  - Advantages:
    - Pages are generated at build time, and load quickly
    - Compared to approach 1 above, this approach offers full control over the html content of different pages when they are sent to the browser, allowing for differential loading of resources, or different hints to the browsr about the priiority of resources to load
  - Disadvantages:
    - May become cumbersome if there are multiple pages
4. Merging the frontend with the backend, i.e. making the python server responsible not just for sending json api payloads, but also for the rendering of html pages. Archetype: a Rails, Django, or Laravel app.
  - Advantages:
    - Full control over the content of html sent to the client
    - Full control over http headers, which approaches 1 and 3 lack
    - Access to all backend methods at request time. For example, the design includes the data release date in the header. With approaches 1 and 3, this would require an additional request to the server, whereas approaches 2 and 4 would allow the date to be injected into html at render time on the server.
  - Disadvantages
    - Given that the backend, until now, has been developed with FastAPI, this approach would require either a custom integration of an asset pipeline (setup that builds js and css), or migration to a different backend (e.g. Django)

## Decisions
Given the above considerations, it seems appropriate to use a static-site generator for building the AMR site, because:
- This should be low-maintenance
- This would let us treat barely interactive pages differently from highly interactive ones
- This would require little resources for running the back-end server

Of static-site generators, Eleventy is a good candidate, given that it:
- Has a javascript API (easy for front-end developers)
- Is fairly simple, and stable
- Is very tweakable