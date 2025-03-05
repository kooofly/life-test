import { Context } from '@midwayjs/ws';
import { WebSocket } from 'ws';
export function setupHeartbeat(socket: Context, id) {
  // 设置心跳超时时间
  const HEARTBEAT_TIMEOUT = 65 * 1000; // 65秒超时
  const HEARTBEAT_INTERVAL = 30 * 1000; // 30秒发送一次心跳

  let timeout: NodeJS.Timeout;

  // 发送心跳包
  const sendPing = () => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'ping' }));
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
      if (message.type === 'pong') {
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
