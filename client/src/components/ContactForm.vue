<template lang="pug">
div
  input#modalContact.modal(type="checkbox")
  div(role="dialog" aria-labelledby="contactTitle")
    form.card.smallpad
      label.modal-close(for="modalContact")
      h3#contactTitle.section {{ st.tr["Contact form"] }}
      fieldset
        label(for="userEmail") {{ st.tr["Email"] }}
        input#userEmail(type="email")
      fieldset
        label(for="mailSubject") {{ st.tr["Subject"] }}
        input#mailSubject(type="text")
      fieldset
        label(for="mailContent") {{ st.tr["Content"] }}
        br
        textarea#mailContent
      fieldset
        button(type="button" @click="trySendMessage") Send
        p#emailSent {{ st.tr["Email sent!"] }}
</template>

<script>
import { ajax } from "../utils/ajax";
import { store } from "@/store";
import { checkNameEmail } from "@/data/userCheck";

export default {
  name: "my-contact-form",
  data: function() {
    return {
      st: store.state,
    };
  },
  methods: {
		// Note: not using Vue here, but would be possible
    trySendMessage: function() {
      let email = document.getElementById("userEmail");
      let subject = document.getElementById("mailSubject");
      let content = document.getElementById("mailContent");
      const error = checkNameEmail({email: email});
      if (!!error)
        return alert(error);
      if (content.value.trim().length == 0)
        return alert("Empty message");
      if (subject.value.trim().length == 0 && !confirm("No subject. Send anyway?"))
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
          subject.value = "";
          content.value = "";
          let emailSent = document.getElementById("emailSent");
          emailSent.style.display = "inline-block";
          setTimeout(() => { emailSent.style.display = "none"; }, 2000);
        }
      );
    },
	},
};
</script>
