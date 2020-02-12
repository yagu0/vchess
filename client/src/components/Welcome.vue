<template lang="pug">
div
  input#modalWelcome.modal(type="checkbox")
  div(role="dialog")
    .card
      div(v-html="content")
      p#disableMsg.clickable(@click="closeAndDisable()")
        | {{ st.tr["Close and show no more"] }}
</template>

<script>
import { store } from "@/store.js";
export default {
  name: "my-welcome",
  data: function() {
    return {
      st: store.state,
    };
  },
  computed: {
    content: function() {
      // (AJAX) Request to get welcome content (plain text, HTML)
      return require("raw-loader!@/translations/welcome/" + this.st.lang + ".pug")
        // Next two lines fix a weird issue after last update (2019-11)
        .replace(/\\n/g, " ").replace(/\\"/g, '"')
        .replace('module.exports = "', '').replace(/"$/, "");
    },
  },
  methods: {
    closeAndDisable: function() {
      document.getElementById("modalWelcome").checked = false;
      localStorage.setItem('welcomed',true);
    },
  },
};
</script>

<style lang="sass">
p#credits
  font-size: 0.8rem
  margin-top: -10px
  text-align: center
</style>
