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
        // Left: hall, variants, mygames
        // Right: usermenu, settings, flag
        nav
          label.drawer-toggle(for="drawerControl")
          input#drawerControl.drawer(type="checkbox")
          #menuBar(@click="hideDrawer")
            label.drawer-close(for="drawerControl")
            #leftMenu
              router-link(to="/")
                | {{ st.tr["Hall"] }}
              router-link(to="/variants")
                | {{ st.tr["Variants"] }}
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
          p.clickable(onClick="doClick('modalContact')")
            | {{ st.tr["Contact"] }}
          a.menuitem(href="https://forum.vchess.club")
            | {{ st.tr["Forum"] }}
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
  --back-color: #f2f2f2
  --a-link-color: black
  --a-visited-color: black

body
  padding: 0
  min-width: 320px

#app
  -webkit-font-smoothing: antialiased
  -moz-osx-font-smoothing: grayscale

.container
  overflow: hidden
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

.text-center
  text-align: center

.smallpad
  padding: 5px

.emphasis
  font-style: italic

.clearer
  clear: both

.smallfont
  font-size: 0.8em

.bigfont
  font-size: 1.2em

.bold
  font-weight: bold

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
    border: none

[type="checkbox"].drawer+*
  right: -767px

@media screen and (max-width: 767px)
  .button-group
    flex-direction: row
    button:not(:first-child)
      border-left: 1px solid var(--button-group-border-color)
      border-top: 0

footer
  border: 1px solid #ddd
  //background-color: #000033
  font-size: 1rem
  width: 100%
  padding-left: 0
  padding-right: 0
  display: inline-flex
  align-items: center
  justify-content: center
  & > .router-link-exact-active
    color: #42b983 !important
    text-decoration: none
  & > .menuitem
    display: inline-block
    margin: 0 10px
    &:link
      color: #2c3e50
    &:visited, &:hover
      color: #2c3e50
      text-decoration: none
  & > p
    display: inline-block
    margin: 0 10px

@media screen and (max-width: 767px)
  footer
    border: none

//#settings, #contactForm
//  max-width: 767px
//  @media screen and (max-width: 767px)
//    max-width: 100vw
//[type="checkbox"].modal+div .card
//  max-width: 767px
//  max-height: 100vh
//[type="checkbox"].modal+div .card.small-modal
//  max-width: 320px
//[type="checkbox"].modal+div .card.big-modal
//  max-width: 90vw
</style>
