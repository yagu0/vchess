import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import params from "./parameters"; //for socket connection
import { ajax } from "./utils/ajax";

Vue.config.productionTip = false;

new Vue({
  router,
  render: function(h) {
    return h(App);
  },
	created: function() {
		//alert("test");
		ajax("/variants", "GET", res => {
			Vue.prototype.$variants = res.variantArray;
		});
		Vue.prototype.$conn = null; //TODO
		const myid = localStorage["myid"] || util.getRandString();
		// NOTE: in this version, we don't say on which page we are, yet
		// ==> we'll say "enter/leave" page XY (in fact juste "enter", seemingly)
		Vue.prototype.$conn = new WebSocket(params.socketUrl + "/?sid=" + myid);
		//TODO: si une partie en cours dans storage, rediriger vers cette partie
		//(à condition que l'URL n'y corresponde pas déjà !)
		// TODO: à l'arrivée sur le site : set peerID (un identifiant unique
		// en tout cas...) si pas trouvé dans localStorage "myid"
		// (l'identifiant de l'utilisateur si connecté)
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
// It works (to watch for route change), in a component:
//watch: {
//  $route: function(newRoute) {
//    console.log(this.$route.params);
//  },
//},
// See https://router.vuejs.org/guide/essentials/dynamic-matching.html#reacting-to-params-changes
