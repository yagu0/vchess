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
					img(src="./assets/images/index/unicorn.svg")
					.info-container
						p vchess.club
					img(src="./assets/images/index/wildebeest.svg")
    .row
      // Menu (top of page):
      // shared: Home + flags, userMenu
			// variant: hall, problems, rules, my games + settings
			nav
				label.drawer-toggle(for="drawerControl")
				input#drawerControl.drawer(type="checkbox")
				#menuBar
					label.drawer-close(for="drawerControl")
					router-link(v-if="$route.path != '/'" to="/")
						| Home
					router-link(:href="getLink('/hall')")
						| getLink function : suffix ==> /variant + suffix
						=translations["Hall"]
					router-link(href="#tabGames")
						=translations["My games"]
					router-link(href="#rules")
						=translations["Rules"]
					router-link(href="#problems")
						=translations["Problems"]
					#userMenu.clickable.right-menu(onClick="doClick('modalUser')")
						.info-container
							if !user.email
								p
									span Login
									span.icon-user
							else
								p
									span Update
									span.icon-user
					#flagMenu.clickable.right-menu(onClick="doClick('modalLang')")
					img(src="/images/flags/" + lang + ".svg")
				#settings.clickable(v-show="display!='index'" onClick="doClick('modalSettings')")
					i(data-feather="settings")
    .row
			router-view
		.row
			footer
				.col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2.text-center
					a(href="https://github.com/yagu0/vchess") Source code
					p.clickable(onClick="doClick('modalContact')")
						= translations["Contact form"]
  //my-game(:game-ref="gameRef" :mode="mode" :settings="settings" @game-over="archiveGame")
  //// TODO: add only the necessary icons to mini-css custom build
  //script(src="//unpkg.com/feather-icons")
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
