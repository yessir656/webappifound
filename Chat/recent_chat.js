import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { auth, db } from "./firebase/connect.js";
import { getChatMessages } from "./send_chat.js";

let currentRoomId = null;
let allChats = []; // Store all chats for filtering

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
                            const userDoc = userQuerySnapshot.docs[0];
                            if (!userDoc) {
                                console.error("User document is undefined");
                                return null;
                            }
                            return {
                                chatroomId: docSnapshot.id,
                                chatData: chatroomData,
                                userData: userDoc.data(),
                                otherUserId: otherUserId
                            };
                        }
                        console.warn("No user found for UID:", otherUserId);
                        return null;
                    })
            );
        });

        allChats = (await Promise.all(chatPromises)).filter(chat => chat !== null); // Store all chats
        
        if (allChats.length === 0) {
            chatListContainer.innerHTML = '<div class="no-chats">No recent chats</div>';
            return;
        }

        renderChats(allChats, chatListContainer);
    } catch (error) {
        console.error("Error loading chats:", error);
        chatListContainer.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
    }
}

function renderChats(chats, container) {
    container.innerHTML = ''; // Clear the container
    chats.forEach(chat => {
        createDivForRecentChats(chat, container);
    });
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

export function filterChats(searchQuery) {
    const filteredChats = allChats.filter(chat => 
        chat.userData.username.toLowerCase().includes(searchQuery) ||
        chat.chatData.lastMessage.toLowerCase().includes(searchQuery)
    );
    const chatListContainer = document.querySelector(".chat-list-container");
    renderChats(filteredChats, chatListContainer);
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        getRecentChats();
    } else {
        window.location.href = "index.html";
    }
});