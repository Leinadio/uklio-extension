// State elements
const states = {
  NOT_LINKEDIN: document.getElementById("state-not-linkedin"),
  NOT_AUTH: document.getElementById("state-not-auth"),
  LOADING: document.getElementById("state-loading"),
  MAIN: document.getElementById("state-main"),
  SUCCESS: document.getElementById("state-success"),
  ERROR: document.getElementById("state-error"),
};

// UI elements
const profilePhoto = document.getElementById("profile-photo");
const profileName = document.getElementById("profile-name");
const profileHeadline = document.getElementById("profile-headline");
const profilePosition = document.getElementById("profile-position");
const completenessValue = document.getElementById("completeness-value");
const completenessFill = document.getElementById("completeness-fill");
const campaignSelect = document.getElementById("campaign-select");
const btnAdd = document.getElementById("btn-add");
const btnRetry = document.getElementById("btn-retry");
const errorMessage = document.getElementById("error-message");

let scrapedData = null;

// --- State management ---

function showState(state) {
  Object.values(states).forEach((el) => el.classList.add("hidden"));
  states[state].classList.remove("hidden");
}

// --- Init ---

document.addEventListener("DOMContentLoaded", init);

async function init() {
  // 1. Check if on LinkedIn profile
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url || !tab.url.match(/linkedin\.com\/in\//)) {
    showState("NOT_LINKEDIN");
    return;
  }

  showState("LOADING");

  // 2. Fetch campaigns (also tests auth)
  let campaigns;
  try {
    campaigns = await fetchCampaigns();
  } catch (err) {
    if (err.message.includes("autoris") || err.message.includes("401")) {
      showState("NOT_AUTH");
    } else {
      showError(err.message);
    }
    return;
  }

  // 3. Scrape profile
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: "SCRAPE_PROFILE" });
    if (response && response.success) {
      scrapedData = response.data;
    } else {
      throw new Error("Impossible de lire le profil. Rechargez la page.");
    }
  } catch (err) {
    // Content script might not be injected yet, try injecting
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content/scraper.js"],
      });
      const response = await chrome.tabs.sendMessage(tab.id, { type: "SCRAPE_PROFILE" });
      if (response && response.success) {
        scrapedData = response.data;
      } else {
        throw new Error("Impossible de lire le profil.");
      }
    } catch (retryErr) {
      showError("Impossible de lire le profil. Rechargez la page LinkedIn et reessayez.");
      return;
    }
  }

  // 4. Populate UI
  populateProfile(scrapedData);
  populateCampaigns(campaigns);
  showState("MAIN");
}

// --- UI population ---

function populateProfile(data) {
  profileName.textContent = `${data.firstName} ${data.lastName}`;
  profileHeadline.textContent = data.headline || "";
  profilePosition.textContent =
    data.currentPosition && data.currentCompany
      ? `${data.currentPosition} - ${data.currentCompany}`
      : data.currentPosition || data.currentCompany || "";

  if (data.profilePhotoUrl) {
    profilePhoto.src = data.profilePhotoUrl;
    profilePhoto.style.display = "block";
  } else {
    profilePhoto.style.display = "none";
  }

  // Completeness
  const optionalFields = [
    "profilePhotoUrl", "headline", "bio", "location",
    "pastExperiences", "education", "skills", "languages",
    "recentPosts", "connectionCount",
  ];
  const filled = optionalFields.filter((f) => {
    const val = data[f];
    if (val == null || val === "") return false;
    if (Array.isArray(val)) return val.length > 0;
    return true;
  }).length;
  const pct = Math.round((filled / optionalFields.length) * 100);
  completenessValue.textContent = `${pct}%`;
  completenessFill.style.width = `${pct}%`;
}

function populateCampaigns(campaigns) {
  campaignSelect.innerHTML = '<option value="">Choisir une campagne...</option>';
  for (const campaign of campaigns) {
    const opt = document.createElement("option");
    opt.value = campaign.id;
    opt.textContent = `${campaign.name} (${campaign._count.prospects})`;
    campaignSelect.appendChild(opt);
  }
}

// --- Event handlers ---

campaignSelect.addEventListener("change", () => {
  btnAdd.disabled = !campaignSelect.value;
});

btnAdd.addEventListener("click", async () => {
  if (!scrapedData || !campaignSelect.value) return;

  btnAdd.disabled = true;
  btnAdd.textContent = "Envoi...";

  try {
    await sendProspect({
      ...scrapedData,
      campaignId: campaignSelect.value,
    });
    showState("SUCCESS");
  } catch (err) {
    showError(err.message);
  }
});

btnRetry.addEventListener("click", () => {
  init();
});

function showError(msg) {
  errorMessage.textContent = msg || "Une erreur est survenue.";
  showState("ERROR");
}
