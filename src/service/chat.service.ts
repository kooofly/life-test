import { Provide } from '@midwayjs/decorator';
import * as LZString from 'lz-string';

@Provide()
export class ChatService {
  private userConnections = new Map<string, any>();

  // 用户加入处理
  handleJoin(socket) {
    const userId = `user_${Math.random().toString(36).substr(2, 9)}`;
    this.userConnections.set(userId, { socket });
    // socket.emit('join', { userId });
    console.log(`User ${userId} joined.`);
    return { userId };
  }

  // 消息处理
  handleChat(socket, message) {
    const senderId = this.getUserBySocket(socket);
    if (!senderId) return;

    if (message.type === 'group') {
      this.broadcastMessage(senderId, message.content);
    } else if (message.type === 'private') {
      this.sendMessageToUser(senderId, message.to, message.content);
    }
  }

  // 广播消息
  broadcastMessage(senderId, content) {
    const compressedContent = this.compressMessage(content);
    this.userConnections.forEach(({ socket }) => {
      socket.emit('group-chat', { senderId, content: compressedContent });
    });
  }

  // 点对点消息
  sendMessageToUser(senderId, receiverId, content) {
    const compressedContent = this.compressMessage(content);
    const receiver = this.userConnections.get(receiverId);
    if (receiver) {
      receiver.socket.emit('private-chat', {
        senderId,
        content: compressedContent,
      });
    }
  }

  // 获取用户 ID
  getUserBySocket(socket) {
    for (const [userId, user] of this.userConnections.entries()) {
      if (user.socket.id === socket.id) return userId;
    }
    return null;
  }

  // 消息压缩与解压工具
  compressMessage(message) {
    return LZString.compressToUTF16(message);
  }

  decompressMessage(compressedMessage) {
    return LZString.decompressFromUTF16(compressedMessage);
  }
}
