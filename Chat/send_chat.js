import {
    collection, query, where, getDocs, doc, getDoc, addDoc,
    updateDoc, orderBy, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { auth, db } from "./firebase/connect.js";
import { getChatRoomId } from "./recent_chat.js";

let unsubscribeMessages = null;

export async function listenToChatMessages(otherId, chatRoomId) {
    // Stop existing listener
    if (unsubscribeMessages) {
        unsubscribeMessages();
    }

    const userQuery = query(
        collection(db, "users"),
        where("uid", "==", otherId)
    );
    const userQuerySnapshot = await getDocs(userQuery);

    if (userQuerySnapshot.empty || !userQuerySnapshot.docs[0]) {
        console.error("No user data found for the given ID:", otherId);
        return;
    }

    const otherUserData = userQuerySnapshot.docs[0].data();

    const nameElements = document.getElementsByClassName('chatmate');
    if (nameElements.length > 0) {
        nameElements[0].textContent = otherUserData.username || "username";
    }

    const messagesContainer = document.querySelector('.message-content');
    if (!messagesContainer) {
        console.error("Message container not found");
        return;
    }

    const messagesQuery = query(
        collection(db, "Chatrooms", chatRoomId, "chat"),
        orderBy("timestamp", "desc")
    );

    unsubscribeMessages = onSnapshot(messagesQuery, (messagesSnapshot) => {
        messagesContainer.innerHTML = '';

        if (messagesSnapshot.empty) {
            messagesContainer.innerHTML = '<div class="no-messages">No messages yet</div>';
            return;
        }

        messagesSnapshot.forEach(doc => {
            displayChatMessage(doc, messagesContainer, otherUserData);
        });

        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}

function displayChatMessage(doc, container, otherUserData) {
    try {
        const messageData = doc?.data();
        if (!messageData) return;

        const isCurrentUser = messageData.sender === auth.currentUser?.uid;
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isCurrentUser ? 'message-right' : 'message-left'}`;

        if (!isCurrentUser && otherUserData) {
            const senderAvatar = document.createElement('img');
            senderAvatar.src = otherUserData.photoURL || "img/user_icon.png";
            senderAvatar.className = 'message-avatar';
            senderAvatar.alt = 'Profile picture';
            messageDiv.appendChild(senderAvatar);
        }

        const messageContent = document.createElement('div');
        messageContent.className = 'message-text';

        if (messageData.text) {
            const textElement = document.createElement('p');
            textElement.textContent = messageData.text;
            messageContent.appendChild(textElement);
        }

        if (messageData.imageUrl) {
            const imageElement = document.createElement('img');
            imageElement.src = messageData.imageUrl;
            imageElement.alt = "Sent image";
            imageElement.style.maxWidth = "100%";
            imageElement.style.borderRadius = "10px";
            messageContent.appendChild(imageElement);
        }

        messageDiv.appendChild(messageContent);

        if (messageData.timestamp) {
            const timeDiv = document.createElement('div');
            timeDiv.className = 'message-time';
            timeDiv.textContent = formatTime(messageData.timestamp.toDate());
            messageDiv.appendChild(timeDiv);
        }

        container.appendChild(messageDiv);
    } catch (error) {
        console.error("Error displaying chat message:", error);
    }
}

function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

async function uploadImageToCloudinary(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "ifound"); // Replace with your Cloudinary preset
    formData.append("cloud_name", "dyvk0urit"); // Replace with your Cloudinary name

    const response = await fetch("https://api.cloudinary.com/v1_1/dyvk0urit/image/upload", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        throw new Error("Failed to upload image to Cloudinary");
    }

    const data = await response.json();
    return data.secure_url;
}

export async function sendMessage(chatRoomId, message, imageFile = null) {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("No authenticated user");

        const chatroomRef = doc(db, "Chatrooms", chatRoomId);
        const chatroomSnap = await getDoc(chatroomRef);
        if (!chatroomSnap.exists()) throw new Error("Chatroom not found");

        const chatroomData = chatroomSnap.data();
        const [uid1, uid2] = chatroomData.users;
        const otherUserId = uid1 === currentUser.uid ? uid2 : uid1;

        let imageUrl = null;
        if (imageFile) {
            imageUrl = await uploadImageToCloudinary(imageFile);
        }
 
        const messagesRef = collection(db, "Chatrooms", chatRoomId, "chat");
        await addDoc(messagesRef, {
            sender: currentUser.uid,
            text: message || null,
            imageUrl: imageUrl,
            timestamp: new Date()
        });

        await updateDoc(chatroomRef, {
            lastMessage: message || "Image sent",
            lastUpdated: new Date(),
            lastSender: currentUser.uid
        });

    } catch (error) {
        console.error("Error sending message:", error);
        throw error;
    }
}

// Event listener for sending message
document.addEventListener('DOMContentLoaded', () => {
    const sendIcon = document.querySelector(".send_icon");
    const messageInput = document.querySelector(".message_input");
    const imageInput = document.getElementById("imageInput");

    // Send text message on send icon click
    sendIcon?.addEventListener("click", async () => {
        const message = messageInput.value.trim();
        if (!message) {
            alert("Please enter a message.");
            return;
        }
        try {
            await sendMessage(localStorage.getItem("chatRoomId"), message, null);
            messageInput.value = "";
        } catch (error) {
            alert("Error sending message: " + error.message);
        }
    });

    // Send image automatically after selecting a file
    imageInput?.addEventListener("change", async () => {
        const imageFile = imageInput.files[0];
        if (!imageFile) return;
        try {
            await sendMessage(localStorage.getItem("chatRoomId"), null, imageFile);
            imageInput.value = ""; // Clear the file input
        } catch (error) {
            alert("Error sending image: " + error.message);
        }
    });
});
