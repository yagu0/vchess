<template lang="pug">
main
  .row
    .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
      div(v-html="content")
</template>

<script>
import { store } from "@/store";
export default {
  name: "my-about",
  computed: {
    content: function() {
      return (
        require("raw-loader!@/translations/about/" + store.state.lang + ".pug")
          // Next two lines fix a weird issue after last update (2019-11)
          .replace(/\\[n"]/g, " ")
          .replace('module.exports = "', "")
          .replace(/"$/, "")
      );
    }
  }
};
</script>

<style lang="sass">
#links
  margin: var(--universal-margin);
  & > a
    display: block
</style>
