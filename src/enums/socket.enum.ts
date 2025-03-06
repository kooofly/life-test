export enum ESocketMessageType {
  /**
   * 用户加入
   */
  join = 'j',
  /**
   * 心跳检测ping
   */
  ping = 'pi',
  /**
   * 心跳检测pong
   */
  pong = 'p',
  /**
   * 消息
   */
  message = 'm',
}

export enum ESocketMessageKey {
  /**
   * 通信类型
   */
  type = 't',
  /**
   * 分组
   */
  group = 'g',
  /**
   * 端类型
   */
  endpoint = 'e',
  /**
   * toSocketIds
   */
  toSocketIds = 'i',
  /**
   * 消息数据主体
   */
  content = 'c',
}

export enum ESocketEndpoint {
  server = 's',
  client = 'c',
  member = 'm',
}
