const links = [...document.querySelectorAll(".nav-links a")];
const sections = links.map((link) => document.querySelector(link.getAttribute("href")));

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      for (const link of links) {
        const active = link.hash === `#${entry.target.id}`;
        if (active) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      }
    }
  }, { rootMargin: "-20% 0px -55% 0px", threshold: 0 });
  sections.forEach((section) => section && observer.observe(section));
}
