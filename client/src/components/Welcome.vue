<template lang="pug">
div
  input#modalWelcome.modal(type="checkbox")
  div(role="dialog")
    .card
      div(v-html="content")
</template>

<script>
import { store } from "@/store.js";
export default {
  name: "my-welcome",
  computed: {
    content: function() {
      // (AJAX) Request to get welcome content (plain text, HTML)
      return require("raw-loader!@/translations/welcome/" + store.state.lang + ".pug")
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
