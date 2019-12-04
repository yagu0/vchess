import Vue from "vue";
import Router from "vue-router";
import Hall from "./views/Hall.vue";

Vue.use(Router);

function loadView(view) {
	return () => import(/* webpackChunkName: "view-[request]" */ `@/views/${view}.vue`)
}

import { ajax } from "@/utils/ajax";
import { store } from "@/store";

const router = new Router({
  routes: [
    {
      path: "/",
      name: "hall",
      component: Hall,
    },
    {
      path: "/variants",
      name: "variants",
      component: loadView("Variants"),
    },
    {
      path: "/variants/:vname([a-zA-Z0-9]+)",
      name: "rules",
      component: loadView("Rules"),
    },
    {
      path: "/authenticate/:token",
      name: "authenticate",
      beforeEnter: (to, from, next) => {
        ajax(
          "/authenticate",
          "GET",
          {token: to.params["token"]},
          (res) => {
            if (!res.errmsg) //if not already logged in
            {
              store.state.user.id = res.id;
              store.state.user.name = res.name;
              store.state.user.email = res.email;
              store.state.user.notify = res.notify;
              localStorage["myname"] = res.name;
              localStorage["myid"] = res.id;
            }
            next("/");
          }
        );
      },
      component: Hall,
      //redirect: "/", //problem: redirection before end of AJAX request
    },
    {
      path: "/game/:id",
      name: "game",
      component: loadView("Game"),
    },
    {
      path: "/about",
      name: "about",
      component: loadView("About"),
    },
    // TODO: myGames, problemId: https://router.vuejs.org/guide/essentials/dynamic-matching.html
  ]
});

router.beforeEach((to, from, next) => {
  window.scrollTo(0, 0);
  if (!!store.state.conn) //uninitialized at first page
  {
    // Notify WebSockets server (TODO: path or fullPath?)
    store.state.conn.send(JSON.stringify({code: "pagechange", page: to.path}));
  }
  next();
  // TODO?: redirect to current game (through GameStorage.getCurrent()) if any?
  // (and if the URL doesn't already match it) (use next("/game/GID"))
  //https://router.vuejs.org/guide/advanced/navigation-guards.html#global-before-guards
});

export default router;
