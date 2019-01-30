import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import params from "./parameters"; //for socket connection
import { ajax } from "./utils/ajax";
import { util } from "./utils/misc";

Vue.config.productionTip = false;

new Vue({
  router,
  render: function(h) {
    return h(App);
  },
//  watch: {
//    $lang: async function(newLang) {
//      // Fill modalWelcome, and import translations from "./translations/$lang.js"
//      document.getElementById("modalWelcome").innerHTML =
//        require("raw-loader!pug-plain-loader!./modals/welcome/" + newLang + ".pug");
//      const tModule = await import("./translations/" + newLang + ".js");
//      Vue.prototype.$tr = tModule.translations;
//      //console.log(tModule.translations);
//    },
//    $route: function(newRoute) {
//      //console.log(this.$route.params);
//      console.log("navig to " + newRoute);
//      //TODO: conn.send("enter", newRoute)
//    },
//  },
	created: function() {
    const supportedLangs = ["en","es","fr"];
    Vue.prototype.$lang = localStorage["lang"] ||
      supportedLangs.includes(navigator.language)
        ? navigator.language
        : "en";
		Vue.prototype.$variants = []; //avoid runtime error
		ajax("/variants", "GET", res => { Vue.prototype.$variants = res.variantArray; });
    Vue.prototype.$tr = {}; //to avoid a compiler error
		Vue.prototype.$user = {}; //TODO: from storage
		// TODO: if there is a socket ID in localStorage, it means a live game was interrupted (and should resume)
		const myid = localStorage["myid"] || util.getRandString();
		// NOTE: in this version, we don't say on which page we are, yet
		// ==> we'll say "enter/leave" page XY (in fact juste "enter", seemingly)
		Vue.prototype.$conn = new WebSocket(params.socketUrl + "/?sid=" + myid);
		// Settings initialized with values from localStorage
		Vue.prototype.$settings = {
			bcolor: localStorage["bcolor"] || "lichess",
			sound: parseInt(localStorage["sound"]) || 2,
			hints: parseInt(localStorage["hints"]) || 1,
			coords: !!eval(localStorage["coords"]),
			highlight: !!eval(localStorage["highlight"]),
			sqSize: parseInt(localStorage["sqSize"]),
		};
		const socketCloseListener = () => {
			Vue.prototype.$conn = new WebSocket(params.socketUrl + "/?sid=" + myid);
		}
		Vue.prototype.$conn.onclose = socketCloseListener;
		//TODO: si une partie en cours dans storage, rediriger vers cette partie
		//(à condition que l'URL n'y corresponde pas déjà !)
		// TODO: à l'arrivée sur le site : set peerID (un identifiant unique
		// en tout cas...) si pas trouvé dans localStorage "myid"
		// (l'identifiant de l'utilisateur si connecté)
//		if (!!localStorage["variant"])
//			location.hash = "#game?id=" + localStorage["gameId"];
	},
	// Later, for icons (if using feather):
//	mounted: function() {
//		feather.replace();
//	},
}).$mount("#app");

// TODO: get rules, dynamic import
// Load a rules page (AJAX)
// router.get("/rules/:vname([a-zA-Z0-9]+)", access.ajax, (req,res) => {
//	const lang = selectLanguage(req, res);
//	res.render("rules/" + req.params["vname"] + "/" + lang);
// });
//
// board2, 3, 4 automatiquement, mais rules separement (les 3 pour une)
// game : aussi systématique
// problems: on-demand
//
// See https://router.vuejs.org/guide/essentials/dynamic-matching.html#reacting-to-params-changes
//	created: function() {
//		window.onhashchange = this.setDisplay;
//	},
//});
