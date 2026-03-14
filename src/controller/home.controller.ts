import { Controller, Get, Post, Inject, Body } from '@midwayjs/core';
import { Context } from '@midwayjs/koa';
import * as path from 'path';
import * as fs from 'fs';
import initSqlJs, { Database } from 'sql.js';
import { ReviewService, ReviewResult } from '../service/review.service';

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
        quality_level TEXT,
        difficulty_level TEXT,
        is_invalid INTEGER DEFAULT 0,
        review_reason TEXT,
        reviewed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 检查是否需要添加新列（旧数据库升级）
    try {
      this.db.run('ALTER TABLE requirements ADD COLUMN quality_level TEXT');
    } catch (e) { /* 列已存在 */ }
    try {
      this.db.run('ALTER TABLE requirements ADD COLUMN difficulty_level TEXT');
    } catch (e) { /* 列已存在 */ }
    try {
      this.db.run('ALTER TABLE requirements ADD COLUMN is_invalid INTEGER DEFAULT 0');
    } catch (e) { /* 列已存在 */ }
    try {
      this.db.run('ALTER TABLE requirements ADD COLUMN review_reason TEXT');
    } catch (e) { /* 列已存在 */ }
    try {
      this.db.run('ALTER TABLE requirements ADD COLUMN reviewed_at DATETIME');
    } catch (e) { /* 列已存在 */ }
    try {
      this.db.run('ALTER TABLE requirements ADD COLUMN reviewing_status INTEGER DEFAULT 0');
    } catch (e) { /* 列已存在 */ }
    try {
      this.db.run('ALTER TABLE requirements ADD COLUMN reviewer TEXT');
    } catch (e) { /* 列已存在 */ }

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

  @Inject()
  reviewService: ReviewService;

  private dbManager = DbManager.getInstance();

  // 审查队列（异步处理）
  private reviewQueue: Array<{
    id: number;
    content: string;
    author: string;
  }> = [];

  private isProcessingQueue = false;

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
    const htmlPath = path.join(process.cwd(), 'src', 'views', 'home.html');
    return fs.readFileSync(htmlPath, 'utf-8');
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
    // const hasRecord = stmt.step();
    stmt.free();

    // if (hasRecord) {
    //   return {
    //     success: false,
    //     duplicate: true,
    //     message: '检测到重复提交',
    //   };
    // }

    // 保存到数据库
    db.run(
      'INSERT INTO requirements (ip_address, user_agent, content, author, requirement_content) VALUES (?, ?, ?, ?, ?)',
      [ipAddress, userAgent, `${author}：${requirement}`, author, requirement]
    );

    // 获取刚插入的 ID
    const idResult = db.exec('SELECT last_insert_rowid() as id');
    const insertId = idResult[0]?.values[0]?.[0] as number;

    // 保存数据库到文件
    await this.dbManager.saveDb();

    // 异步触发 AI 审查（不阻塞响应）
    if (insertId) {
      this.addToReviewQueue(insertId, requirement, author);
    }

    // 随机选择一条提示文案
    const randomIndex = Math.floor(Math.random() * this.tipMessages.length);
    const message = this.tipMessages[randomIndex];

    return {
      success: true,
      message: message,
    };
  }

  /**
   * 将审查请求加入队列
   * 异步后台处理，不阻塞主流程
   */
  private async addToReviewQueue(id: number, content: string, author: string) {
    this.reviewQueue.push({ id, content, author });

    // 先设置审查中状态（确保写入后再开始审查）
    await this.setReviewingStatus(id, 1);

    // 启动队列处理（如果还未在处理）
    if (!this.isProcessingQueue) {
      this.processReviewQueue();
    }
  }

  /**
   * 设置审查中状态
   */
  private async setReviewingStatus(id: number, status: number) {
    try {
      const db = await this.dbManager.getDb();
      db.run(
        'UPDATE requirements SET reviewing_status = ? WHERE id = ?',
        [status, id]
      );
      await this.dbManager.saveDb();
    } catch (error) {
      console.error(`[Review] 设置审查状态失败:`, error.message);
    }
  }

  /**
   * 处理审查队列
   * 逐个处理，避免内存积累
   */
  private async processReviewQueue() {
    if (this.reviewQueue.length === 0) {
      this.isProcessingQueue = false;
      return;
    }

    this.isProcessingQueue = true;

    while (this.reviewQueue.length > 0) {
      const item = this.reviewQueue.shift();
      if (!item) continue;

      // 模拟审查延迟（让"审查中"状态可见，实际生产环境可移除）
      await new Promise(resolve => setTimeout(resolve, 300));

      try {
        // 使用超时保护，5 秒超时
        const reviewPromise = this.reviewService.review(item.content, item.author);
        const timeoutPromise = new Promise<ReviewResult>((_, reject) => {
          setTimeout(() => reject(new Error('审查超时')), 5000);
        });

        const result = await Promise.race([reviewPromise, timeoutPromise]);

        // 确定审查者名称
        const reviewerName = result.reviewer === 'ai' ? '小虾' : '小霞';

        // 更新数据库
        const db = await this.dbManager.getDb();
        db.run(
          'UPDATE requirements SET quality_level = ?, difficulty_level = ?, is_invalid = ?, review_reason = ?, reviewed_at = CURRENT_TIMESTAMP, reviewing_status = 0, reviewer = ? WHERE id = ?',
          [result.quality_level, result.difficulty_level, result.is_invalid, result.review_reason, reviewerName, item.id]
        );
        await this.dbManager.saveDb();

        console.log(`[Review] 需求 #${item.id} 审查完成：${result.quality_level}, ${result.difficulty_level}, invalid=${result.is_invalid}, reviewer=${reviewerName}`);
      } catch (error) {
        console.error(`[Review] 需求 #${item.id} 审查失败:`, error.message);
        // 审查失败也清除审查中状态
        await this.setReviewingStatus(item.id, 0);
      }

      // 手动触发 GC（如果可用），避免内存积累
      if (global.gc) {
        global.gc();
      }
    }

    this.isProcessingQueue = false;
  }

  @Get('/clawiii')
  async clawiii(): Promise<string> {
    const db = await this.dbManager.getDb();

    // 获取所有需求数据（包括审查结果和审查状态）
    const stmt = db.prepare('SELECT id, author, requirement_content, content, ip_address, quality_level, difficulty_level, is_invalid, review_reason, reviewed_at, created_at, reviewing_status, reviewer FROM requirements ORDER BY created_at DESC');

    const records: any[] = [];
    while (stmt.step()) {
      records.push(stmt.getAsObject());
    }
    stmt.free();

    // 读取外部 HTML 模板文件
    const htmlPath = path.join(process.cwd(), 'src', 'views', 'clawiii.html');
    let html = fs.readFileSync(htmlPath, 'utf-8');

    // 替换模板变量
    html = html.replace('__RECORDS__', JSON.stringify(records));

    return html;
  }

}
