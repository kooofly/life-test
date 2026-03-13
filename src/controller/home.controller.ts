import { Controller, Get, Post, Inject, Body } from '@midwayjs/core';
import { Context } from '@midwayjs/koa';
import * as path from 'path';
import * as fs from 'fs';
import initSqlJs, { Database } from 'sql.js';

// 单例数据库管理
class DbManager {
  private static instance: DbManager;
  private db: Database | null = null;
  private initPromise: Promise<Database> | null = null;

  private constructor() {}

  static getInstance(): DbManager {
    if (!DbManager.instance) {
      DbManager.instance = new DbManager();
    }
    return DbManager.instance;
  }

  async getDb(): Promise<Database> {
    if (this.db) {
      return this.db;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.init();
    return this.initPromise;
  }

  private async init(): Promise<Database> {
    const SQL = await initSqlJs();
    const dbPath = path.join(process.cwd(), 'data', 'requirements.db');
    const dataDir = path.dirname(dbPath);

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // 尝试加载现有数据库
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      this.db = new SQL.Database(fileBuffer);
    } else {
      this.db = new SQL.Database();
    }

    // 创建表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS requirements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_address TEXT NOT NULL,
        user_agent TEXT,
        content TEXT NOT NULL,
        author TEXT,
        requirement_content TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    return this.db;
  }

