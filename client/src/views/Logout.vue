<template lang="pug">
main
  .row
    .col-sm-12.col-md-10.col-md-offset-1.col-lg-8.col-lg-offset-2
      p(:class="{warn:!!this.errmsg}")
        | {{ errmsg || st.tr["Logout successful!"] }}
</template>

<script>
import { store } from "@/store";
import { ajax } from "@/utils/ajax";

export default {
  name: 'my-logout',
  data: function() {
    return {
      st: store.state,
      errmsg: "",
    };
  },
  created: function() {
    // NOTE: this local cleaning would logically happen when we're sure
    // that token is erased. But in the case a user clear the cookies,
    // it would lead to situations where he cannot ("locally") log out.
    // At worst, if token deletion fails the user can erase cookie manually.
    this.st.user.id = 0;
    this.st.user.name = "";
    this.st.user.email = "";
    this.st.user.notify = false;
    localStorage.removeItem("myid");
    localStorage.removeItem("myname");
    ajax("/logout", "GET"); //TODO: listen for errors?
  },
};
</script>

<style lang="sass" scoped>
.warn
  padding: 3px
  color: red
  background-color: lightgrey
  font-weight: bold
</style>
