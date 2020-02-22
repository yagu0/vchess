import { ajax } from "./utils/ajax";
import { getRandString } from "./utils/alea";

// Global store: see https://medium.com/fullstackio/managing-state-in-vue-js-23a0352b1c87
export const store = {
  state: {
    variants: [],
    tr: {},
    user: {},
    settings: {},
    lang: ""
  },
  socketCloseListener: null,
  initialize() {
    ajax("/variants", "GET", res => {
      this.state.variants = res.variantArray.sort((v1,v2) => v1.localeCompare(v2));
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
    ajax("/whoami", "GET", res => {
      this.state.user.id = res.id;
      const storedId = localStorage.getItem("myid");
      if (res.id > 0 && !storedId)
        // User cleared localStorage
        localStorage.setItem("myid", res.id);
      else if (res.id == 0 && !!storedId)
        // User cleared cookie
        localStorage.removeItem("myid");
      this.state.user.name = res.name;
      const storedName = localStorage.getItem("myname");
      if (!!res.name && !storedName)
        // User cleared localStorage
        localStorage.setItem("myname", res.name);
      else if (!res.name && !!storedName)
        // User cleared cookie
        localStorage.removeItem("myname");
      this.state.user.email = res.email;
      this.state.user.notify = res.notify;
    });
    // Settings initialized with values from localStorage
    this.state.settings = {
      bcolor: localStorage.getItem("bcolor") || "lichess",
      sound: parseInt(localStorage.getItem("sound")) || 1,
      hints: localStorage.getItem("hints") == "true",
      highlight: localStorage.getItem("highlight") == "true"
    };
    const supportedLangs = ["en", "es", "fr"];
    this.state.lang =
      localStorage["lang"] ||
      (supportedLangs.includes(navigator.language) ? navigator.language : "en");
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
