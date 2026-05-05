/* Inspired by METT portal docs customizations. */
(function () {
  const link = document.createElement("link");
  link.rel = "preconnect";
  link.href = "https://fonts.googleapis.com";
  document.head.appendChild(link);

  const link2 = document.createElement("link");
  link2.rel = "preconnect";
  link2.href = "https://fonts.gstatic.com";
  link2.crossOrigin = "";
  document.head.appendChild(link2);

  const titleObserver = new MutationObserver(function () {
    const topbarLink = document.querySelector(".swagger-ui .topbar .topbar-wrapper .link");
    if (!topbarLink) return;
    topbarLink.textContent = "AMR Data Portal API";
    topbarLink.setAttribute("href", "/");
    titleObserver.disconnect();
  });

  titleObserver.observe(document.body, { childList: true, subtree: true });

  fetch("/api/release")
    .then(function (response) {
      if (!response.ok) return null;
      return response.json();
    })
    .then(function (data) {
      if (!data || !data.label) return;
      var releaseEl = document.getElementById("amr-docs-release-date");
      if (releaseEl) {
        releaseEl.textContent = data.label;
      }
    })
    .catch(function () {
      // Ignore release rendering failures on docs page.
    });
})();
