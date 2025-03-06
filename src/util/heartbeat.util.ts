import { Context } from '@midwayjs/ws';
import { WebSocket } from 'ws';
import { ESocketMessageType } from '../enums/socket.enum';
export function setupHeartbeat(socket: Context, id) {
  // 设置心跳超时时间
  const HEARTBEAT_TIMEOUT = 1165 * 1000; // 65秒超时
  const HEARTBEAT_INTERVAL = 1130 * 1000; // 30秒发送一次心跳

  let timeout: NodeJS.Timeout;

  // 发送心跳包
  const sendPing = () => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ t: ESocketMessageType.ping }));
    }
  };

  // 清除定时器
  const clearTimers = () => {
    if (timeout) {
      clearTimeout(timeout);
    }
  };

  // 初始化心跳机制
  const resetHeartbeat = () => {
    clearTimers();
    timeout = setTimeout(() => {
      console.log('Heartbeat timeout for client:', id);
      socket.close(); // 关闭连接
    }, HEARTBEAT_TIMEOUT);
  };

  sendPing();
  // 定期发送心跳包
  setInterval(sendPing, HEARTBEAT_INTERVAL);

  // 监听消息事件以重置心跳计时器
  socket.on('message', data => {
    try {
      const message = JSON.parse(data.toString());
      if (message.t === ESocketMessageType.pong) {
        resetHeartbeat(); // 重置心跳计时器
      }
    } catch (error) {
      console.error('Error processing heartbeat message:', error);
    }
  });

  // 初始化心跳
  resetHeartbeat();

  // 监听关闭事件清除定时器
  socket.on('close', () => {
    clearTimers();
  });
}

// var a = {
//   t: 'join',
//   endpoint: 'server',
//   group: 'aaa',
// }
// var a = {
//   t: 'pong',
// }
// var a = {
//   t: 'm',
//   data: {}
// }
