// Content script: scrapes LinkedIn profile data
// Listens for SCRAPE_PROFILE message from popup

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "SCRAPE_PROFILE") {
    scrapeProfile().then((data) => {
      sendResponse({ success: true, data });
    });
  }
  return true; // keep channel open for async response
});

async function scrapeProfile() {
  return {
    firstName: getFirstName(),
    lastName: getLastName(),
    linkedinUrl: getLinkedinUrl(),
    currentPosition: getCurrentPosition(),
    currentCompany: getCurrentCompany(),
    profilePhotoUrl: getProfilePhotoUrl(),
    headline: getHeadline(),
    bio: getBio(),
    location: getLocation(),
    pastExperiences: getPastExperiences(),
    education: getEducation(),
    skills: getSkills(),
    languages: getLanguages(),
    connectionCount: getConnectionCount(),
    recentPosts: await getRecentPosts(),
  };
}

// --- Section detection (FR + EN) ---

const SECTION_ALIASES = {
  about: ["about", "infos", "à propos", "a propos"],
  experience: ["experience", "expérience", "expériences", "experiencia"],
  education: ["education", "formation", "formations", "formación"],
  skills: ["skills", "compétences", "competences", "compétence"],
  languages: ["languages", "langues", "langue", "idiomas"],
  activity: ["activity", "activité", "activite", "actividad"],
  "recent-activity": ["recent-activity", "activité récente", "activite recente"],
};

function getSection(id) {
  const anchor = document.getElementById(id);
  if (anchor) {
    const section =
      anchor.closest("section") ||
      anchor.parentElement?.closest("section");
    if (section) return section;
  }

  const aliases = SECTION_ALIASES[id] || [id];

  const sections = document.querySelectorAll("section");
  for (const section of sections) {
    const idEls = section.querySelectorAll("[id]");
    for (const el of idEls) {
      if (aliases.includes(el.id.toLowerCase())) return section;
    }

    const heading = section.querySelector("h2");
    if (heading) {
      const text = heading.textContent.toLowerCase().trim();
      for (const alias of aliases) {
        if (text.includes(alias)) return section;
      }
    }
  }

  return null;
}

// --- Name ---

function getFullName() {
  const selectors = [
    "h1.text-heading-xlarge",
    "h1.inline.t-24",
    ".pv-top-card--list h1",
    "h1",
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.textContent.trim()) return el.textContent.trim();
  }
  return "";
}

function getFirstName() {
  const full = getFullName();
  if (!full) return "";
  const parts = full.split(/\s+/);
  return parts[0] || "";
}

function getLastName() {
  const full = getFullName();
  if (!full) return "";
  const parts = full.split(/\s+/);
  return parts.slice(1).join(" ") || "";
}

// --- LinkedIn URL ---

function getLinkedinUrl() {
  const url = window.location.href;
  const match = url.match(/https:\/\/www\.linkedin\.com\/in\/[^/?]+/);
  return match ? match[0] + "/" : url.split("?")[0];
}

// --- Current Position & Company ---

function getCurrentPosition() {
  const expSection = getSection("experience");
  if (expSection) {
    const title = expSection.querySelector(
      ".display-flex.align-items-center .mr1 .visually-hidden, " +
        "li .display-flex .mr1 span[aria-hidden='true'], " +
        "li span.t-bold span[aria-hidden='true']"
    );
    if (title && title.textContent.trim()) return title.textContent.trim();

    const bold = expSection.querySelector(
      "span.t-bold span, span.t-14.t-bold"
    );
    if (bold && bold.textContent.trim()) return bold.textContent.trim();
  }

  return (
    getHeadline().split(" chez ")[0].split(" at ")[0].split(" - ")[0] || ""
  );
}

function getCurrentCompany() {
  const expSection = getSection("experience");
  if (expSection) {
    const subtitle = expSection.querySelector(
      "li .t-14.t-normal span[aria-hidden='true'], " +
        "li span.t-normal:not(.t-bold) span[aria-hidden='true']"
    );
    if (subtitle && subtitle.textContent.trim()) {
      return subtitle.textContent.trim().split(" · ")[0].trim();
    }
  }

  const headline = getHeadline();
  const chezMatch = headline.match(/chez\s+(.+)/i);
  if (chezMatch) return chezMatch[1].split("|")[0].trim();
  const atMatch = headline.match(/at\s+(.+)/i);
  if (atMatch) return atMatch[1].split("|")[0].trim();

  return "";
}

// --- Profile Photo ---

