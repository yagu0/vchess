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
      // id and name could be undefined
      id: localStorage["myuid"],
      name: localStorage["myname"],
    };
    // TODO: if there is a socket ID in localStorage, it means a live game was interrupted (and should resume)
    const mysid = localStorage["mysid"] || getRandString();
    this.state.conn = new WebSocket(params.socketUrl + "/?sid=" + mysid);
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
