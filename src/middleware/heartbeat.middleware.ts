import { Middleware, IMiddleware } from '@midwayjs/core';
import { NextFunction, Context } from '@midwayjs/koa';
// import { Context } from '@midwayjs/ws';

@Middleware()
export class HeartbeatMiddleware implements IMiddleware<Context, NextFunction> {
  resolve() {
    return async (ctx: any, next: NextFunction) => {
      console.log('ctx');
      const socket = ctx.socket;

      // 设置心跳超时时间
      const HEARTBEAT_TIMEOUT = 10 * 1000; // 10秒超时
      const HEARTBEAT_INTERVAL = 3 * 1000; // 30秒发送一次心跳

      let timeout: NodeJS.Timeout;

      // 发送心跳包
      const sendPing = () => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.emit('ping', {});
        }
      };

      // 清除定时器
      const clearTimers = () => {
        if (timeout) {
          clearTimeout(timeout);
        }
      };

      // 初始化心跳机制
      const setupHeartbeat = () => {
        clearTimers();
        timeout = setTimeout(() => {
          console.log('Heartbeat timeout for client:', socket.id);
          socket.close(); // 关闭连接
        }, HEARTBEAT_TIMEOUT);

        // 定期发送心跳包
        const interval = setInterval(sendPing, HEARTBEAT_INTERVAL);

        // 监听连接关闭事件
        socket.once('close', () => {
          clearInterval(interval);
        });
      };

      // 处理客户端的心跳响应
      socket.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === 'pong') {
            setupHeartbeat(); // 重置心跳机制
          }
        } catch (error) {
          console.error('Error processing heartbeat message:', error);
        }
      });

      // 初始化心跳
      setupHeartbeat();

      const result = await next(); // 执行下一个中间件
      return result;
    };
  }
}
