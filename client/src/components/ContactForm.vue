<template lang="pug">
div
  input#modalContact.modal(type="checkbox" @change="trySetEnterTime($event)")
  div(role="dialog" data-checkbox="modalContact")
    .card
      label.modal-close(for="modalContact")
      h3.section {{ st.tr["Contact form"] }}
      form(@submit.prevent="trySendMessage()" @keyup.enter="trySendMessage()")
        fieldset
          label(for="userEmail") {{ st.tr["Email"] }}
          input#userEmail(type="email")
        fieldset
          label(for="mailSubject") {{ st.tr["Subject"] }}
          input#mailSubject(type="text")
        fieldset
          label(for="mailContent") {{ st.tr["Content"] }} *
          br
          textarea#mailContent
      button(@click="trySendMessage()") {{ st.tr["Send"] }}
      #dialog.text-center {{ st.tr[infoMsg] }}
</template>

<script>
import { ajax } from "../utils/ajax";
import { store } from "@/store";
import { checkNameEmail } from "@/data/userCheck";
export default {
  name: "my-contact-form",
  data: function() {
    return {
      enterTime: Number.MAX_SAFE_INTEGER, //for a basic anti-bot strategy
      st: store.state,
      infoMsg: "",
    };
  },
  methods: {
    trySetEnterTime: function(event) {
      if (!!event.target.checked)
      {
        this.enterTime = Date.now();
        this.infoMsg = "";
      }
    },
    trySendMessage: function() {
      // Basic anti-bot strategy:
      const exitTime = Date.now();
      if (exitTime - this.enterTime < 5000)
        return;
      let email = document.getElementById("userEmail");
      let subject = document.getElementById("mailSubject");
      let content = document.getElementById("mailContent");
      const error = checkNameEmail({email: email});
      if (!!error)
        return alert(error);
      if (content.value.trim().length == 0)
        return alert(this.st.tr["Empty message"]);
      if (subject.value.trim().length == 0 && !confirm(this.st.tr["No subject. Send anyway?"]))
        return;

      // Message sending:
      ajax(
        "/messages",
        "POST",
        {
          email: email.value,
          subject: subject.value,
          content: content.value,
        },
        () => {
          this.infoMsg = "Email sent!";
          subject.value = "";
          content.value = "";
        }
      );
    },
  },
};
</script>

<style lang="sass" scoped>
[type="checkbox"].modal+div .card
  max-width: 767px
  max-height: 100%
textarea#mailContent
  width: 100%
  min-height: 100px
#dialog
  padding: 5px
  color: blue
</style>
