import { JSDOM } from 'jsdom';

/**
 * REFERENCES:
 * - Example of html transform using jsdom: https://www.garrettbland.com/projects/eleventy-image-plugins
 * - Example of html transform using cheerio: https://www.martingunnarsson.com/posts/eleventy-customizing-external-links/
 */

export async function documentationPageTransform(content) {
  // TODO: decide how to pick pages on which to apply this transform

  if (this.page.inputPath.endsWith('.md')) {
    const dom = new JSDOM(content);
    const document = dom.window.document;
    const mainSection = document.querySelector('main');

    if (!mainSection) {
      // abort mission
      return content;
    }

    buildTableOfContents({
      mainContainer: mainSection,
      document
    });
    updateExternalLinks(mainSection);

    return dom.serialize();
  }

  return content; // no changes made.
};

const buildTableOfContents = ({
  mainContainer,
  document
}) => {
  // get the target element 
  const tocContainer = mainContainer.querySelector('.table-of-contents .links');

  if (!tocContainer) {
    return;
  }

  // NOTE: would be nice to exclude the h1
  const headings = mainContainer.querySelectorAll('h1, h2');
  const seenHeadingsMap = new Map();

  headings.forEach((heading) => {
    const tocElement = createTOCElement({ heading, document, seenHeadingsMap });
    tocContainer.appendChild(tocElement);
  });
}

const createTOCElement = ({
  document,
  heading,
  seenHeadingsMap
}) => {
  const headingText = heading.textContent;
  let headingId;

  if (seenHeadingsMap.get(headingText)) {
    const seenCount = seenHeadingsMap.get(headingText);
    const newCount = seenCount + 1;
    headingId = createHeadingId({ text: headingText, newCount });
    seenHeadingsMap.set(headingText, newCount);
  } else {
    headingId = createHeadingId({ text: headingText });
    seenHeadingsMap.set(headingText, 1);
  }
  heading.setAttribute('id', headingId);

  const tocElement = document.createElement('li');
  const innerHtml = `
    <a href="#${headingId}">${headingText}</a>
  `;
  tocElement.insertAdjacentHTML('beforeend', innerHtml);
  return tocElement;
}

const createHeadingId = ({ text, count }) => {
  let id = text.replaceAll(' ', '-');
  if (count) {
    id = `${id}-${count}`;
  }
  return id;
};


const updateExternalLinks = (mainContainer) => {
  const externalLinks = mainContainer.querySelectorAll('a[href^="http"]');
  externalLinks.forEach(linkElement => updateExternalLink(linkElement));
}


const updateExternalLink = (linkElement) => {
  linkElement.setAttribute('target', '_blank');
  linkElement.setAttribute('rel', 'noopener noreferrer');
};