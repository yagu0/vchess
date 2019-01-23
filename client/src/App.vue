<template lang="pug">
#app
  // modal "welcome" will be filled in the selected language
  #modalWelcome
  Language
  Settings(:settings="settings")
  ContactForm
  .container
    .row(v-show="$route.path == '/'")
      // Header (on index only)
      header
        .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
          header
            img(src="./assets/images/index/unicorn.svg")
            .info-container
              p vchess.club {{ $lang }}
            img(src="./assets/images/index/wildebeest.svg")
    .row
      // Menu (top of page)
      nav
        router-link(to="/") Home
        | &nbsp;|&nbsp;
        router-link(to="/about") About
        | &nbsp;|&nbsp;
        router-link(to="/test") Test
      router-view
</template>

<script>
// See https://stackoverflow.com/a/35417159
import ContactForm from "@/components/ContactForm.vue";
import Language from "@/components/Language.vue";
import Settings from "@/components/Settings.vue";
export default {
  data: function() {
    return {
      settings: {}, //TODO
    };
  },
  components: {
    ContactForm,
    Language,
    Settings,
  },
};
</script>

<style lang="sass">
#app
  font-family: "Avenir", Helvetica, Arial, sans-serif
  -webkit-font-smoothing: antialiased
  -moz-osx-font-smoothing: grayscale
  text-align: center
  color: #2c3e50

#nav
  padding: 30px
  a
    font-weight: bold
    color: #2c3e50
    &.router-link-exact-active
      color: #42b983
</style>
