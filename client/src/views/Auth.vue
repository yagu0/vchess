<template lang="pug">
main
  .row
    .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
      p {{ st.tr["Authentication successful!"] }}
</template>

<script>
import { store } from "@/store";
import { ajax } from "@/utils/ajax";
export default {
  name: "my-auth",
  data: function() {
    return {
      st: store.state
    };
  },
  created: function() {
    ajax(
      "/authenticate",
      "GET",
      { token: this.$route.params["token"] },
      res => {
        this.st.user.id = res.id;
        this.st.user.name = res.name;
        this.st.user.email = res.email;
        this.st.user.notify = res.notify;
        localStorage["myname"] = res.name;
        localStorage["myid"] = res.id;
      }
    );
  }
};
</script>
