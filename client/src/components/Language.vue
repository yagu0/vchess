<template lang="pug">
div
  -
    var langName = {
      "en": "English",
      "es": "Español",
      "fr": "Français",
    };
  input#modalLang.modal(type="checkbox")
  div(role="dialog")
    #language.card
      label.modal-close(for="modalLang")
      form
        fieldset
          label(for="langSelect") {{ st.tr["Language"] }}
          select#langSelect
            each language,langCode in langName
              option(value=langCode selected=(lang==langCode))
                =language
</template>

<script>
import { store } from "@/store";
export default {
  name: "my-language",
  data: function() {
    return {
      st: store.state,
    };
  },
	methods: {
    setLanguage: function(e) {
      localStorage["lang"] = e.target.value;
      store.setLanguage(e.target.value);
    },
	},
};
</script>
