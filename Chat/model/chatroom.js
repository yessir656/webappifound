export class Chatroom{
    constructor(chatroomId, users = [], lastSender = "", lastMessage = "", timeStamp = null){
        this.chatroomId = chatroomId;
        this.users = users;          
        this.lastSender = lastSender;
        this.lastMessage = lastMessage;
        this.timeStamp = timeStamp || new Date();
    }

    // Convert class instance to Firestore-compatible object
    toFirestore() {
        return {
        chatRoomId: this.chatroomId,
        users: this.users,
        lastSender: this.lastSender,
        lastMessage: this.lastMessage,
        timestamp: this.timeStamp  // Firestore prefers 'timestamp' as field name
        };
    }

    // Static method to create instance from Firestore data
    static fromFirestore(data) {
        return new Chatroom(
        data.chatRoomId,
        data.users,
        data.lastSender,
        data.lastMessage,
        data.timestamp
        );
    }
}