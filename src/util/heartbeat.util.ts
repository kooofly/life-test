import { Context } from '@midwayjs/ws';
import { WebSocket } from 'ws';
import { ESocketMessageType } from '../enums/socket.enum';

interface HeartbeatInfo {
  timeoutId?: NodeJS.Timeout;
  intervalId?: NodeJS.Timeout;
  lastPingTime: number;
  missedPongs: number;
}

const heartbeatMap = new Map<string, HeartbeatInfo>();

export function setupHeartbeat(socket: Context, id: string) {
  // 设置心跳超时时间
  const HEARTBEAT_TIMEOUT = 5000; // 5秒超时
  const HEARTBEAT_INTERVAL = 3000; // 3秒发送一次心跳
  const MAX_MISSED_PONGS = 2; // 最大允许丢失的pong数

  // 初始化心跳信息
  const heartbeatInfo: HeartbeatInfo = {
    lastPingTime: Date.now(),
    missedPongs: 0
  };
  
  heartbeatMap.set(id, heartbeatInfo);

  // 发送心跳包
  const sendPing = () => {
    if (socket.readyState === WebSocket.OPEN) {
      // 检查是否超时
      if (Date.now() - heartbeatInfo.lastPingTime > HEARTBEAT_TIMEOUT) {
        heartbeatInfo.missedPongs++;
        if (heartbeatInfo.missedPongs >= MAX_MISSED_PONGS) {
          console.log('Heartbeat failed for client:', id);
          socket.close(); // 关闭连接
          cleanupHeartbeat(id);
          return;
        }
      }
      
      socket.send(JSON.stringify({ t: ESocketMessageType.ping }));
      heartbeatInfo.lastPingTime = Date.now();
    }
  };

  // 清除定时器
  const clearTimers = () => {
    if (heartbeatInfo.timeoutId) {
      clearTimeout(heartbeatInfo.timeoutId);
    }
    if (heartbeatInfo.intervalId) {
      clearInterval(heartbeatInfo.intervalId);
    }
  };

  // 清理心跳资源
  const cleanupHeartbeat = (id: string) => {
    const info = heartbeatMap.get(id);
    if (info) {
      clearTimers();
      heartbeatMap.delete(id);
    }
  };

  // 启动心跳定时器
  heartbeatInfo.intervalId = setInterval(sendPing, HEARTBEAT_INTERVAL);

  // 监听消息事件以处理pong响应
  socket.on('message', data => {
    try {
      const message = JSON.parse(data.toString());
      if (message.t === ESocketMessageType.pong) {
        // 重置丢失计数
        heartbeatInfo.missedPongs = 0;
        heartbeatInfo.lastPingTime = Date.now();
      }
    } catch (error) {
      console.error('Error processing heartbeat message:', error);
    }
  });

  // 监听关闭事件清除定时器
  socket.on('close', () => {
    cleanupHeartbeat(id);
  });
  
  // 发送初始心跳
  sendPing();
}

export function removeHeartbeat(id: string) {
  const info = heartbeatMap.get(id);
  if (info) {
    if (info.intervalId) {
      clearInterval(info.intervalId);
    }
    if (info.timeoutId) {
      clearTimeout(info.timeoutId);
    }
    heartbeatMap.delete(id);
  }
}