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
        // Left: hall, variants, mygames, forum (ext. link)
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
              a(href="https://forum.vchess.club")
                | {{ st.tr["Forum"] }}
            #rightMenu
              .clickable(onClick="doClick('modalUser')")
                | {{ st.user.id > 0 ? "Update" : "Login" }}
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
  computed: {
    flagImage: function() {
      return `/images/flags/${this.st.lang}.svg`;
    },
  },
//  mounted: function() {
//    feather.replace();
//  },
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

[type="checkbox"].drawer+*
  right: -767px

#menuBar
  label.drawer-close
    top: 50px

footer
  //background-color: #000033
  font-size: 1rem
  width: 100%
  padding-left: 0
  padding-right: 0
  display: inline-flex
  align-items: center
  justify-content: center
  & > .menuitem
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
