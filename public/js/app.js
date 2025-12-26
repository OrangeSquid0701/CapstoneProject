document.addEventListener("DOMContentLoaded", async () => {
  // Wait until firebase is available
  await new Promise((resolve) => {
    const check = setInterval(() => {
      if (window.firebase?.apps?.length) {
        clearInterval(check);
        resolve();
      }
    }, 50);
  });

  const app = firebase.app();
  console.log("Firebase initialized:", app.name);
});

function googleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();

  firebase.auth()
    .signInWithPopup(provider)
    .then((result) => {
      const user = result.user;
      console.log("Logged in as:", user.displayName);
      window.location.href = "main.html";
    })
    .catch((error) => {
      console.error("Login failed:", error.code, error.message);
    });
}
