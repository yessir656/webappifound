import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { auth, db } from "./firebase/connect.js";
import { getChatMessages } from "./send_chat.js";

let currentRoomId = null;

async function getRecentChats() {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const chatListContainer = document.querySelector(".chat-list-container");
    chatListContainer.innerHTML = ''; 
    
    const recentChatQuery = query(
        collection(db, "Chatrooms"),
        where("users", "array-contains", currentUser.uid)
    );

    try {
        const querySnapshot = await getDocs(recentChatQuery);
        const chatPromises = [];

        querySnapshot.forEach((docSnapshot) => {
            const chatroomData = docSnapshot.data();
            const [uid1, uid2] = chatroomData.users;
            const otherUserId = uid1 === currentUser.uid ? uid2 : uid1;

            chatPromises.push(
                getDocs(query(collection(db, "users"), where("uid", "==", otherUserId)))
                    .then((userQuerySnapshot) => {
                        if (!userQuerySnapshot.empty) {
                            return {
                                chatroomId: docSnapshot.id,
                                chatData: chatroomData,
                                userData: userQuerySnapshot.docs[0].data(),
                                otherUserId: otherUserId
                            };
                        }
                        return null;
                    })
            );
        });

        const allChats = (await Promise.all(chatPromises)).filter(chat => chat !== null);
        
        if (allChats.length === 0) {
            chatListContainer.innerHTML = '<div class="no-chats">No recent chats</div>';
            return;
        }

        allChats.forEach(chat => {
            createDivForRecentChats(chat, chatListContainer);
        });
    } catch (error) {
        console.error("Error loading chats:", error);
        chatListContainer.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
    }
}

function createDivForRecentChats(chat, chatListContainer) {
    const chatDiv = document.createElement("div");
    chatDiv.className = "recent_list";
    chatDiv.style.cursor = "pointer";
    chatDiv.addEventListener("click", () => {
        getChatMessages(chat.otherUserId, chat.chatroomId);
        currentRoomId = chat.chatroomId;
    });

    const img = document.createElement("img");
    img.src ="img/user_icon.png";
    img.alt = "Profile picture";
    img.style.width = "30px";
    img.style.height = "30px";
    img.classList.add("chat-avatar");
    chatDiv.appendChild(img); 

    const textContainer = document.createElement("div");
    textContainer.classList.add("chat-text-container");
        
    const nameText = document.createElement("div");
    nameText.textContent = chat.userData.username || "Unknown";
    nameText.classList.add("chat-name");
    textContainer.appendChild(nameText);

    const lastMsg = document.createElement("div");
    lastMsg.textContent = chat.chatData.lastMessage || "No messages yet";
    lastMsg.classList.add("chat-message");
    textContainer.appendChild(lastMsg);

    chatDiv.appendChild(textContainer);
    chatListContainer.appendChild(chatDiv);
}

export function getChatRoomId(){
    return currentRoomId;
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        getRecentChats();
    } else {
        window.location.href = "index.html";
    }
});