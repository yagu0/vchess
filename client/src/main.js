import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import { ajax } from "./utils/ajax";

Vue.config.productionTip = false;

new Vue({
  router,
  render: function(h) {
    return h(App);
  },
	created: function() {
		//alert("test");
		ajax("http://localhost:3000/variants", "GET", variantArray => {
			console.log("Got variants:");
			console.log(variantArray);
		});
	},
}).$mount("#app");

// TODO: get rules, dynamic import
// Load a rules page (AJAX)
// router.get("/rules/:vname([a-zA-Z0-9]+)", access.ajax, (req,res) => {
//	const lang = selectLanguage(req, res);
//	res.render("rules/" + req.params["vname"] + "/" + lang);
// });
