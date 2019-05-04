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
  initialize() {
    ajax("/variants", "GET", res => { this.state.variants = res.variantArray; });
    let mysid = localStorage["mysid"];
    if (!mysid)
    {
      mysid = getRandString();
      localStorage["mysid"] = mysid; //done only once (unless user clear browser data)
    }
    this.state.user = {
      id: localStorage["myid"] || 0,
      name: localStorage["myname"] || "", //"" for "anonymous"
      email: "", //unknown yet
      notify: false, //email notifications
      sid: mysid,
    };
    if (this.state.user.id > 0)
    {
      fetch(params.serverUrl + "/whoami", {
        method: "GET",
        credentials: params.cors ? "include" : "omit",
      }).then((res) => {
        this.state.user.email = res.email;
        this.state.user.notify = res.notify;
      });
    }
    this.state.conn = new WebSocket(params.socketUrl + "/?sid=" + this.state.user.sid);
    // Settings initialized with values from localStorage
    this.state.settings = {
      bcolor: localStorage["bcolor"] || "lichess",
      sound: parseInt(localStorage["sound"]) || 2,
      hints: parseInt(localStorage["hints"]) || 1,
      coords: !!eval(localStorage["coords"]),
      highlight: !!eval(localStorage["highlight"]),
      sqSize: parseInt(localStorage["sqSize"]),
    };
    const socketCloseListener = () => {
      this.state.conn = new WebSocket(params.socketUrl + "/?sid=" + mysid);
    }
    this.state.conn.onclose = socketCloseListener;
    const supportedLangs = ["en","es","fr"];
    this.state.lang = localStorage["lang"] ||
      supportedLangs.includes(navigator.language)
        ? navigator.language
        : "en";
    this.setTranslations();
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