function getProfilePhotoUrl() {
  const selectors = [
    ".pv-top-card-profile-picture__image--show",
    ".pv-top-card__photo img",
    "img.profile-photo-edit__preview",
    ".ember-view.profile-photo-edit img",
  ];
  for (const sel of selectors) {
    const img = document.querySelector(sel);
    if (img && img.src && !img.src.includes("ghost")) return img.src;
  }

  const topCard = document.querySelector(
    ".pv-top-card, .scaffold-layout__main"
  );
  if (topCard) {
    const imgs = topCard.querySelectorAll("img");
    for (const img of imgs) {
      if (img.width >= 100 && img.src && !img.src.includes("ghost")) {
        return img.src;
      }
    }
  }
  return "";
}

// --- Headline ---

function getHeadline() {
  const selectors = [
    ".text-body-medium.break-words",
    ".pv-top-card--list .text-body-medium",
    "div.text-body-medium",
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.textContent.trim()) return el.textContent.trim();
  }
  return "";
}

// --- Bio (About section) ---

function getBio() {
  const aboutSection = getSection("about");
  if (!aboutSection) return "";

  const contentSelectors = [
    ".inline-show-more-text span[aria-hidden='true']",
    ".pv-shared-text-with-see-more span[aria-hidden='true']",
    ".inline-show-more-text",
    ".pv-shared-text-with-see-more span.visually-hidden",
    ".display-flex.full-width .inline-show-more-text",
  ];

  for (const sel of contentSelectors) {
    const el = aboutSection.querySelector(sel);
    if (el && el.textContent.trim()) {
      const text = el.textContent.trim();
      if (text.length > 20 || !/^(infos|about|a propos)$/i.test(text)) {
        return text;
      }
    }
  }

  const allSpans = aboutSection.querySelectorAll("span[aria-hidden='true']");
  for (const span of allSpans) {
    const text = span.textContent.trim();
    if (text.length > 30) return text;
    if (
      text.length > 5 &&
      !/^(infos|about|a propos|voir plus|see more)$/i.test(text) &&
      !span.closest("h2, h3, .pvs-header__container")
    ) {
      return text;
    }
  }

  return "";
}

// --- Location ---

function getLocation() {
  const selectors = [
    ".text-body-small.inline.t-black--light.break-words",
    ".pv-top-card--list .t-black--light",
    "span.text-body-small.t-black--light",
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.textContent.trim()) return el.textContent.trim();
  }
  return "";
}

// --- Experience — returns ALL experiences as JSON array ---

function getPastExperiences() {
  const expSection = getSection("experience");
  if (!expSection) return [];

  const items = expSection.querySelectorAll(
    "li.artdeco-list__item, " +
      "li.pvs-list__paged-list-item, " +
      "ul.pvs-list > li"
  );
  if (items.length === 0) return [];

  const experiences = [];
  for (let i = 0; i < items.length && experiences.length < 8; i++) {
    const item = items[i];

    const title = getTextFromItem(
      item,
      "span.mr1.hoverable-link-text.t-bold span[aria-hidden='true'], " +
        "span.t-bold span[aria-hidden='true'], " +
        "div.t-bold span[aria-hidden='true'], " +
        "span.t-bold"
    );
    if (!title) continue;

    const companyRaw = getTextFromItem(
      item,
      "span.t-14.t-normal:not(.t-black--light) span[aria-hidden='true'], " +
        "span.t-normal:not(.t-bold) span[aria-hidden='true']"
    );
    const company = companyRaw ? companyRaw.split(" · ")[0].trim() : "";

    const lightSpans = item.querySelectorAll(
      "span.t-14.t-normal.t-black--light span[aria-hidden='true'], " +
        "span.t-black--light span[aria-hidden='true']"
    );
    const duration =
      lightSpans.length > 0 ? lightSpans[0].textContent.trim() : "";
    const location =
      lightSpans.length > 1 ? lightSpans[1].textContent.trim() : "";

    const exp = { title, company };
    if (duration) exp.duration = duration;
    if (location) exp.location = location;
    experiences.push(exp);
  }

  return experiences;
}

// --- Education ---

