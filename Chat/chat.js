import { auth, db } from "./firebase/connect.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, query, where, getDocs, addDoc, doc, updateDoc, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";


let clickedUser = null;
let clickedRoom = null;

async function getRecentChats() {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // Target only the chat list container
    const chatListContainer = document.querySelector(".chat-list-container");
    chatListContainer.innerHTML = ''; // Clear only the chat items
    
    const recentChatQuery = query(
        collection(db, "chatrooms"),
        where("users", "array-contains", currentUser.uid)
    );

    try {
        const querySnapshot = await getDocs(recentChatQuery);
        const chatPromises = [];

        querySnapshot.forEach(docSnapshot => {
            const chatroomData = docSnapshot.data();
            const [uid1, uid2] = chatroomData.users;
            const otherUserId = uid1 === currentUser.uid ? uid2 : uid1;

            chatPromises.push(
                getDocs(query(collection(db, "users"), where("uid", "==", otherUserId)))
                    .then(userQuerySnapshot => {
                        if (!userQuerySnapshot.empty) {
                            const userDoc = userQuerySnapshot.docs[0];
                            return {
                                userData: userDoc.data(),
                                chatData: chatroomData,
                                otherUserId: otherUserId,
                                chatroomId: docSnapshot.id
                            };
                        }
                        return null;
                    })
            );
        });

        const allChats = await Promise.all(chatPromises);
        const validChats = allChats.filter(chat => chat !== null);
        
        // Add loading indicator
        if (validChats.length === 0) {
            chatListContainer.innerHTML = '<div class="no-chats">No recent chats</div>';
            return;
        }

        validChats.forEach(chat => {
            const chatDiv = document.createElement("div");
            chatDiv.className = "recent_list";

            chatDiv.style.cursor = "pointer";
            chatDiv.addEventListener("click", () => {
                getChatMessages(chat.otherUserId, chat.chatroomId);
            });

            const img = document.createElement("img");
            img.src = chat.userData.photoURL || "img/user_icon.png";
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
        });

    } catch (error) {
        console.error("Error loading chats:", error);
        chatListContainer.innerHTML = '<div class="error-message">Error loading chats</div>';
    }
}

async function getChatMessages(otherUserId, chatroomId) {
    try {
        clickedUser = otherUserId;
        clickedRoom = chatroomId;
        const currentUser = auth.currentUser;
        
        // Get user data
        const userQuery = query(
            collection(db, "users"),
            where("uid", "==", otherUserId)
        );

        const userQuerySnapshot = await getDocs(userQuery);
        
        if (userQuerySnapshot.empty) {
            console.log("User not found");
            return;
        }

        const otherUserData = userQuerySnapshot.docs[0].data();
        
        // Update chat header
        const nameElements = document.getElementsByClassName('chatmate');
        if (nameElements.length > 0) {
            nameElements[0].textContent = otherUserData.username || "username";
        }

        // Get the message content container
        const messagesContainer = document.querySelector('.message-content');
        if (!messagesContainer) {
            console.error("Message container not found");
            return;
        }
        
        // Clear previous messages but keep the container structure
        messagesContainer.innerHTML = '';

        // Get messages in ascending order (oldest first)
        const messagesQuery = query(
            collection(db, "chatrooms", chatroomId, "chat"),
            orderBy("timestamp", "asc")
        );

        const messagesSnapshot = await getDocs(messagesQuery);
        
        if (messagesSnapshot.empty) {
            messagesContainer.innerHTML = '<div class="no-messages">No messages yet</div>';
            return;
        }

        messagesSnapshot.forEach(doc => {
            const messageData = doc.data();
            const isCurrentUser = messageData.sender === currentUser.uid;
            
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${isCurrentUser ? 'message-right' : 'message-left'}`;
            
            if (!isCurrentUser) {
                const senderAvatar = document.createElement('img');
                senderAvatar.src = otherUserData.photoURL || "img/user_icon.png";
                senderAvatar.className = 'message-avatar';
                senderAvatar.alt = 'Profile picture';
                messageDiv.appendChild(senderAvatar);
            }
            
            const messageContent = document.createElement('div');
            messageContent.className = 'message-text';
            messageContent.textContent = messageData.text;
            messageDiv.appendChild(messageContent);
            
            // Add timestamp if available
            if (messageData.timestamp) {
                const timeDiv = document.createElement('div');
                timeDiv.className = 'message-time';
                timeDiv.textContent = formatTime(messageData.timestamp.toDate());
                messageDiv.appendChild(timeDiv);
            }
            
            messagesContainer.appendChild(messageDiv);
        });

        // Scroll to bottom to show latest message
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

    } catch(error) {
        console.error("Error in ChatMessages:", error);
    }
}

// Helper function to format time
function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

async function sendMessage(chatRoomId, message) {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            console.error("No authenticated user");
            return;
        }

        // Reference to the messages subcollection
        const messagesRef = collection(db, "chatrooms", chatRoomId, "chat");
        // Add new message document
        await addDoc(messagesRef, {
            sender: currentUser.uid,
            text: message,
            timestamp: new Date()
        });

        // Update the chatroom's last message timestamp
        const chatroomRef = doc(db, "chatrooms", chatRoomId);
        await updateDoc(chatroomRef, {
            lastMessage: message,
            lastUpdated: new Date()
        });

        // Refresh the messages
        await getChatMessages(clickedUser, clickedRoom);

    } catch (error) {
        console.error("Error sending message:", error);
        throw error; 
    }
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        getRecentChats();
    } else {
        window.location.href = "index.html";
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const sendIcon = document.querySelector(".send_icon");
    
    if (sendIcon) {
        sendIcon.addEventListener("click", async () => {
            const messageInput = document.querySelector(".message_input");
            if (messageInput && messageInput.value.trim()) {
                try {
                    await sendMessage(clickedRoom, messageInput.value.trim());
                    messageInput.value = '';
                } catch(error) {
                    console.error("Error sending message:", error);
                }
            }
        });
    }
});