  async saveDb(): Promise<void> {
    if (!this.db) return;

    const dbPath = path.join(process.cwd(), 'data', 'requirements.db');
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

@Controller('/')
export class HomeController {
  @Inject()
  ctx: Context;

  private dbManager = DbManager.getInstance();

  // 获取客户端 IP
  private getClientIP(ctx: Context): string {
    const forwarded = ctx.get('X-Forwarded-For');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return ctx.ip || '127.0.0.1';
  }

  // 随机提示文案库（100+ 条）
  private readonly tipMessages = [
    '🎉 收到！你的需求已经成功投递到宇宙中心！',
    '✨ 太棒了！需求已签收，马上开始魔法处理～',
    '🚀 需求已接收，正在加速奔向实现的路上！',
    '💫 好嘞！你的想法已经被我牢牢记住啦～',
    '🌟 收到收到！需求已进入待办清单 TOP1！',
    '🔥 燃起来了！这个需求我记在小本本上了～',
    '💪 没问题！需求已锁定，马上安排！',
    '🎯 目标确认！需求已成功入库～',
    '🌈 美妙的需求！已经放进我的大脑缓存区啦～',
    '⚡ 闪电接收！需求已送达开发星球～',
    '🍀 幸运收到！你的需求已被优先标记～',
    '🎊 庆祝一下！需求已成功提交～',
    '📬 叮！需求邮件已签收～',
    '🛎️ 门铃响！你的需求快递已送达～',
    '📝 笔已准备好！需求已记录在案～',
    '🗂️ 归档成功！需求已分类存放～',
    '🎪 circus 开场！你的需求是今天的明星～',
    '🌻 向阳而生！需求已种进梦想花园～',
    '🎵 奏响乐章！需求已加入交响曲～',
    '🏆 冠军需求！已放入 VIP 通道～',
    '🌙 月光宝盒已打开！需求已珍藏～',
    '☀️ 阳光明媚！需求已迎接曙光～',
    '🌊 乘风破浪！需求已启航～',
    '🏔️ 攀登高峰！需求已踏上征程～',
    '🎨 调色板就绪！需求等待上色～',
    '🧩 拼图找到位置！需求已归位～',
    '🔮 水晶球显示！需求前景光明～',
    '🎭 舞台已搭好！需求即将登场～',
    '🏮 点亮灯笼！需求已照亮前路～',
    '🎪 帐篷支起！需求马戏团开演～',
    '🌺 花朵绽放！需求已生根发芽～',
    '🦋 破茧成蝶！需求正在蜕变～',
    '🐝 勤劳蜜蜂！需求正在采蜜中～',
    '🐿️ 松鼠囤粮！需求已存入仓库～',
    '🦉 智慧猫头鹰！需求已被深思熟虑～',
    '🦄 独角兽认证！需求充满魔力～',
    '🐲 龙腾虎跃！需求气势如虹～',
    '🐯 虎虎生威！需求充满力量～',
    '🐰 兔飞猛进！需求快速推进中～',
    '🐼 熊猫卖萌！需求被温柔对待～',
    '🐨 考拉抱抱！需求被紧紧抱住～',
    '🦁 狮子吼！需求震撼全场～',
    '🐸 青蛙跳跳！需求活力满满～',
    '🐙 章鱼哥！需求多手处理中～',
    '🦈 鲨鱼出击！需求势不可挡～',
    '🐬 海豚跃！需求优雅呈现～',
    '🐳 鲸鱼游！需求深度处理～',
    '🦅 雄鹰展翅！需求高瞻远瞩～',
    '🦚 孔雀开屏！需求华丽亮相～',
    '🦜 鹦鹉学舌！需求已反复确认～',
    '🌟 需求已收到，程序员正在赶来的路上！',
    '💻 代码在召唤！需求已就位～',
    '🔧 工具已备好！需求开始加工～',
    '⚙️ 齿轮转动！需求处理中～',
    '🎛️ 控制面板就绪！需求参数已设置～',
    '📊 数据流正常！需求已录入系统～',
    '🔔 系统通知！需求队列 +1～',
    '📱 移动端同步！需求已跨平台～',
    '🌐 云端存储！需求已备份～',
    '🔐 安全加密！需求已保护～',
    '🎁 惊喜包装！需求已打包～',
    '🎀 丝带系好！需求准备交付～',
    '🏷️ 标签贴好！需求已分类～',
    '📦 快递单打印！需求发货中～',
    '🚚 货车出发！需求配送中～',
    '✈️ 飞机起飞！需求空运中～',
    '🚢 轮船航行！需求海运中～',
    '🚀 火箭发射！需求冲向太空～',
    '🛸 UFO 降临！需求来自外星～',
    '🌌 银河系漫游！需求探索宇宙～',
    '⭐ 摘星成功！需求实现梦想～',
    '🌠 流星划过！需求许下愿望～',
    '🌍 地球 online！需求已上线～',
    '🌋 火山喷发！需求热情高涨～',
    '🏖️ 沙滩漫步！需求轻松愉快～',
    '🏕️ 露营开始！需求野外生存～',
    '🎣 钓鱼中！需求耐心等待～',
    '🚴 骑行出发！需求绿色出行～',
    '🏃 奔跑吧！需求全速前进～',
    '🧘 冥想中！需求静心思考～',
    '🎸 摇滚起来！需求充满活力～',
    '🎹 钢琴曲！需求优雅动人～',
    '🎺 小号吹响！需求宣告天下～',
    '🥁 鼓点敲响！需求节奏感强～',
    '🎻 小提琴！需求悠扬动听～',
    '🎤 麦克风！需求大声说出来～',
    '🎧 戴上耳机！需求沉浸式体验～',
    '📺 电视直播！需求实时播报～',
    '📷 相机准备！需求记录瞬间～',
    '🎬 电影开拍！需求主角登场～',
    '🍿 爆米花备好！需求精彩上演～',
    '🎟️ 门票到手！需求入场券～',
    '🏅 奖牌颁发！需求获得认可～',
    '🏆 奖杯举起！需求获得胜利～',
    '🎖️ 勋章佩戴！需求值得纪念～',
    '📜 证书打印！需求官方认证～',
    '📋 清单勾选！需求已完成～',
    '✅ 确认无误！需求验证通过～',
    '🎊 恭喜恭喜！需求大功告成～',
    '🎈 气球升空！需求飞上天空～',
    '🌈 彩虹出现！需求带来希望～',
    '✨ 星光闪烁！需求闪耀夜空～',
    '🔔 铃声响起！需求已通知团队～',
    '📢 广播播放！需求广而告之～',
    '🎺 号角吹响！需求集结完毕～',
    '🚩 旗帜飘扬！需求目标明确～',
    '🗺️ 地图标记！需求路线规划～',
    '🧭 指南针指向！需求方向正确～',
    '⏰ 闹钟设定！需求时间提醒～',
    '📅 日历标注！需求日期确认～',
  ];

  @Get('/')
  async home(): Promise<string> {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>需求提交 - Hello Claw</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      padding: 20px;
    }

    .container {
      width: 100%;
      max-width: 600px;
      padding: 50px 40px;
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(20px);
      border-radius: 24px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      animation: float 6s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }

    h1 {
      font-size: 2.5rem;
      font-weight: 800;
      background: linear-gradient(45deg, #fff, #f0f0f0);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 10px;
      text-align: center;
    }

    .subtitle {
      text-align: center;
      color: rgba(255, 255, 255, 0.8);
      margin-bottom: 30px;
      font-size: 1rem;
    }

    .form-group {
      margin-bottom: 25px;
    }

    label {
      display: block;
      color: rgba(255, 255, 255, 0.9);
      font-weight: 600;
      margin-bottom: 10px;
      font-size: 0.95rem;
    }

    input[type="text"],
    textarea {
      width: 100%;
      padding: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.9);
      font-size: 1rem;
      font-family: inherit;
      transition: all 0.3s ease;
    }

    input[type="text"]:focus,
    textarea:focus {
      outline: none;
      border-color: rgba(255, 255, 255, 0.8);
      box-shadow: 0 0 20px rgba(255, 255, 255, 0.2);
    }

    textarea {
      min-height: 120px;
      resize: vertical;
    }

    input[type="text"]::placeholder,
    textarea::placeholder {
      color: #999;
    }

    .btn-submit {
      width: 100%;
      padding: 16px 32px;
      background: linear-gradient(45deg, #fff, #f0f0f0);
      border: none;
      border-radius: 12px;
      font-size: 1.1rem;
      font-weight: 700;
      color: #667eea;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    }

    .btn-submit:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
    }

    .btn-submit:active {
      transform: translateY(0);
    }

    .btn-submit:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .result {
      margin-top: 25px;
      padding: 20px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      text-align: center;
      color: #fff;
      font-size: 1.1rem;
      font-weight: 500;
      display: none;
      animation: fadeIn 0.5s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .emoji {
      font-size: 3rem;
      margin-bottom: 15px;
      display: block;
      animation: bounce 2s ease-in-out infinite;
    }

    @keyframes bounce {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.2); }
    }

    .nav-link {
      text-align: center;
      margin-top: 20px;
    }

    .nav-link a {
      color: rgba(255, 255, 255, 0.8);
      text-decoration: none;
      font-size: 0.9rem;
      transition: color 0.3s;
    }

    .nav-link a:hover {
      color: #fff;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🦾 Hello Claw</h1>
    <p class="subtitle">提交你的需求，让我们一起创造奇迹</p>
    
    <div class="form-group">
      <label for="author">✍️ 作者</label>
      <input 
        type="text" 
        id="author" 
        placeholder="请输入你的昵称"
      />
    </div>

    <div class="form-group">
      <label for="requirement">✨ 需求内容</label>
      <textarea 
        id="requirement" 
        placeholder="请详细描述你的需求..."
        rows="5"
      ></textarea>
    </div>

    <button class="btn-submit" onclick="submitRequirement()" id="submitBtn">
      🚀 提交需求
    </button>

    <div class="result" id="result">
      <span class="emoji" id="resultEmoji">🎉</span>
      <span id="resultText"></span>
    </div>

    <div class="nav-link">
      <a href="/clawiii">📊 查看已提交的需求</a>
    </div>
  </div>

  <script>
    async function submitRequirement() {
      const author = document.getElementById('author').value.trim();
      const requirement = document.getElementById('requirement').value.trim();
      const submitBtn = document.getElementById('submitBtn');
      const result = document.getElementById('result');
      const resultText = document.getElementById('resultText');
      const resultEmoji = document.getElementById('resultEmoji');

      if (!author) {
        alert('请输入作者昵称哦～');
        return;
      }

      if (!requirement) {
        alert('请输入需求内容哦～');
        return;
      }

      // 禁用按钮
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ 提交中...';

      try {
        const response = await fetch('/api/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ author, requirement }),
        });

        const data = await response.json();

        if (data.success) {
          result.style.display = 'block';
          resultText.textContent = data.message;
          const emojis = ['🎉', '✨', '🚀', '💫', '🌟', '🔥', '💪', '🎯'];
          resultEmoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
          document.getElementById('author').value = '';
          document.getElementById('requirement').value = '';
        } else if (data.duplicate) {
          result.style.display = 'block';
          resultText.textContent = '🚫 每个用户只能提交一次需求哦，感谢您的参与～';
          resultEmoji.textContent = '⏰';
        } else {
          alert(data.message || '提交失败，请重试～');
        }
      } catch (error) {
        console.error('提交失败:', error);
        alert('网络错误，请重试～');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '🚀 提交需求';
      }
    }

    document.getElementById('requirement').addEventListener('keydown', function(e) {
      if (e.ctrlKey && e.key === 'Enter') {
        submitRequirement();
      }
    });
  </script>
</body>
</html>
    `.trim();
  }

  @Post('/api/submit')
  async submit(@Body() body: { author: string; requirement: string }): Promise<{ success: boolean; message: string; duplicate?: boolean }> {
    const { author, requirement } = body;

    if (!author || author.trim().length === 0) {
      return {
        success: false,
        message: '作者昵称不能为空哦～',
      };
    }

    if (!requirement || requirement.trim().length === 0) {
      return {
        success: false,
        message: '需求内容不能为空哦～',
      };
    }

    const db = await this.dbManager.getDb();
    const ipAddress = this.getClientIP(this.ctx);
    const userAgent = this.ctx.get('User-Agent');

    // 检查该 IP 是否已经提交过（永久去重）
    const stmt = db.prepare('SELECT id FROM requirements WHERE ip_address = ? LIMIT 1');
    stmt.bind([ipAddress]);
    const hasRecord = stmt.step();
    stmt.free();

    if (hasRecord) {
      return {
        success: false,
        duplicate: true,
        message: '检测到重复提交',
      };
    }

    // 保存到数据库
    db.run(
      'INSERT INTO requirements (ip_address, user_agent, content, author, requirement_content) VALUES (?, ?, ?, ?, ?)',
      [ipAddress, userAgent, `${author}：${requirement}`, author, requirement]
    );

    // 保存数据库到文件
    await this.dbManager.saveDb();

    // 随机选择一条提示文案
    const randomIndex = Math.floor(Math.random() * this.tipMessages.length);
    const message = this.tipMessages[randomIndex];

    return {
      success: true,
      message: message,
    };
  }

  @Get('/clawiii')
  async clawiii(): Promise<string> {
    const db = await this.dbManager.getDb();
    
    // 获取所有需求数据
    const stmt = db.prepare('SELECT id, author, requirement_content, content, ip_address, created_at FROM requirements ORDER BY created_at DESC');
    
    const records: any[] = [];
    while (stmt.step()) {
      records.push(stmt.getAsObject());
    }
    stmt.free();

    const rowsHtml = records.map((record, index) => `
      <tr onclick="showDetail(${record.id})" style="cursor: pointer;">
        <td>${index + 1}</td>
        <td>${this.escapeHtml(record.author || '匿名')}</td>
        <td>${this.escapeHtml((record.requirement_content || '').substring(0, 50))}${(record.requirement_content || '').length > 50 ? '...' : ''}</td>
        <td>${this.escapeHtml(record.ip_address)}</td>
        <td>${record.created_at}</td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>需求列表 - ClawIII</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      min-height: 100vh;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      padding: 40px 20px;
      color: #fff;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    h1 {
      font-size: 2.5rem;
      font-weight: 800;
      background: linear-gradient(45deg, #00d9ff, #00ff88);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 10px;
      text-align: center;
    }

    .subtitle {
      text-align: center;
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: 40px;
      font-size: 1rem;
    }

    .stats {
      display: flex;
      justify-content: center;
      gap: 30px;
      margin-bottom: 30px;
    }

    .stat-card {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      padding: 20px 30px;
      border-radius: 16px;
      text-align: center;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .stat-number {
      font-size: 2.5rem;
      font-weight: 700;
      background: linear-gradient(45deg, #00d9ff, #00ff88);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .stat-label {
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.9rem;
      margin-top: 5px;
    }

    .table-container {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    thead {
      background: rgba(0, 217, 255, 0.2);
    }

    th {
      padding: 16px;
      text-align: left;
      font-weight: 600;
      color: #00d9ff;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    td {
      padding: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.9);
    }

    tbody tr {
      transition: all 0.3s ease;
    }

    tbody tr:hover {
      background: rgba(0, 217, 255, 0.1);
    }

    tbody tr:last-child td {
      border-bottom: none;
    }

    .nav-link {
      text-align: center;
      margin-top: 30px;
    }

    .nav-link a {
      color: rgba(255, 255, 255, 0.8);
      text-decoration: none;
      font-size: 0.9rem;
      transition: color 0.3s;
      padding: 10px 20px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
    }

    .nav-link a:hover {
      color: #00d9ff;
      background: rgba(0, 217, 255, 0.2);
    }

    /* Modal Styles */
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(5px);
      z-index: 1000;
      justify-content: center;
      align-items: center;
      animation: fadeIn 0.3s ease;
    }

    .modal.show {
      display: flex;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-content {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      padding: 40px;
      border-radius: 20px;
      max-width: 600px;
      width: 90%;
      border: 1px solid rgba(0, 217, 255, 0.3);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      animation: slideUp 0.3s ease;
      position: relative;
    }

    @keyframes slideUp {
      from { transform: translateY(50px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .modal-close {
      position: absolute;
      top: 20px;
      right: 20px;
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.7);
      font-size: 1.5rem;
      cursor: pointer;
      transition: color 0.3s;
    }

    .modal-close:hover {
      color: #fff;
    }

    .modal-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #00d9ff;
      margin-bottom: 20px;
    }

    .modal-field {
      margin-bottom: 20px;
    }

    .modal-label {
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.85rem;
      margin-bottom: 8px;
      text-transform: uppercase;
    }

    .modal-value {
      color: #fff;
      font-size: 1rem;
      line-height: 1.6;
      background: rgba(255, 255, 255, 0.05);
      padding: 15px;
      border-radius: 8px;
      border-left: 3px solid #00d9ff;
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: rgba(255, 255, 255, 0.6);
    }

    .empty-state .emoji {
      font-size: 4rem;
      margin-bottom: 20px;
      display: block;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 ClawIII 需求管理</h1>
    <p class="subtitle">查看所有已提交的需求</p>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-number">${records.length}</div>
        <div class="stat-label">总需求数</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${new Set(records.map(r => r.ip_address)).size}</div>
        <div class="stat-label">提交用户</div>
      </div>
    </div>

    <div class="table-container">
      ${records.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>作者</th>
            <th>需求内容</th>
            <th>IP 地址</th>
            <th>提交时间</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
      ` : `
      <div class="empty-state">
        <span class="emoji">📭</span>
        <p>暂无需求数据</p>
      </div>
      `}
    </div>

    <div class="nav-link">
      <a href="/">← 返回首页提交需求</a>
    </div>
  </div>

  <!-- Detail Modal -->
  <div class="modal" id="detailModal" onclick="closeModal(event)">
    <div class="modal-content">
      <button class="modal-close" onclick="closeModalBtn()">&times;</button>
      <h2 class="modal-title">📋 需求详情</h2>
      <div id="modalBody"></div>
    </div>
  </div>

  <script>
    const records = ${JSON.stringify(records)};

    function showDetail(id) {
      const record = records.find(r => r.id === id);
      if (!record) return;

      const modalBody = document.getElementById('modalBody');
      modalBody.innerHTML = \`
        <div class="modal-field">
          <div class="modal-label">作者</div>
          <div class="modal-value">\${escapeHtml(record.author || '匿名')}</div>
        </div>
        <div class="modal-field">
          <div class="modal-label">完整需求内容</div>
          <div class="modal-value">\${escapeHtml(record.content || '')}</div>
        </div>
        <div class="modal-field">
          <div class="modal-label">需求描述</div>
          <div class="modal-value">\${escapeHtml(record.requirement_content || '')}</div>
        </div>
        <div class="modal-field">
          <div class="modal-label">IP 地址</div>
          <div class="modal-value">\${escapeHtml(record.ip_address || '')}</div>
        </div>
        <div class="modal-field">
          <div class="modal-label">提交时间</div>
          <div class="modal-value">\${record.created_at}</div>
        </div>
      \`;

      document.getElementById('detailModal').classList.add('show');
    }

    function closeModal(event) {
      if (event.target === document.getElementById('detailModal')) {
        document.getElementById('detailModal').classList.remove('show');
      }
    }

    function closeModalBtn() {
      document.getElementById('detailModal').classList.remove('show');
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // 键盘 ESC 关闭
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        document.getElementById('detailModal').classList.remove('show');
      }
    });
  </script>
</body>
</html>
    `.trim();
  }

  private escapeHtml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
