// NOTE: do not use ajax() here because ajax.js requires the store
import params from "./parameters"; //for server URL
import { getRandString } from "./utils/alea";

// Global store: see
// https://medium.com/fullstackio/managing-state-in-vue-js-23a0352b1c87
export const store = {
  state: {
    variants: [],
    tr: {},
    user: {},
    settings: {},
    lang: ""
  },
  initialize() {
    const headers = {
      "Content-Type": "application/json;charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest"
    };
    fetch(
      params.serverUrl + "/variants",
      {
        method: "GET",
        headers: headers
      }
    )
    .then(res => res.json())
    .then(json => {
      if (!Array.isArray(json.variantArray)) {
        alert("Variants loading failed: reload the page");
        return;
      }
      this.state.variants = json.variantArray
        .sort((v1,v2) => v1.name.localeCompare(v2.name));
    });
    let mysid = localStorage.getItem("mysid");
    // Assign mysid only once (until next time user clear browser data)
    if (!mysid) {
      mysid = getRandString();
      localStorage.setItem("mysid", mysid);
    }
    // Quick user setup using local storage:
    this.state.user = {
      id: localStorage.getItem("myid") || 0,
      name: localStorage.getItem("myname") || "", //"" for "anonymous"
      email: "", //unknown yet
      notify: false, //email notifications
      sid: mysid
    };
    // Slow verification through the server:
    // NOTE: still superficial identity usurpation possible, but difficult.
    fetch(
      params.serverUrl + "/whoami",
      {
        method: "GET",
        headers: headers,
        credentials: params.credentials
      }
    )
    .then(res => res.json())
    .then(json => {
      this.state.user.id = json.id;
      const storedId = localStorage.getItem("myid");
      if (json.id > 0 && !storedId)
        // User cleared localStorage
        localStorage.setItem("myid", json.id);
      else if (json.id == 0 && !!storedId)
        // User cleared cookie
        localStorage.removeItem("myid");
      this.state.user.name = json.name;
      const storedName = localStorage.getItem("myname");
      if (!!json.name && !storedName)
        // User cleared localStorage
        localStorage.setItem("myname", json.name);
      else if (!json.name && !!storedName)
        // User cleared cookie
        localStorage.removeItem("myname");
      this.state.user.email = json.email;
      this.state.user.notify = json.notify;
    });
    // Settings initialized with values from localStorage
    const getItemDefaultTrue = (item) => {
      const value = localStorage.getItem(item);
      if (!value) return true;
      return value == "true";
    };
    this.state.settings = {
      bcolor: localStorage.getItem("bcolor") || "lichess",
      sound: getItemDefaultTrue("sound"),
      hints: getItemDefaultTrue("hints"),
      highlight: getItemDefaultTrue("highlight"),
      gotonext: getItemDefaultTrue("gotonext"),
      randomness: parseInt(localStorage.getItem("randomness"), 10)
    };
    if (isNaN(this.state.settings.randomness))
      // Default: random asymmetric
      this.state.settings.randomness = 2;
    const supportedLangs = ["en", "es", "fr"];
    const navLanguage = navigator.language.substr(0, 2);
    this.state.lang =
      localStorage["lang"] ||
      (supportedLangs.includes(navLanguage) ? navLanguage : "en");
    this.setTranslations();
  },
  updateSetting: function(propName, value) {
    this.state.settings[propName] = value;
    localStorage.setItem(propName, value);
  },
  setTranslations: async function() {
    // Import translations from "./translations/$lang.js"
    const tModule = await import("@/translations/" + this.state.lang + ".js");
    this.state.tr = tModule.translations;
  },
  setLanguage(lang) {
    this.state.lang = lang;
    this.setTranslations();
  }
};
