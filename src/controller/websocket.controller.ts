import { Inject } from '@midwayjs/decorator';
import {
  WSController,
  OnWSConnection,
  OnWSMessage,
  WSBroadCast,
  OnWSDisConnection,
} from '@midwayjs/core';
import { Context } from '@midwayjs/ws';
import * as http from 'http';
// import { Context, Application } from '@midwayjs/ws';
import { ChatService } from '../service/chat.service';
import { setupHeartbeat } from '../util/heartbeat.util';
import { ESocketMessageKey, ESocketMessageType } from '../enums/socket.enum';

@WSController()
export class WebsocketController {
  @Inject()
  socket: Context;

  @Inject()
  chatService: ChatService;

  @OnWSConnection()
  async onConnectionMethod(socket: Context, request: http.IncomingMessage) {
    console.log(`namespace / got a connection ${this.socket.readyState}`);
  }

  @OnWSMessage('message')
  async gotMessage(data) {
    const { socket, chatService } = this;
    const dataStr = data.toString('utf8');
    let result;
    try {
      const message = JSON.parse(dataStr);
      switch (message[ESocketMessageKey.type]) {
        case ESocketMessageType.join: // 用户加入
          result = chatService.handleJoin(socket);
          socket.setAttr('id', result.userId);
          // 端类型 server | client | member | null
          if (message[ESocketMessageKey.endpoint]) {
            socket.setAttr(
              ESocketMessageKey.endpoint,
              message[ESocketMessageKey.endpoint]
            );
            result[ESocketMessageKey.endpoint] =
              message[ESocketMessageKey.endpoint];
          }
          // 分组名
          // 同个分组内的server会向client群发消息
          // 同个分组内的client会向分组内的server群发消息
          // 同个分组内的member将会收到所有member的消息，member无法接收client和server消息
          if (message[ESocketMessageKey.group]) {
            socket.setAttr(
              ESocketMessageKey.group,
              message[ESocketMessageKey.group]
            );
            result[ESocketMessageKey.group] = message[ESocketMessageKey.group];
          }
          setupHeartbeat(socket, result.userId);
          break;
        case ESocketMessageType.message: // 发送消息
          chatService.handleMessage(socket, message);
          break;
        case 'chat': // 发送消息
          chatService.handleChat(socket, message);
          break;
        case ESocketMessageType.pong:
          // 心跳内部处理
          break;
        default:
          console.warn('Unknown message type:', message.type);
          return {
            error: 1,
            message: `Unknown message type: ${message.type}`,
            result: message,
          };
      }
      return result;
    } catch (err) {
      return { error: 1, message: err.message };
    }
  }

  @OnWSMessage('message')
  @WSBroadCast()
  async gotMyMessage(data) {
    // return { name: 'harry xxx', result: parseInt(data) + 5 };
  }

  @OnWSDisConnection()
  async disconnect(id: number) {
    console.log('disconnect ' + id);
  }
}
