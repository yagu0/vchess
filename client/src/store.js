import { ajax } from "./utils/ajax";
import { getRandString } from "./utils/alea";
import params from "./parameters"; //for socket connection

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
    this.state.user = {
      id: 0, //unknown yet
      name: "", //"anonymous"
      email: "", //unknown yet
      notify: false, //email notifications
      sid: localStorage["mysid"] || getRandString(),
    };
    ajax("/whoami", "GET", res => {
      if (res.id > 0)
      {
        this.state.user.id = res.id;
        this.state.user.name = res.name;
        this.state.user.email = res.email;
        this.state.user.notify = res.notify;
      }
    });
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
