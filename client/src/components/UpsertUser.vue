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
            label(for="username") Name
            input#username(type="text" v-model="user.name")
          fieldset
            label(for="useremail") Email
            input#useremail(type="email" v-model="user.email")
          fieldset
            label(for="notifyNew") Notify new moves &amp; games
            input#notifyNew(type="checkbox" v-model="user.notify")
        div(v-show="stage=='Login'")
          fieldset
            label(for="nameOrEmail") Name or Email
            input#nameOrEmail(type="text" v-model="nameOrEmail")
      .button-group
        button#submit(type="button" @click="onSubmit()")
          span {{ submitMessage }}
          i.material-icons send
        button(v-if="stage!='Update'" @click="toggleStage()")
          span {{ stage=="Login" ? "Register" : "Login" }}
        button(v-else @click="doLogout()")
          span Logout
      #dialog(:style="{display: displayInfo}") {{ infoMsg }}
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
      ajax(
        "/logout",
        "GET",
        () => {
          this.user.id = 0;
          this.user.name = "";
          this.user.email = "";
          this.user.notify = false;
          delete localStorage["myid"];
          delete localStorage["myname"];
        }
      );
    },
  },
};
</script>
