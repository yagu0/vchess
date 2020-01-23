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
						// TODO: I don't like these 2 lines, "next('/')" should be enough
						window.location = "/";
            next();
          }
        );
      },
      component: Hall,
      //redirect: "/", //problem: redirection before end of AJAX request
    },
    {
      path: "/mygames",
      name: "mygames",
      component: loadView("MyGames"),
    },
    {
      path: "/game/:id",
      name: "game",
      component: loadView("Game"),
    },
    {
      path: "/analyze/:vname([a-zA-Z0-9]+)",
      name: "analyze",
      component: loadView("Analyze"),
    },
    {
      path: "/about",
      name: "about",
      component: loadView("About"),
    },
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
});

export default router;
