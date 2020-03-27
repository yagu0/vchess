export function checkNameEmail(o) {
  if (typeof o.name === "string") {
    if (o.name.length == 0) return "Missing name";
    if (!o.name.match(/^[\w-]+$/))
      return "Name: alphanumerics, hyphen and underscore";
  }

  if (typeof o.email === "string") {
    if (o.email.length == 0) return "Missing email";
    if (!o.email.match(/^[\w.+-]+@[\w.+-]+$/)) return "Invalid email";
  }

  return "";
}
