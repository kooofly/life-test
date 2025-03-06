import { Provide } from '@midwayjs/decorator';
import { Context } from '@midwayjs/ws';
import * as LZString from 'lz-string';
import { ESocketEndpoint, ESocketMessageKey } from '../enums/socket.enum';

const uc = new Map<string, any>();
@Provide()
export class ChatService {
  private userConnections = uc;

  // 用户加入处理
  handleJoin(socket) {
    const userId = `user_${Math.random().toString(36).substr(2, 9)}`;
    this.userConnections.set(userId, socket);
    // socket.emit('join', { userId });
    console.log(`User ${userId} joined.`);
    return { userId };
  }

  handleMessage(socket: Context, message) {
    const senderId = socket.getAttr('id');

    const endpoint = socket.getAttr(ESocketMessageKey.endpoint);
    if (!endpoint) {
      console.error('无 endpoint');
      return;
    }

    const ids = message[ESocketMessageKey.toSocketIds];
    if (ids && ids.length) {
      ids.forEach(receiverId => {
        this.sendMessageToUser(
          senderId,
          receiverId,
          message[ESocketMessageKey.content]
        );
      });
      return;
    }

    const call = this[`${endpoint}Message`];
    if (!call) {
      console.error('endpoint 错误', endpoint);
      return;
    }

    this[`${endpoint}Message`](socket, message);
  }

  /**
   * Server To Client server发消息给client模式 多对多
   * @param socket
   * @param message
   * @returns
   */
  sMessage(socket: Context, message) {
    console.log(message);
    const group = socket.getAttr(ESocketMessageKey.group);
    const senderId = socket.getAttr('id');
    const connections = [];
    this.userConnections.forEach(s => {
      if (
        s.getAttr(ESocketMessageKey.endpoint) === ESocketEndpoint.client &&
        s.getAttr(ESocketMessageKey.group) === group
      ) {
        connections.push(s);
      }
    });

    if (!connections || !connections.length) {
      return;
    }

    connections.forEach(s => {
      const receiverId = s.getAttr('id');
      this.sendMessageToUser(
        senderId,
        receiverId,
        message[ESocketMessageKey.content]
      );
    });
  }

  /**
   * Client To Server  server发消息给client模式 多对多
   * @param socket
   * @param message
   * @returns
   */
  cMessage(socket: Context, message) {
    console.log(message);
    const group = socket.getAttr(ESocketMessageKey.group);
    const senderId = socket.getAttr('id');
    const connections = [];
    this.userConnections.forEach(s => {
      if (
        s.getAttr(ESocketMessageKey.endpoint) === ESocketEndpoint.server &&
        s.getAttr(ESocketMessageKey.group) === group
      ) {
        connections.push(s);
      }
    });

    if (!connections || !connections.length) {
      return;
    }

    connections.forEach(s => {
      const receiverId = s.getAttr('id');
      this.sendMessageToUser(
        senderId,
        receiverId,
        message[ESocketMessageKey.content]
      );
    });
  }

  /**
   * member to member 多对多
   * @param socket
   * @param message
   * @returns
   */
  mMessage(socket: Context, message) {
    const group = socket.getAttr(ESocketMessageKey.group);
    const senderId = socket.getAttr('id');
    console.log({
      message,
      group,
    });
    const connections = [];
    this.userConnections.forEach(s => {
      console.log('userConnections', s.getAttr('id'));
      if (
        s.getAttr(ESocketMessageKey.endpoint) === ESocketEndpoint.member &&
        s.getAttr(ESocketMessageKey.group) === group
      ) {
        connections.push(s);
      }
    });

    if (!connections || !connections.length) {
      return;
    }

    connections.forEach(s => {
      console.log('message:xxx', s.getAttr('id'));
      const receiverId = s.getAttr('id');
      // chat 模式不用return
      // if (receiverId === senderId) {
      //   return;
      // }
      this.sendMessageToUser(
        senderId,
        receiverId,
        message[ESocketMessageKey.content]
      );
    });
  }

  // 点对点消息
  sendMessageToUser(senderId, receiverId, content) {
    // const compressedContent = this.compressMessage(content);
    const compressedContent = content;
    const receiver = this.userConnections.get(receiverId);
    if (receiver) {
      receiver.send(
        JSON.stringify({
          sender: senderId,
          content: compressedContent,
        })
      );
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
}
