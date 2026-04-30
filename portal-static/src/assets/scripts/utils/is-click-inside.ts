export const isClickInside = ({
  event,
  element
}: {
  event: MouseEvent;
  element: HTMLElement;
}) => {
  const scope = element.getRootNode(); // document or a shadow root
  const scopeNode = event.composedPath()
    .find(node => (node as HTMLElement).getRootNode?.() === scope) as HTMLElement | undefined;
  
  // A semi-magical incantation, based on how the compareDocumentPosition method works
  // (it returns an integer used as bitmask)
  return Boolean(
    scopeNode && (
      (scopeNode === element) ||
      (element.compareDocumentPosition(scopeNode) & Node.DOCUMENT_POSITION_CONTAINED_BY)
    )
  );
};