import { ajax } from "./utils/ajax";
import { getRandString } from "./utils/alea";
import params from "./parameters"; //for socket connection

// Global store: see https://medium.com/fullstackio/managing-state-in-vue-js-23a0352b1c87
export const store =
{
  state: {
    variants: [],
    tr: {},
    user: {},
    conn: null,
    settings: {},
    lang: "",
  },
  socketCloseListener: null,
  initialize(page) {
    ajax("/variants", "GET", res => { this.state.variants = res.variantArray; });
    let mysid = localStorage["mysid"];
    if (!mysid)
    {
      mysid = getRandString();
      localStorage["mysid"] = mysid; //done only once (unless user clear browser data)
    }
    // Quick user setup using local storage:
    this.state.user = {
      id: localStorage["myid"] || 0,
      name: localStorage["myname"] || "", //"" for "anonymous"
      email: "", //unknown yet
      notify: false, //email notifications
      sid: mysid,
    };
    // Slow verification through the server:
    // NOTE: still superficial identity usurpation possible, but difficult.
    ajax("/whoami", "GET", res => {
      this.state.user.id = res.id;
      this.state.user.name = res.name;
      this.state.user.email = res.email;
      this.state.user.notify = res.notify;
    });
    this.state.conn = new WebSocket(params.socketUrl + "/?sid=" + mysid +
      "&page=" + encodeURIComponent(page));
    // Settings initialized with values from localStorage
    this.state.settings = {
      bcolor: localStorage.getItem("bcolor") || "lichess",
      sound: parseInt(localStorage.getItem("sound")) || 1,
      hints: localStorage.getItem("hints") == "true",
      highlight: localStorage.getItem("highlight") == "true",
    };
    this.socketCloseListener = () => {
      // Next line may fail at first, but should retry and eventually success (TODO?)
      this.state.conn = new WebSocket(params.socketUrl + "/?sid=" + mysid +
        "&page=" + encodeURIComponent(page));
    };
    this.state.conn.onclose = this.socketCloseListener;
    const supportedLangs = ["en","es","fr"];
    this.state.lang = localStorage["lang"] ||
      (supportedLangs.includes(navigator.language)
        ? navigator.language
        : "en");
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
  },
};
