export default function afterRawLoad(text) {
  return (
    text
    // Next two lines fix a weird issue after last update (2019-11)
    .replace(/\\n/g, " ")
    .replace(/\\"/g, '"')
    .replace('export default "', "")
    .replace(/";$/, "")
  );
}
