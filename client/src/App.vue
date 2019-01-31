<template lang="pug">
#app
  Language
  Settings
  ContactForm
  UpsertUser
  .container
    .row(v-show="$route.path == '/'")
      .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
        // Header (on index only)
        header
          img(src="./assets/images/index/unicorn.svg")
          .info-container
            p vchess.club
          img(src="./assets/images/index/wildebeest.svg")
    .row
      .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
        // Menu (top of page):
        // Left: home, variants, mygames, problems
        // Right: usermenu, settings, flag
        nav
          label.drawer-toggle(for="drawerControl")
          input#drawerControl.drawer(type="checkbox")
          #menuBar
            label.drawer-close(for="drawerControl")
            #leftMenu
              router-link(to="/")
                | {{ st.tr["Home"] }}
              router-link(to="/variants")
                | {{ st.tr["Variants"] }}
              router-link(to="/mygames")
                | {{ st.tr["My games"] }}
              router-link(to="/problems")
                | {{ st.tr["Problems"] }}
            #rightMenu
              .clickable(onClick="doClick('modalUser')")
                | {{ !st.user.id ? "Login" : "Update" }}
              .clickable(onClick="doClick('modalSettings')")
                | {{ st.tr["Settings"] }}
              .clickable#flagContainer(onClick="doClick('modalLang')")
                img(v-if="!!st.lang"
                  :src="require(`@/assets/images/flags/${st.lang}.svg`)")
    router-view
    .row
      .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
        footer
          a(href="https://github.com/yagu0/vchess") {{ st.tr["Source code"] }}
          p.clickable(onClick="doClick('modalContact')")
            | {{ st.tr["Contact form"] }}
  //my-game(:game-ref="gameRef" :mode="mode" :settings="settings" @game-over="archiveGame")
  //// TODO: add only the necessary icons to mini-css custom build
  //script(src="//unpkg.com/feather-icons")
</template>

<script>
// See https://stackoverflow.com/a/35417159
import ContactForm from "@/components/ContactForm.vue";
import Language from "@/components/Language.vue";
import Settings from "@/components/Settings.vue";
import UpsertUser from "@/components/UpsertUser.vue";
import { store } from "./store.js";
export default {
  components: {
    ContactForm,
    Language,
    Settings,
    UpsertUser,
  },
  data: function() {
    return {
      st: store.state,
    };
  },
};
</script>

<style lang="sass">
#app
  font-family: "Avenir", Helvetica, Arial, sans-serif
  -webkit-font-smoothing: antialiased
  -moz-osx-font-smoothing: grayscale

.container
  @media screen and (max-width: 767px)
    padding: 0

.row > div
  padding: 0

.nopadding
  padding: 0

header
  width: 100%
  display: flex
  align-items: center
  justify-content: center
  margin: 0 auto
  & > img
    width: 30px
    height: 30px

.clickable
  cursor: pointer

nav
  width: 100%
  margin: 0
  padding: 0
  & > #menuBar
    width: 100%
    padding: 0
    & > #leftMenu
      padding: 0
      width: 50%
      display: inline-flex
      align-items: center
      justify-content: flex-start
      & > a
        display: inline-block
        color: #2c3e50
        &.router-link-exact-active
          color: #42b983
    & > #rightMenu
      padding: 0
      width: 50%
      display: inline-flex
      align-items: center
      justify-content: flex-end
      & > div
        display: inline-block
        &#flagContainer
          display: inline-flex
        & > img
          padding: 0
          width: 36px
          height: 27px

// TODO: drawer, until 600px wide OK (seemingly)
// After, zone where left and right just go on top of another
// Then, on narrow screen put everything on one line
[type="checkbox"].drawer+*
  right: -767px

footer
  //background-color: #000033
  font-size: 1rem
  width: 100%
  display: inline-flex
  align-items: center
  justify-content: center
  & > a
    display: inline-block
    margin: 0 10px 0 0
    &:link
      color: #2c3e50
    &:hover
      text-decoration: none
  & > p
    display: inline-block
    margin: 0 0 0 10px
</style>
