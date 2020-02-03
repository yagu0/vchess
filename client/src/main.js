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
    document.addEventListener("keydown", (e) => {
      if (e.code === "Escape")
      {
        let modalBoxes = document.querySelectorAll("[id^='modal']");
        modalBoxes.forEach(m => {
          if (m.checked)
            m.checked = false;
        });
      }
    });
    // TODO: why is this wrong? (Maybe because $route still uninitialized?)
    //store.initialize(this.$route.path);
    store.initialize(window.location.href.split("#")[1]);
    // NOTE: at this point, variants and tr(anslations) might be uninitialized
  },
}).$mount("#app");
