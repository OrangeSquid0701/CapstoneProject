import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBAspbWVP7wjU_abImLK2e4PAWjI4oacRA",
  authDomain: "p2g08-project.firebaseapp.com",
  databaseURL: "https://p2g08-project-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "p2g08-project",
  storageBucket: "p2g08-project.firebasestorage.app",
  messagingSenderId: "244691428453",
  appId: "1:244691428453:web:6134848f596e99988f528c",
  measurementId: "G-KQP25TE1CV"
};

// 3. Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// 4. Create a reference to the exact path you used in Arduino
// In your Arduino code, you used: String path = "/sensor/count";
const countRef = ref(database, 'sensor/count');

// 5. Listen for data changes in real-time
onValue(countRef, (snapshot) => {
    const data = snapshot.val();
    console.log("New data received:", data); // Check your browser console (F12)
    
    // Update the HTML element
    if(data !== null) {
        document.getElementById('counter-value').innerText = data;
    } else {
        document.getElementById('counter-value').innerText = "No Data";
    }
});
