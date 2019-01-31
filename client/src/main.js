import Vue from "vue";
import App from "./App.vue";
import router from "./router";
// Global store: see https://medium.com/fullstackio/managing-state-in-vue-js-23a0352b1c87
import { store } from "./store";

Vue.config.productionTip = false;

new Vue({
  router,
  render: function(h) {
    return h(App);
  },
//  watch: {
//    $route: function(newRoute) {
//      //console.log(this.$route.params);
//      console.log("navig to " + newRoute);
//      //TODO: conn.send("enter", newRoute)
//    },
//  },
  created: function() {
    window.doClick = (elemId) => { document.getElementById(elemId).click() };
		
    // TODO: AJAX call get corr games (all variants)
		// si dernier lastMove sur serveur n'est pas le mien et nextColor == moi, alors background orange
		// ==> background orange si à moi de jouer par corr (sur main index)
		// (helper: static fonction "GetNextCol()" dans base_rules.js)

    //TODO: si une partie en cours dans storage, rediriger vers cette partie
    //(à condition que l'URL n'y corresponde pas déjà !)
    // TODO: à l'arrivée sur le site : set peerID (un identifiant unique
    // en tout cas...) si pas trouvé dans localStorage "myid"
    // (l'identifiant de l'utilisateur si connecté)
//    if (!!localStorage["variant"])
//      location.hash = "#game?id=" + localStorage["gameId"];
  },
  // Later, for icons (if using feather):
//  mounted: function() {
//    feather.replace();
//  },
  created: function() {
    store.initialize();
  },
}).$mount("#app");

// TODO: get rules, dynamic import
// Load a rules page (AJAX)
// router.get("/rules/:vname([a-zA-Z0-9]+)", access.ajax, (req,res) => {
//  const lang = selectLanguage(req, res);
//  res.render("rules/" + req.params["vname"] + "/" + lang);
// });
//
// board2, 3, 4 automatiquement, mais rules separement (les 3 pour une)
// game : aussi systématique
// problems: on-demand
//
// See https://router.vuejs.org/guide/essentials/dynamic-matching.html#reacting-to-params-changes
//  created: function() {
//    window.onhashchange = this.setDisplay;
//  },
//});
