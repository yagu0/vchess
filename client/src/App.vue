<template lang="pug">
#app
  Language
  Settings
  ContactForm
  UpsertUser
  .container
    .row
      .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
        // Menu (top of page):
        // Left: hall, variants, problems, mygames
        // Right: usermenu, settings, flag
        nav
          label.drawer-toggle(for="drawerControl")
          input#drawerControl.drawer(type="checkbox")
          #menuBar(@click="hideDrawer($event)")
            label.drawer-close(for="drawerControl")
            #leftMenu
              router-link(to="/")
                | {{ st.tr["Hall"] }}
              router-link(to="/variants")
                | {{ st.tr["Variants"] }}
              router-link(to="/problems")
                | {{ st.tr["Problems"] }}
              router-link(to="/mygames")
                | {{ st.tr["My games"] }}
            #rightMenu
              .clickable(onClick="doClick('modalUser')")
                | {{ st.user.id > 0 ? (st.user.name || "@nonymous") : "Login" }}
              .clickable(onClick="doClick('modalSettings')")
                | {{ st.tr["Settings"] }}
              .clickable#flagContainer(onClick="doClick('modalLang')")
                img(v-if="!!st.lang" :src="flagImage")
    router-view
  .row
    .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
      footer
        router-link.menuitem(to="/about") {{ st.tr["About"] }}
        router-link.menuitem(to="/news") {{ st.tr["News"] }}
        p.clickable(onClick="doClick('modalContact')")
          | {{ st.tr["Contact"] }}
</template>

<script>
import ContactForm from "@/components/ContactForm.vue";
import Language from "@/components/Language.vue";
import Settings from "@/components/Settings.vue";
import UpsertUser from "@/components/UpsertUser.vue";
import { store } from "./store.js";
import { processModalClick } from "./utils/modalClick.js";
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
  computed: {
    flagImage: function() {
      return `/images/flags/${this.st.lang}.svg`;
    },
  },
  mounted: function() {
    let dialogs = document.querySelectorAll("div[role='dialog']");
    dialogs.forEach(d => {
      d.addEventListener("click", processModalClick);
    });
  },
  methods: {
    hideDrawer: function(e) {
      if (e.target.innerText == "Forum")
        return; //external link
      e.preventDefault(); //TODO: why is this needed?
      document.getElementsByClassName("drawer")[0].checked = false;
    },
  },
};
</script>

<style lang="sass">
html, *
  font-family: "Open Sans", Arial, sans-serif
  --a-link-color: black
  --a-visited-color: black

body
  padding: 0
  min-width: 320px
  --fore-color: #1c1e10 //#2c3e50
  //--back-color: #f2f2f2
  background-image: radial-gradient(white, #e6e6ff) //lavender)

#app
  -webkit-font-smoothing: antialiased
  -moz-osx-font-smoothing: grayscale

.container
  // 45px is footer height
  min-height: calc(100vh - 45px)
  overflow: hidden
  @media screen and (max-width: 767px)
    padding: 0

.row > div
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

.text-center
  text-align: center

.clearer
  clear: both

nav
  width: 100%
  margin: 0
  padding: 0
  & > #menuBar
    width: 100%
    padding: 0
    @media screen and (min-width: 768px)
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
    @media screen and (max-width: 767px)
      & > #leftMenu
        padding-bottom: 5px
        & > a
          color: #2c3e50
          &.router-link-exact-active
            color: #42b983
      & > #rightMenu
        padding-top: 5px
        border-top: 1px solid darkgrey
        & > div
          &#flagContainer
            display: inline-flex
          & > img
            padding: 0
            width: 36px
            height: 27px

@media screen and (max-width: 767px)
  nav
    height: 32px
    border: none
    & > label.drawer-toggle
      font-size: 1.2rem
      position: absolute
      top: -12px
      //padding: -5px 0 0 10px

[type="checkbox"].drawer+*
  right: -767px

@media screen and (max-width: 767px)
  .button-group
    flex-direction: row
    button:not(:first-child)
      border-left: 1px solid var(--button-group-border-color)
      border-top: 0

footer
  height: 45px
  border: 1px solid #ddd
  box-sizing: border-box
  //background-color: #000033
  font-size: 1rem
  width: 100%
  padding: 0
  display: inline-flex
  align-items: center
  justify-content: center
  & > .router-link-exact-active
    color: #42b983 !important
    text-decoration: none
  & > .menuitem
    display: inline-block
    margin: 0 12px
    &:link
      color: #2c3e50
    &:visited, &:hover
      color: #2c3e50
      text-decoration: none
  & > p
    display: inline-block
    margin: 0 12px

@media screen and (max-width: 767px)
  footer
    border: none

// Styles for diagrams and board (partial).
// TODO: where to put that ?

.light-square-diag
  background-color: #e5e5ca

.dark-square-diag
  background-color: #6f8f57

div.board
  float: left
  height: 0
  display: inline-block
  position: relative

div.board8
  width: 12.5%
  padding-bottom: 12.5%

div.board10
  width: 10%
  padding-bottom: 10%

div.board11
  width: 9.09%
  padding-bottom: 9.1%

img.piece
  width: 100%

img.piece, img.mark-square
  max-width: 100%
  height: auto
  display: block

img.mark-square
  opacity: 0.6
  width: 76%
  position: absolute
  top: 12%
  left: 12%
  opacity: .7

.in-shadow
  filter: brightness(50%)
</style>
