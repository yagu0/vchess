import Vue from "vue";
import Router from "vue-router";
import Home from "./views/Home.vue";

Vue.use(Router);

function loadView(view) {
	return () => import(/* webpackChunkName: "view-[request]" */ `@/views/${view}.vue`)
}

export default new Router({
  routes: [
    {
      path: "/",
      name: "home",
      component: Home,
    },
    {
      path: "/about",
      name: "about",
      // route level code-splitting
      // this generates a separate chunk (about.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: loadView('About'),
				//function() {
        //	return import(/* webpackChunkName: "about" */ "./views/About.vue");
				//}
    },
		{
			path: "/test",
			name: "test",
			component: loadView("Test"),
		},
    // TODO: gameRef, problemId: https://router.vuejs.org/guide/essentials/dynamic-matching.html
  ]
});
