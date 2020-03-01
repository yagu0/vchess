<template lang="pug">
main
  .row
    .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
      div(v-if="logoutOk")
        p {{ st.tr["Logout successful!"] }}
        p {{ st.tr["Back to Hall in 3 seconds..."] }}
</template>

<script>
import { store } from "@/store";
import { ajax } from "@/utils/ajax";
export default {
  name: "my-logout",
  data: function() {
    return {
      st: store.state,
      logoutOk: false
    };
  },
  created: function() {
    ajax(
      "/logout",
      "GET",
      () => {
        this.logoutOk = true;
        this.st.user.id = 0;
        this.st.user.name = "";
        this.st.user.email = "";
        this.st.user.notify = false;
        localStorage.removeItem("myid");
        localStorage.removeItem("myname");
        setTimeout(() => {
          this.$router.replace("/");
        }, 3000);
      }
    );
  }
};
</script>
