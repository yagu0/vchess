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
            next();
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
//    {
//      path: "/about",
//      name: "about",
//      // route level code-splitting
//      // this generates a separate chunk (about.[hash].js) for this route
//      // which is lazy-loaded when the route is visited.
//      component: loadView('About'),
//				//function() {
//        //	return import(/* webpackChunkName: "about" */ "./views/About.vue");
//				//}
//    },
    // TODO: gameRef, problemId: https://router.vuejs.org/guide/essentials/dynamic-matching.html
  ]
});

router.beforeEach((to, from, next) => {
  window.scrollTo(0, 0); //TODO: check if a live game is running; if yes, call next('/game')
  //https://router.vuejs.org/guide/advanced/navigation-guards.html#global-before-guards
  next();
});

export default router;
