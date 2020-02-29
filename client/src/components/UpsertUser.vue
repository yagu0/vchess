<template lang="pug">
div
  input#modalUser.modal(
    type="checkbox"
    @change="trySetEnterTime($event)"
  )
  div(
    role="dialog"
    data-checkbox="modalUser"
  )
    .card
      label.modal-close(for="modalUser")
      h3.section {{ st.tr[stage] }}
      div(@keyup.enter="onSubmit()")
        div(v-show="stage!='Login'")
          fieldset
            label(for="u_username") {{ st.tr["User name"] }}
            input#u_username(
              type="text"
              v-model="user.name"
            )
          fieldset
            label(for="u_useremail") {{ st.tr["Email"] }}
            input#u_useremail(
              type="email"
              v-model="user.email"
            )
          fieldset
            label(for="notifyNew") {{ st.tr["Notifications by email"] }}
            input#notifyNew(
              type="checkbox"
              v-model="user.notify"
            )
        div(v-show="stage=='Login'")
          fieldset
            label(for="nameOrEmail") {{ st.tr["Name or Email"] }}
            input#nameOrEmail(
              type="text"
              v-model="nameOrEmail"
            )
      .button-group
        button(@click="onSubmit()")
          span {{ st.tr[submitMessage] }}
        button(
          v-if="stage!='Update'"
          type="button"
          @click="toggleStage()"
        )
          span {{ st.tr[stage=="Login" ? "Register" : "Login"] }}
        button(
          v-else type="button"
          @click="doLogout()"
        )
          span {{ st.tr["Logout"] }}
      #dialog.text-center {{ st.tr[infoMsg] }}
</template>

<script>
import { store } from "@/store";
import { checkNameEmail } from "@/data/userCheck";
import { ajax } from "@/utils/ajax";
export default {
  name: "my-upsert-user",
  data: function() {
    return {
      nameOrEmail: "", //for login
      logStage: "Login", //or Register
      infoMsg: "",
      enterTime: Number.MAX_SAFE_INTEGER, //for a basic anti-bot strategy
      st: store.state,
      user: {}
    };
  },
  watch: {
    nameOrEmail: function(newValue) {
      if (newValue.indexOf("@") >= 0) {
        this.user.email = newValue;
        this.user.name = "";
      } else {
        this.user.name = newValue;
        this.user.email = "";
      }
    }
  },
  computed: {
    submitMessage: function() {
      switch (this.stage) {
        case "Login":
          return "Go";
        case "Register":
          return "Send";
        case "Update":
          return "Apply";
      }
      return "Never reached";
    },
    stage: function() {
      return this.st.user.id > 0 ? "Update" : this.logStage;
    }
  },
  methods: {
    trySetEnterTime: function(event) {
      if (event.target.checked) {
        this.infoMsg = "";
        this.enterTime = Date.now();
        document.getElementById("u_username").focus();
        this.user = {
          name: this.st.user.name,
          email: this.st.user.email,
          notify: this.st.user.notify
        };
      }
    },
    toggleStage: function() {
      // Loop login <--> register (update is for logged-in users)
      this.logStage = this.logStage == "Login" ? "Register" : "Login";
    },
    ajaxUrl: function() {
      switch (this.stage) {
        case "Login":
          return "/sendtoken";
        case "Register":
          return "/register";
        case "Update":
          return "/update";
      }
      return "Never reached";
    },
    ajaxMethod: function() {
      switch (this.stage) {
        case "Login":
          return "GET";
        case "Register":
          return "POST";
        case "Update":
          return "PUT";
      }
      return "Never reached";
    },
    infoMessage: function() {
      switch (this.stage) {
        case "Login":
          return "Connection token sent. Check your emails!";
        case "Register":
          return "Registration complete! Please check your emails";
        case "Update":
          return "Modifications applied!";
      }
      return "Never reached";
    },
    onSubmit: function() {
      // Basic anti-bot strategy:
      const exitTime = Date.now();
      if (this.stage == "Register" && exitTime - this.enterTime < 5000) return;
      let error = undefined;
      if (this.stage == "Login") {
        const type = this.nameOrEmail.indexOf("@") >= 0 ? "email" : "name";
        error = checkNameEmail({ [type]: this.nameOrEmail });
      } else error = checkNameEmail(this.user);
      if (error) {
        alert(this.st.tr[error]);
        return;
      }
      this.infoMsg = "Processing... Please wait";
      ajax(
        this.ajaxUrl(),
        this.ajaxMethod(),
        this.stage == "Login"
          ? { nameOrEmail: this.nameOrEmail }
          : this.user,
        () => {
          this.infoMsg = this.infoMessage();
          if (this.stage != "Update") this.nameOrEmail = "";
          else {
            this.st.user.name = this.user.name;
            this.st.user.email = this.user.email;
            this.st.user.notify = this.user.notify;
          }
        },
        err => {
          this.infoMsg = "";
          alert(err);
        }
      );
    },
    doLogout: function() {
      document.getElementById("modalUser").checked = false;
      this.$router.push("/logout");
    }
  }
};
</script>

<style lang="sass" scoped>
[type="checkbox"].modal+div .card
  max-width: 450px
  max-height: 100%

#dialog
  padding: 5px
  color: blue
</style>
