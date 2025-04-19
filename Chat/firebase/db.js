import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyDJHgD-oUB2h5rVvB0ISDR_pyqMpt9Gdn0",
    authDomain: "webapplostandfound.firebaseapp.com",
    projectId: "webapplostandfound",
    storageBucket: "webapplostandfound.appspot.com",
    messagingSenderId: "23544433053",
    appId: "1:23544433053:web:ad48cddc2b2f39407c4774",
    measurementId: "G-2LGQZ7VY6P"
    };

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    onAuthStateChanged(auth, (user) => {
        if (!user) {
            alert("You must be logged in to post an item.");
            window.location.href = "login.html";
        }
    });


