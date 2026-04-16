export const focusFirstEligibleChild = (parent: Element | ShadowRoot) => {
  const focusableElement = parent.querySelector('[autofocus]');

  if (
    focusableElement &&
    'focus' in focusableElement && 
    typeof focusableElement.focus === 'function'
  ) {
    // give focusable element time to render
    requestAnimationFrame(() => {
      (focusableElement as HTMLElement).focus();
    });
  }
};