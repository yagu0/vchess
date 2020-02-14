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
      component: loadView("Auth"),
    },
    {
      path: "/logout",
      name: "logout",
      component: loadView("Logout"),
    },
    {
      path: "/problems",
      name: "myproblems",
      component: loadView("Problems"),
    },
    {
      path: "/mygames",
      name: "mygames",
      component: loadView("MyGames"),
    },
    {
      path: "/game/:id([a-zA-Z0-9]+)",
      name: "game",
      component: loadView("Game"),
    },
    {
      path: "/analyse/:vname([a-zA-Z0-9]+)",
      name: "analyse",
      component: loadView("Analyse"),
    },
    {
      path: "/about",
      name: "about",
      component: loadView("About"),
    },
    {
      path: "/news",
      name: "news",
      component: loadView("News"),
    },
  ]
});

export default router;
