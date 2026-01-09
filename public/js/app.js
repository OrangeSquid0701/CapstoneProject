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

function guestLogin() {
    // We use the actual Firebase method so 'onAuthStateChanged' gets triggered
    firebase.auth().signInAnonymously()
        .then(() => {
            console.log('Logged in as Guest (Anonymous)');
            // No need to manually redirect here if onAuthStateChanged handles it,
            // but if you are on a login-only page, you might want to:
             window.location.href = "main.html"; 
        })
        .catch((error) => {
            console.error("Guest Login Error:", error);
            alert("Guest login failed. Check console.");
        });
}