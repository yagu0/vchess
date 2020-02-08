<template lang="pug">
main
  .row
    .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
      div(v-html="content")
</template>

<script>
import { store } from "@/store";

export default {
  name: 'my-about',
  computed: {
    content: function() {
      return require("raw-loader!@/translations/about/" + store.state.lang + ".pug")
        // Next two lines fix a weird issue after last update (2019-11)
        .replace(/\\[n"]/g, " ")
        .replace('module.exports = "', '').replace(/"$/, "");
    },
  },
};
</script>

<style lang="sass">
.warn
  padding: 3px
  color: red
  background-color: lightgrey
  font-weight: bold

p.boxed
  background-color: #FFCC66
  padding: 5px

.stageDelimiter
  color: purple

.section-title
  padding: 0

.section-title > h4
  padding: 5px

ol, ul:not(.browser-default)
  padding-left: 20px

ul:not(.browser-default)
  margin-top: 5px

ul:not(.browser-default) > li
  list-style-type: disc
</style>
