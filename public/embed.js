(function () {
  "use strict";

  var scriptTag = document.currentScript;
  if (!scriptTag) return;

  var skedHost = new URL(scriptTag.src).origin;

  var slug = scriptTag.getAttribute("data-slug");
  if (!slug) {
    console.error("SKED embed: missing data-slug attribute");
    return;
  }

  var primaryColor = scriptTag.getAttribute("data-primary") || "#b9f34b";
  var buttonText = scriptTag.getAttribute("data-button-text") || "Book now";

  // Create container
  var container = document.createElement("div");
  container.className = "slotly-embed-widget";
  container.style.cssText =
    "font-family: Inter, system-ui, sans-serif; max-width: 420px; margin: 0 auto;";

  // Create toggle button
  var toggleBtn = document.createElement("button");
  toggleBtn.textContent = buttonText;
  toggleBtn.style.cssText =
    "display: inline-flex; align-items: center; justify-content: center; " +
    "height: 44px; padding: 0 24px; border: none; border-radius: 12px; " +
    "font-size: 14px; font-weight: 600; cursor: pointer; transition: all 200ms; " +
    "background-color: " + primaryColor + "; color: #171a16;";

  toggleBtn.addEventListener("mouseenter", function () {
    toggleBtn.style.transform = "translateY(-1px)";
    toggleBtn.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
  });
  toggleBtn.addEventListener("mouseleave", function () {
    toggleBtn.style.transform = "";
    toggleBtn.style.boxShadow = "";
  });

  // Create iframe (hidden initially)
  var iframe = document.createElement("iframe");
  iframe.src = skedHost + "/embed/" + slug;
  iframe.style.cssText =
    "width: 100%; height: 0; border: none; border-radius: 16px; " +
    "overflow: hidden; transition: height 300ms ease; margin-top: 0; box-shadow: 0 8px 32px rgba(0,0,0,0.1);";
  iframe.allow = "payment";

  // Toggle open/close
  var isOpen = false;
  toggleBtn.addEventListener("click", function () {
    isOpen = !isOpen;
    if (isOpen) {
      iframe.style.height = "520px";
      iframe.style.marginTop = "12px";
      toggleBtn.textContent = "Close";
    } else {
      iframe.style.height = "0";
      iframe.style.marginTop = "0";
      toggleBtn.textContent = buttonText;
    }
  });

  container.appendChild(toggleBtn);
  container.appendChild(iframe);
  scriptTag.parentNode.insertBefore(container, scriptTag);
})();
