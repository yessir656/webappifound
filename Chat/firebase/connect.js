import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDJHgD-oUB2h5rVvB0ISDR_pyqMpt9Gdn0",
  authDomain: "webapplostandfound.firebaseapp.com",
  projectId: "webapplostandfound",
  storageBucket: "webapplostandfound.appspot.com",
  messagingSenderId: "23544433053",
  appId: "1:23544433053:web:ad48cddc2b2f39407c4774",
  measurementId: "G-2LGQZ7VY6P"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Export Firebase services
export { auth, db };