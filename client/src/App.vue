<template lang="pug">
#app
  Settings
  ContactForm
  UpsertUser
  .container
    .row
      .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
        // Menu (top of page):
        // Left: hall, variants, problems, mygames
        // Right: usermenu, settings
        nav
          label.drawer-toggle(for="drawerControl")
          input#drawerControl.drawer(type="checkbox")
          #menuBar(@click="hideDrawer($event)")
            label.drawer-close(for="drawerControl")
            #leftMenu
              router-link(to="/")
                | {{ st.tr["Hall"] }}
              router-link(to="/mygames")
                | {{ st.tr["My games"] }}
              router-link(to="/variants")
                | {{ st.tr["Variants"] }}
              router-link(to="/problems")
                | {{ st.tr["Problems"] }}
            #rightMenu
              .clickable(onClick="window.doClick('modalUser')")
                | {{ st.user.id > 0 ? (st.user.name || "@nonymous") : "Login" }}
              #divSettings.clickable(onClick="window.doClick('modalSettings')")
                span {{ st.tr["Settings"] }}
                img(src="/images/icons/settings.svg")
    router-view
  .row
    .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
      footer
        router-link.menuitem(to="/about") {{ st.tr["About"] }}
        router-link.menuitem#newsMenu(to="/news") {{ st.tr["News"] }}
        a.menuitem(href="https://discord.gg/a9ZFKBe")
          span Discord
          img(src="/images/icons/discord.svg")
        a.menuitem(href="https://github.com/yagu0/vchess")
          span {{ st.tr["Code"] }}
          img(src="/images/icons/github.svg")
        p.clickable(onClick="window.doClick('modalContact')")
          | {{ st.tr["Contact"] }}
</template>

<script>
import ContactForm from "@/components/ContactForm.vue";
import Settings from "@/components/Settings.vue";
import UpsertUser from "@/components/UpsertUser.vue";
import { store } from "@/store.js";
import { ajax } from "@/utils/ajax.js";
export default {
  components: {
    ContactForm,
    Settings,
    UpsertUser
  },
  data: function() {
    return { st: store.state };
  },
  mounted: function() {
    ajax(
      "/newsts",
      "GET",
      {
        success: (res) => {
          if (this.st.user.newsRead < res.timestamp)
            document.getElementById("newsMenu").classList.add("somenews");
        }
      }
    );
  },
  methods: {
    hideDrawer: function(e) {
      e.preventDefault(); //TODO: why is this needed?
      document.getElementsByClassName("drawer")[0].checked = false;
    }
  }
};
</script>

<style lang="sass">
html, *
  font-family: "Open Sans", Arial, sans-serif
  --a-link-color: darkred
  --a-visited-color: darkred

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
  padding: 0
  margin: 0

.row > div
  padding: 0

header
  width: 100%
  display: flex
  align-items: center
  justify-content: center
  margin: 0 auto

.clickable
  cursor: pointer

.text-center
  text-align: center

.bold
  font-weight: bold

.clearer
  clear: both

.button-group
  margin: 0

input[type="checkbox"]:focus
  outline: 0

input[type=checkbox]:checked:before
  top: -5px;
  height: 18px

table
  display: block
  padding: 0
  tr > td
    cursor: pointer
  th, td
    padding: 5px

#divSettings
  padding: 0 10px 0 0
  height: 100%
  & > span
    padding-right: 5px
    vertical-align: middle
  & > img
    padding: 0
    height: 1.2em
    vertical-align: middle

@media screen and (max-width: 767px)
  table
    tr > th, td
      font-size: 14px

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
    @media screen and (max-width: 767px)
      & > #leftMenu
        margin-top: 42px
        padding-bottom: 5px
        & > a
          color: #2c3e50
          &.router-link-exact-active
            color: #42b983
      & > #rightMenu
        padding-top: 5px
        border-top: 1px solid darkgrey

@media screen and (max-width: 767px)
  nav
    height: 42px
    border: none
    & > label.drawer-toggle
      cursor: pointer
      position: absolute
      top: 0
      left: 5px
      line-height: 42px
      height: 42px
      padding: 0
    & > label.drawer-toggle:before
      font-size: 42px
    & > #menuBar
      z-index: 5000 //to hide currently selected piece if any

[type="checkbox"].drawer+*
  right: -767px

[type=checkbox].drawer+* .drawer-close
  top: 0
  left: 5px
  padding: 0
  height: 50px
  width: 50px
  line-height: 50px

[type=checkbox].drawer+* .drawer-close:before
  font-size: 50px

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
    margin: 0 12px
    display: inline-flex;
    align-self: center;
    &:link
      color: #2c3e50
    &:visited, &:hover
      color: #2c3e50
      text-decoration: none
    & > img
      height: 1.2em
      display: inline-block
      margin-left: 5px
  & > p
    display: inline-block
    margin: 0 12px

@media screen and (max-width: 767px)
  footer
    border: none

@media screen and (max-width: 420px)
  footer
    height: 55px
    display: block
    padding: 5px 0

.menuitem.somenews
  animation: blinkNews 1s infinite;
  color: red
  &:link, &:visited, &:hover
    color: red

@keyframes blinkNews
  0%, 49%
    background-color: yellow
    padding: 3px
  50%, 100%
    background-color: grey
    padding: 3px

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
