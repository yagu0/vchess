// Note: not using Vue, but would be possible
function trySendMessage()
{
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
}
