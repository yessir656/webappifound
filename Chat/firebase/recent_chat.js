import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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


async function getRecentChats() {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const recentChatQuery = query(
        collection(db, "chatrooms"),
        where("users", "array-contains", currentUser.uid)
    );

    const querySnapshot = await getDocs(recentChatQuery);

    for (const docSnapshot of querySnapshot.docs) {
        const chatroomData = docSnapshot.data();
        const [uid1, uid2] = chatroomData.users;
        const otherUserId = uid1 === currentUser.uid ? uid2 : uid1;

        const userQuery = query(collection(db, "users"), where("uid", "==", otherUserId));
        const userQuerySnapshot = await getDocs(userQuery);

        userQuerySnapshot.forEach(userDoc => {

            const userData = userDoc.data();

            const chatDiv = document.createElement("div");
            chatDiv.className = "recent_list";

            const img = document.createElement("img");
            img.src = "img/user_icon.png";
            img.style.width = "30px";
            img.style.height = "30px";
            chatDiv.appendChild(img);

            const nameText = document.createElement("div");
            nameText.textContent = userData.username || "Unknown";
            chatDiv.appendChild(nameText);

            const lastMsg = document.createElement("div");
            lastMsg.textContent = chatroomData.lastMessage || "No messages yet";
            chatDiv.appendChild(lastMsg);

            document.querySelector(".recent_chat").appendChild(chatDiv);
            nameText.classList.add("chat-name");
            lastMsg.classList.add("chat-message");

        });
    }
}

//  Auto-call the function once the user is authenticated
onAuthStateChanged(auth, (user) => {
    if (user) {
        getRecentChats();
    } else {
        window.location.href = "index.html";
    }
});
