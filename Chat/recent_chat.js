import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { auth, db } from "./firebase/connect.js";
import { listenToChatMessages } from "./send_chat.js";

let currentRoomId = null;
let allChats = []; 
let chatroomListeners = {}; 

async function getRecentChats() {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  // Clean up previous listeners
  Object.values(chatroomListeners).forEach((unsub) => unsub && unsub());
  chatroomListeners = {};

  const chatListContainer = document.querySelector(".chat-list-container");
  chatListContainer.innerHTML = "";

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
        getDocs(
          query(collection(db, "users"), where("uid", "==", otherUserId))
        ).then((userQuerySnapshot) => {
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
              otherUserId: otherUserId,
            };
          }
          console.warn("No user found for UID:", otherUserId);
          return null;
        })
      );
    });

    allChats = (await Promise.all(chatPromises)).filter(
      (chat) => chat !== null
    );

    if (allChats.length === 0) {
      chatListContainer.innerHTML =
        '<div class="no-chats">No recent chats</div>';
      return;
    }

    // Set up real-time listeners for each chatroom's last message
    allChats.forEach((chat) => {
      if (chatroomListeners[chat.chatroomId]) {
        chatroomListeners[chat.chatroomId](); // Unsubscribe if already exists
      }
      const chatroomRef = doc(db, "Chatrooms", chat.chatroomId);
      chatroomListeners[chat.chatroomId] = onSnapshot(
        chatroomRef,
        (docSnap) => {
          if (docSnap.exists()) {
            // Update chatData in allChats
            const updatedData = docSnap.data();
            chat.chatData = updatedData;
            // Re-render all chats for simplicity
            renderChats(
              allChats,
              document.querySelector(".chat-list-container")
            );
          }
        }
      );
    });

    renderChats(allChats, chatListContainer);
  } catch (error) {
    console.error("Error loading chats:", error);
    chatListContainer.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
  }
}

function renderChats(chats, container) {
  container.innerHTML = ""; // Clear the container
  chats.forEach((chat) => {
    createDivForRecentChats(chat, container);
  });
}

function createDivForRecentChats(chat, chatListContainer) {
  const chatDiv = document.createElement("div");
  chatDiv.className = "recent_list";
  chatDiv.style.cursor = "pointer";
  chatDiv.addEventListener("click", () => {
    listenToChatMessages(chat.otherUserId, chat.chatroomId);
    currentRoomId = chat.chatroomId;
    localStorage.setItem("chatRoomId", chat.chatroomId);
    localStorage.setItem("chatOtherUserId", chat.otherUserId);
  });

  const img = document.createElement("img");
  img.src = "img/user_icon.png";
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
  // Add "You: " if the current user was the last sender
  let lastMessageText = chat.chatData.lastMessage || "No messages yet";
  if (
    chat.chatData.lastSender === auth.currentUser?.uid &&
    lastMessageText !== "No messages yet"
  ) {
    lastMessageText = "You: " + lastMessageText;
  }
  lastMsg.textContent = lastMessageText;
  lastMsg.classList.add("chat-message");
  textContainer.appendChild(lastMsg);

  chatDiv.appendChild(textContainer);
  chatListContainer.appendChild(chatDiv);
}

export function getChatRoomId() {
  return currentRoomId;
}

export function filterChats(searchQuery) {
  const filteredChats = allChats.filter(
    (chat) =>
      chat.userData.username.toLowerCase().includes(searchQuery) ||
      (chat.chatData.lastMessage || "").toLowerCase().includes(searchQuery)
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
