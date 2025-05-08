import { collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { auth, db } from "./firebase/connect.js";
import { getChatRoomId } from "./recent_chat.js";

export async function getChatMessages(otherId, chatRoomId) {
    // Get chatmate data
    const userQuery = query(
        collection(db, "users"),
        where("uid", "==", otherId)
    );
    const userQuerySnapshot = await getDocs(userQuery);

    // Ensure the query result is not empty
    if (userQuerySnapshot.empty || !userQuerySnapshot.docs[0]) {
        console.error("No user data found for the given ID:", otherId);
        return;
    }

    const otherUserData = userQuerySnapshot.docs[0].data();

    // Update name header
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
        collection(db, "Chatrooms", chatRoomId, "chat"),
        orderBy("timestamp", "desc")
    );

    const messagesSnapshot = await getDocs(messagesQuery);
    
    if (messagesSnapshot.empty) {
        messagesContainer.innerHTML = '<div class="no-messages">No messages yet</div>';
        return;
    }

    messagesSnapshot.forEach(doc => {
        displayChatMessage(doc, messagesContainer, otherUserData);
    });
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function displayChatMessage(doc, container, otherUserData) {
    try {
        const messageData = doc?.data();
        if (!messageData) {
            console.error("Message data is undefined");
            return;
        }

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
    formData.append("upload_preset", "ifound"); // Replace with your Cloudinary upload preset
    formData.append("cloud_name", "dyvk0urit"); // Replace with your Cloudinary cloud name

    try {
        const response = await fetch("https://api.cloudinary.com/v1_1/dyvk0urit/image/upload", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error("Failed to upload image to Cloudinary");
        }

        const data = await response.json();
        return data.secure_url; // Return the uploaded image URL
    } catch (error) {
        console.error("Error uploading image:", error);
        throw error;
    }
}

async function sendMessage(chatRoomId, message, imageFile = null) {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            console.error("No authenticated user");
            return;
        }

        let imageUrl = null;
        if (imageFile) {
            imageUrl = await uploadImageToCloudinary(imageFile); // Upload image and get URL
        }

        const messagesRef = collection(db, "Chatrooms", chatRoomId, "chat");
        await addDoc(messagesRef, {
            sender: currentUser.uid,
            text: message || null, // Allow empty text if an image is sent
            imageUrl: imageUrl, // Save the image URL
            timestamp: new Date(),
        });

        const chatroomRef = doc(db, "Chatrooms", chatRoomId);
        await updateDoc(chatroomRef, {
            lastMessage: message || "Image sent",
            lastUpdated: new Date(),
            lastSender: currentUser.uid,
        });

        await getChatMessages(chatRoomId, chatRoomId);
    } catch (error) {
        console.error("Error sending message:", error);
        throw error;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const sendIcon = document.querySelector(".send_icon");
    const imageInput = document.getElementById("imageInput");

    sendIcon.addEventListener("click", async () => {
        const messageInput = document.querySelector(".message_input");
        const message = messageInput.value.trim();
        const imageFile = imageInput.files[0];

        if (!message && !imageFile) {
            alert("Please enter a message or select an image to send.");
            return;
        }

        try {
            await sendMessage(getChatRoomId(), message, imageFile);
            messageInput.value = "";
            imageInput.value = ""; // Clear the file input
        } catch (error) {
            alert("Error sending message: " + error.message);
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const imgIcon = document.querySelector('.image_icon');
    
    if (imgIcon) {
      // Create hidden file input
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.style.display = 'none';
      fileInput.id = 'imageInput'; // Add ID for reference
      document.body.appendChild(fileInput);
  
      // Create preview container (dynamically)
      const previewDiv = document.createElement('div');
      previewDiv.className = 'image-preview';
      imgIcon.insertAdjacentElement('afterend', previewDiv);
  
      // Make image clickable
      imgIcon.style.cursor = 'pointer';
      imgIcon.addEventListener('click', () => fileInput.click());
  
      // Handle file selection and display
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            previewDiv.innerHTML = ''; // Clear previous
            const previewImg = document.createElement('img');
            previewImg.src = event.target.result;
            previewImg.style.maxHeight = '150px';
            previewDiv.appendChild(previewImg);
          };
          reader.readAsDataURL(file);
        }
      });
    }
});