import { Controller, Get, Post, Inject, Query, Body } from '@midwayjs/core';
import { Context } from '@midwayjs/koa';

@Controller('/')
export class HomeController {
  @Inject()
  ctx: Context;

  // 随机提示文案库（50+ 条）
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
    '🎪  circus 开场！你的需求是今天的明星～',
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
    '🌍 地球online！需求已上线～',
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

    textarea {
      width: 100%;
      min-height: 150px;
      padding: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.9);
      font-size: 1rem;
      font-family: inherit;
      resize: vertical;
      transition: all 0.3s ease;
    }

    textarea:focus {
      outline: none;
      border-color: rgba(255, 255, 255, 0.8);
      box-shadow: 0 0 20px rgba(255, 255, 255, 0.2);
    }

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

    .format-hint {
      font-size: 0.85rem;
      color: rgba(255, 255, 255, 0.7);
      margin-top: 8px;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🦾 Hello Claw</h1>
    <p class="subtitle">提交你的需求，让我们一起创造奇迹</p>
    
    <div class="form-group">
      <label for="requirement">✨ 需求内容</label>
      <textarea 
        id="requirement" 
        placeholder="请输入需求，格式：作者：虾滑。需求内容：xxxx"
        rows="6"
      ></textarea>
      <p class="format-hint">💡 提示：请按照"作者：xxx。需求内容：xxx"的格式填写</p>
    </div>

    <button class="btn-submit" onclick="submitRequirement()" id="submitBtn">
      🚀 提交需求
    </button>

    <div class="result" id="result">
      <span class="emoji" id="resultEmoji">🎉</span>
      <span id="resultText"></span>
    </div>
  </div>

  <script>
    async function submitRequirement() {
      const requirement = document.getElementById('requirement').value.trim();
      const submitBtn = document.getElementById('submitBtn');
      const result = document.getElementById('result');
      const resultText = document.getElementById('resultText');
      const resultEmoji = document.getElementById('resultEmoji');

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
          body: JSON.stringify({ requirement }),
        });

        const data = await response.json();

        if (data.success) {
          result.style.display = 'block';
          resultText.textContent = data.message;
          // 随机 emoji
          const emojis = ['🎉', '✨', '🚀', '💫', '🌟', '🔥', '💪', '🎯'];
          resultEmoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
          // 清空输入框
          document.getElementById('requirement').value = '';
        } else {
          alert('提交失败，请重试～');
        }
      } catch (error) {
        console.error('提交失败:', error);
        alert('网络错误，请重试～');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '🚀 提交需求';
      }
    }

    // 支持 Ctrl+Enter 提交
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
  async submit(@Body() body: { requirement: string }): Promise<{ success: boolean; message: string }> {
    const { requirement } = body;

    if (!requirement || requirement.trim().length === 0) {
      return {
        success: false,
        message: '需求内容不能为空哦～',
      };
    }

    // 随机选择一条提示文案
    const randomIndex = Math.floor(Math.random() * this.tipMessages.length);
    const message = this.tipMessages[randomIndex];

    // 这里可以添加将需求保存到数据库的逻辑
    console.log('收到新需求:', requirement);

    return {
      success: true,
      message: message,
    };
  }
}