function getEducation() {
  const eduSection = getSection("education");
  if (!eduSection) return "";

  const items = eduSection.querySelectorAll(
    "li.artdeco-list__item, " +
      "li.pvs-list__paged-list-item, " +
      "ul.pvs-list > li, " +
      "ul > li"
  );
  const entries = [];
  for (let i = 0; i < items.length && i < 5; i++) {
    const school = getTextFromItem(
      items[i],
      "span.mr1.hoverable-link-text.t-bold span[aria-hidden='true'], " +
        "span.t-bold span[aria-hidden='true'], " +
        "span.t-bold"
    );
    const degree = getTextFromItem(
      items[i],
      "span.t-14.t-normal:not(.t-black--light) span[aria-hidden='true'], " +
        "span.t-normal:not(.t-bold) span[aria-hidden='true']"
    );
    if (school) {
      entries.push(degree ? `${school} - ${degree}` : school);
    }
  }
  return entries.join(" | ");
}

// --- Skills ---

function getSkills() {
  const skillsSection = getSection("skills");
  if (!skillsSection) return "";

  const items = skillsSection.querySelectorAll(
    "span.mr1.hoverable-link-text.t-bold span[aria-hidden='true'], " +
      "span.t-bold span[aria-hidden='true'], " +
      ".mr1.hoverable-link-text span[aria-hidden='true'], " +
      "li span.t-bold"
  );
  const skills = [];
  const skipPattern =
    /^(comp[eé]tences?|skills?|voir plus|voir les|see more|see all|\d)/i;
  for (const item of items) {
    const text = item.textContent.trim();
    if (text && !skills.includes(text) && !skipPattern.test(text)) {
      skills.push(text);
    }
  }
  return skills.slice(0, 15).join(", ");
}

// --- Languages ---

function getLanguages() {
  const langSection = getSection("languages");
  if (!langSection) return "";

  const items = langSection.querySelectorAll(
    "span.mr1.hoverable-link-text.t-bold span[aria-hidden='true'], " +
      "span.t-bold span[aria-hidden='true'], " +
      "li span.t-bold"
  );
  const langs = [];
  const skipPattern =
    /^(langues?|languages?|voir plus|voir les|see more|see all|\d)/i;
  for (const item of items) {
    const text = item.textContent.trim();
    if (text && !langs.includes(text) && !skipPattern.test(text)) {
      langs.push(text);
    }
  }
  return langs.join(", ");
}

// --- Connection Count ---

function getConnectionCount() {
  const selectors = [
    ".t-bold.text-body-small",
    "span.t-bold",
    ".pv-top-card--list .t-bold",
  ];
  for (const sel of selectors) {
    const els = document.querySelectorAll(sel);
    for (const el of els) {
      const text = el.textContent.trim();
      const parent = el.closest("li, span, a");
      const parentText = parent ? parent.textContent : "";
      if (/connexion|connection|relation/i.test(parentText)) {
        const num = text.replace(/[+,.\s]/g, "");
        const parsed = parseInt(num, 10);
        if (!isNaN(parsed)) return parsed;
      }
    }
  }

  const body = document.body.textContent || "";
  const match = body.match(
    /(\d[\d,. ]*)\+?\s*(?:connexion|connection|relation)/i
  );
  if (match) {
    const parsed = parseInt(match[1].replace(/[,.\s]/g, ""), 10);
    if (!isNaN(parsed)) return parsed;
  }

  return null;
}

// --- Recent Posts — SPA navigation to /recent-activity/all/ ---

async function getRecentPosts() {
  try {
    // Find the activity link on the profile page
    const activityLink = document.querySelector(
      'a[href*="recent-activity/all"]'
    );
    if (!activityLink) return [];

    // Click to trigger LinkedIn SPA navigation (no page reload)
    activityLink.click();

    // Wait for posts to render in the DOM
    const posts = await waitForPosts();

    // Navigate back to the profile page
    history.back();

    return posts;
  } catch (_) {
    // If anything fails, try to go back and return empty
    try { history.back(); } catch (_) {}
    return [];
  }
}

function waitForPosts(timeout = 8000) {
  return new Promise((resolve) => {
    const start = Date.now();

    function check() {
      const els = document.querySelectorAll(
        ".update-components-text span[dir='ltr']"
      );
      const posts = [];
      const seen = new Set();

      for (const el of els) {
        if (posts.length >= 5) break;
        const content = el.textContent.trim();
        if (content.length > 30 && !seen.has(content)) {
          seen.add(content);
          posts.push({ content });
        }
      }

      if (posts.length > 0) {
        resolve(posts.slice(0, 5));
      } else if (Date.now() - start > timeout) {
        resolve([]);
      } else {
        setTimeout(check, 500);
      }
    }

    // Start checking after a short delay for SPA navigation
    setTimeout(check, 1000);
  });
}

// --- Helpers ---

function getTextFromItem(item, selector) {
  const el = item.querySelector(selector);
  return el ? el.textContent.trim() : "";
}
