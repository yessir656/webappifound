import { collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { auth, db } from "./firebase/connect.js";
import { getChatRoomId } from "./recent_chat.js";

export async function getChatMessages(otherId, chatRoomId){
    // Get chatmate data
    const userQuery = query(
        collection(db, "users"),
        where("uid", "==", otherId)
    );
    const userQuerySnapshot = await getDocs(userQuery);

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

    function displayChatMessage(doc, container, otherUserData){
        try{
            const messageData = doc.data();
        const isCurrentUser = messageData.sender === auth.currentUser.uid;
            
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
            
        container.appendChild(messageDiv);
  
        }catch( error ){
            alert(error);
        }
    }

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
    
            // 1. First get the chatroom document to find the other user
            const chatroomRef = doc(db, "Chatrooms", chatRoomId);
            const chatroomSnap = await getDoc(chatroomRef);
            
            if (!chatroomSnap.exists()) {
                throw new Error("Chatroom not found");
            }
    
            // 2. Extract the other user's ID
            const chatroomData = chatroomSnap.data();
            const [uid1, uid2] = chatroomData.users;
            const otherUserId = uid1 === currentUser.uid ? uid2 : uid1;
            
            if (!otherUserId) {
                throw new Error("Other user not found in chatroom");
            }
    
            // 3. Proceed with sending message
            const messagesRef = collection(db, "Chatrooms", chatRoomId, "chat");
            await addDoc(messagesRef, {
                sender: currentUser.uid,
                text: message,
                timestamp: new Date()
            });
    
            // 4. Update chatroom
            await updateDoc(chatroomRef, {
                lastMessage: message,
                lastUpdated: new Date(),
                lastSender: currentUser.uid // Track who sent last message
            });
    
            // 5. Refresh messages (use the otherUserId we just found)
            await getChatMessages(otherUserId, chatRoomId);
    
        } catch (error) {
            alert(error);
            throw error; 
        }
    }


    document.addEventListener('DOMContentLoaded', () => {
        const sendIcon = document.querySelector(".send_icon");
        
        if (sendIcon) {
            sendIcon.addEventListener("click", async () => {
                const messageInput = document.querySelector(".message_input");
                if (messageInput && messageInput.value.trim()) {
                    try {
                        await sendMessage(getChatRoomId(), messageInput.value.trim());
                        messageInput.value = '';
                    } catch(error) {
                        alert(error);
                    }
                }
            });
        }
    });