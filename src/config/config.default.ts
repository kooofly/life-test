import { MidwayConfig } from '@midwayjs/core';

export default {
  // use for cookie sign key, should change to your own and keep security
  keys: '1740712992556_750',
  koa: {
    port: 7001,
  },
  // https://midwayjs.org/docs/extensions/ws
  webSocket: {
    enableServerHeartbeatCheck: true,
    serverHeartbeatInterval: 3000,
  },
} as MidwayConfig;
