const firebaseConfig = {
    apiKey: "AIzaSyDJHgD-oUB2h5rVb0lSDR_pyqMpt9Gdn0",
    authDomain: "webapplostandfound.firebaseapp.com",
    projectId: "webapplostandfound",
    storageBucket: "webapplostandfound.appspot.com",
    messagingSenderId: "23544433053",
    appId: "1:23544433053:web:ad48cddc2b2f39407c4774"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

console.log(" Firebase initialized successfully.");
