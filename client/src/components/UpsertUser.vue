<template lang="pug">
div
  input#modalUser.modal(type="checkbox" @change="trySetEnterTime")
  div(role="dialog" data-checkbox="modalUser")
    .card
      label.modal-close(for="modalUser")
      h3 {{ stage }}
      form#userForm(@submit.prevent="onSubmit()" @keyup.enter="onSubmit")
        div(v-show="stage!='Login'")
          fieldset
            label(for="username") {{ st.tr["Name"] }}
            input#username(type="text" v-model="user.name")
          fieldset
            label(for="useremail") {{ st.tr["Email"] }}
            input#useremail(type="email" v-model="user.email")
          fieldset
            label(for="notifyNew") {{ st.tr["Notifications by email"] }}
            input#notifyNew(type="checkbox" v-model="user.notify")
        div(v-show="stage=='Login'")
          fieldset
            label(for="nameOrEmail") {{ st.tr["Name or Email"] }}
            input#nameOrEmail(type="text" v-model="nameOrEmail")
      .button-group
        button#submit(type="button" @click="onSubmit()")
          span {{ st.tr[submitMessage] }}
        button(v-if="stage!='Update'" @click="toggleStage()")
          span {{ st.tr[stage=="Login" ? "Register" : "Login"] }}
        button#logoutBtn(v-else @click="doLogout()")
          span {{ st.tr["Logout"] }}
      #dialog(:style="{display: displayInfo}") {{ st.tr[infoMsg] }}
</template>

<script>
import { store } from "@/store";
import { checkNameEmail } from "@/data/userCheck";
import { ajax } from "@/utils/ajax";
export default {
  name: 'my-upsert-user',
  data: function() {
    return {
      user: store.state.user,
      nameOrEmail: "", //for login
      logStage: "Login", //or Register
      infoMsg: "",
      enterTime: Number.MAX_SAFE_INTEGER, //for a basic anti-bot strategy
      st: store.state,
    };
  },
  watch: {
    nameOrEmail: function(newValue) {
      if (newValue.indexOf('@') >= 0)
      {
        this.user.email = newValue;
        this.user.name = "";
      }
      else
      {
        this.user.name = newValue;
        this.user.email = "";
      }
    },
  },
  computed: {
    submitMessage: function() {
      switch (this.stage)
      {
        case "Login":
          return "Go";
        case "Register":
          return "Send";
        case "Update":
          return "Apply";
      }
    },
    displayInfo: function() {
      return (this.infoMsg.length > 0 ? "block" : "none");
    },
    stage: function() {
      return this.user.id > 0 ? "Update" : this.logStage;
    },
  },
  methods: {
    trySetEnterTime: function(event) {
      if (!!event.target.checked)
        this.enterTime = Date.now();
    },
    toggleStage: function() {
      // Loop login <--> register (update is for logged-in users)
      this.logStage = (this.logStage == "Login" ? "Register" : "Login");
    },
    ajaxUrl: function() {
      switch (this.stage)
      {
        case "Login":
          return "/sendtoken";
        case "Register":
          return "/register";
        case "Update":
          return "/update";
      }
    },
    ajaxMethod: function() {
      switch (this.stage)
      {
        case "Login":
          return "GET";
        case "Register":
          return "POST";
        case "Update":
          return "PUT";
      }
    },
    infoMessage: function() {
      switch (this.stage)
      {
        case "Login":
          return "Connection token sent. Check your emails!";
        case "Register":
          return "Registration complete! Please check your emails.";
        case "Update":
          return "Modifications applied!";
      }
    },
    onSubmit: function() {
      // Basic anti-bot strategy:
      const exitTime = Date.now();
      if (this.stage == "Register" && exitTime - this.enterTime < 5000)
        return; //silently return, in (curious) case of it was legitimate
      let error = undefined;
      if (this.stage == 'Login')
      {
        const type = (this.nameOrEmail.indexOf('@') >= 0 ? "email" : "name");
        error = checkNameEmail({[type]: this.nameOrEmail});
      }
      else
        error = checkNameEmail(this.user);
      if (!!error)
        return alert(error);
      this.infoMsg = "Processing... Please wait";
      ajax(this.ajaxUrl(), this.ajaxMethod(),
        this.stage == "Login" ? { nameOrEmail: this.nameOrEmail } : this.user,
        res => {
          this.infoMsg = this.infoMessage();
          if (this.stage != "Update")
            this.nameOrEmail = "";
          setTimeout(() => {
            this.infoMsg = "";
            document.getElementById("modalUser").checked = false;
          }, 2000);
        },
        err => {
          this.infoMsg = "";
          alert(err);
        }
      );
    },
    doLogout: function() {
      let logoutBtn = document.getElementById("logoutBtn");
      logoutBtn.disabled = true;
      // NOTE: this local cleaning would logically happen when we're sure
      // that token is erased. But in the case a user clear the cookies,
      // it would lead to situations where he cannot ("locally") log out.
      // At worst, if token deletion fails the user can erase cookie manually.
      this.user.id = 0;
      this.user.name = "";
      this.user.email = "";
      this.user.notify = false;
      localStorage.removeItem("myid");
      localStorage.removeItem("myname");
      ajax("/logout", "GET", () => {
        logoutBtn.disabled = false; //for symmetry, but not very useful...
        document.getElementById("modalUser").checked = false;
        // this.$router.push("/") will fail if logout from Hall, so:
        document.location.reload(true);
      });
    },
  },
};
</script>
