// NOTE: do not use ajax() here because ajax.js requires the store
import params from "./parameters"; //for server URL
import { getRandString } from "./utils/alea";
import { delCookie } from "./utils/cookie";

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
      params.serverUrl + "/allvarslist",
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
      id: parseInt(localStorage.getItem("myid") || "0", 10),
      name: localStorage.getItem("myname") || "", //"" for "anonymous"
      email: "", //unknown yet
      notify: false, //email notifications
      sid: mysid
    };
    // Slow verification through the server:
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
      if (!json.id) {
        // Removed, or wrong token
        if (this.state.user.id > 0) {
          this.state.user.id = 0;
          localStorage.removeItem("myid");
        }
        if (!!this.state.user.name) {
          this.state.user.name = "";
          localStorage.removeItem("myname");
        }
        if (document.cookie.indexOf("token") >= 0) delCookie("token");
      }
      else {
        if (this.state.user.id != json.id) {
          this.state.user.id = json.id;
          localStorage.setItem("myid", json.id);
        }
        if (this.state.user.name != json.name) {
          this.state.user.name = json.name;
          localStorage.setItem("myname", json.name);
        }
        this.state.user.email = json.email;
        this.state.user.notify = json.notify;
      }
    });
    // Settings initialized with values from localStorage
    const getItemDefault = (item, defaut) => {
      const value = localStorage.getItem(item);
      if (!value) return defaut;
      return value == "true";
    };
    this.state.settings = {
      bcolor: localStorage.getItem("bcolor") || "lichess",
      sound: getItemDefault("sound", true),
      hints: getItemDefault("hints", true),
      highlight: getItemDefault("highlight", true),
      gotonext: getItemDefault("gotonext", true),
      scrollmove: getItemDefault("scrollmove", false)
    };
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
