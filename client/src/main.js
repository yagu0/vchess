import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import { store } from "./store";

Vue.config.productionTip = false;

new Vue({
  router,
  render: function(h) {
    return h(App);
  },
  created: function() {
    window.doClick = (elemId) => { document.getElementById(elemId).click() };
    // TODO: why is this wrong?
    //store.initialize(this.$route.path);
    store.initialize(window.location.href.split("#")[1]);
    // NOTE: at this point, variants and tr(anslations) might be uninitialized
  },
}).$mount("#app");
