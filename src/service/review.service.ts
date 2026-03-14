import { Provide, Init } from '@midwayjs/core';
import * as path from 'path';
import { spawn } from 'child_process';
import * as fs from 'fs';

export interface ReviewResult {
  quality_level: string;
  difficulty_level: string;
  is_invalid: number;
  review_reason: string;
  reviewer: string;  // 审查者：'ai' 或 'local'
}

@Provide()
export class ReviewService {
  private modelPath: string;
  private initialized: boolean = false;
  private initializing: Promise<void> | null = null;
  private modelAvailable: boolean = false;  // 模型文件是否可用

  // 本地规则作为降级方案
  private localRules = {
    invalidKeywords: ['测试', 'test', 'xxx', 'asdf', '111', '???', '呵呵', '哈哈'],
    qualityIndicators: ['详细', '说明', '步骤', '预期', '功能', '模块', '接口', 'API', '增加', '优化', '修复', '实现', '设计'],
    difficultyIndicators: ['算法', '架构', '重构', '迁移', '分布式', '高并发', '实时', 'AI', '模型', '复杂', '性能', '安全']
  };

  @Init()
  async init() {
    if (this.initialized || this.initializing) {
      return;
    }

    this.modelPath = path.join(process.cwd(), 'models', 'qwen2.5-0.5b.gguf');
    this.initializing = this.lazyInit();
    await this.initializing;
  }

  /**
   * 懒加载模型 - 首次调用时才初始化
   * 使用子进程调用 ESM 脚本，避免 CommonJS/ESM 兼容性问题
   */
  private async lazyInit() {
    try {
      // 检查模型文件是否存在
      if (!fs.existsSync(this.modelPath)) {
        console.warn(`[ReviewService] 模型文件不存在：${this.modelPath}，将使用本地规则`);
        this.initialized = true;
        return;
      }

      // 检查文件大小
      const stats = fs.statSync(this.modelPath);
      const sizeMB = Math.round(stats.size / 1024 / 1024);

      if (sizeMB < 100) {
        console.warn(`[ReviewService] 模型文件过小：${sizeMB}MB，将使用本地规则`);
        this.initialized = true;
        return;
      }

      console.log(`[ReviewService] 模型文件已就绪：${sizeMB}MB`);
      this.modelAvailable = true;
      this.initialized = true;
    } catch (error) {
      console.error('[ReviewService] 模型初始化失败:', error.message);
      this.initialized = true;
    }
  }

  /**
   * 使用子进程调用 AI 审查服务
   */
  private async aiReviewViaSubprocess(content: string, author: string): Promise<ReviewResult> {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(process.cwd(), 'scripts', 'ai-review.mjs');

      // 检查脚本是否存在
      if (!fs.existsSync(scriptPath)) {
        reject(new Error('AI 审查脚本不存在'));
        return;
      }

      // 转义参数
      const args = [scriptPath, author, content];

      const child = spawn('node', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_OPTIONS: '--expose-gc' }
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout.trim());
            if (result.error) {
              reject(new Error(result.error));
            } else {
              resolve(result);
            }
          } catch (e) {
            reject(new Error(`解析 AI 响应失败：${e.message}`));
          }
        } else {
          reject(new Error(`AI 审查进程退出码：${code}, ${stderr}`));
        }
      });

      child.on('error', (err) => {
        reject(err);
      });

      // 超时保护
      setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error('AI 审查超时'));
      }, 10000);
    });
  }

  /**
   * 审查需求内容
   * 使用异步队列处理，避免阻塞主线程
   */
  async review(content: string, author: string): Promise<ReviewResult> {
    // 确保模型已初始化
    if (!this.initialized && !this.initializing) {
      await this.init();
    } else if (this.initializing && !this.initialized) {
      await this.initializing;
    }

    // 如果模型可用，使用 AI 审查
    if (this.modelAvailable) {
      try {
        const result = await this.aiReviewViaSubprocess(content, author);
        result.reviewer = 'ai';  // 标记为 AI 审查
        return result;
      } catch (error) {
        console.error('[ReviewService] AI 审查失败，降级到本地规则:', error);
      }
    }

    // 降级到本地规则
    return this.localReview(content, author);
  }

  /**
   * 本地规则审查 - 降级方案
   */
  private localReview(content: string, author: string): ReviewResult {
    let isInvalid = 0;
    let qualityLevel = 'medium';
    let difficultyLevel = 'medium';
    const reasons: string[] = [];

    // 检查无效需求
    for (const keyword of this.localRules.invalidKeywords) {
      if (content.toLowerCase().includes(keyword.toLowerCase()) && content.length < 20) {
        isInvalid = 1;
        reasons.push(`包含无效关键词：${keyword}`);
        break;
      }
    }

    // 内容太短
    if (content.length < 5) {
      isInvalid = 1;
      reasons.push('内容过于简短');
    }

    // 检查质量指标
    const qualityCount = this.localRules.qualityIndicators.reduce((count, indicator) => {
      return count + (content.includes(indicator) ? 1 : 0);
    }, 0);

    if (qualityCount >= 3) {
      qualityLevel = 'high';
      reasons.push('需求描述详细，包含多个功能要素');
    } else if (qualityCount >= 1) {
      qualityLevel = 'medium';
      reasons.push('需求描述基本清晰');
    } else {
      qualityLevel = 'low';
      reasons.push('需求描述较简单');
    }

    // 检查难度指标
    const difficultyCount = this.localRules.difficultyIndicators.reduce((count, indicator) => {
      return count + (content.includes(indicator) ? 1 : 0);
    }, 0);

    if (difficultyCount >= 2) {
      difficultyLevel = 'high';
      reasons.push('涉及复杂技术或架构');
    } else if (difficultyCount >= 1) {
      difficultyLevel = 'medium';
      reasons.push('有一定技术复杂度');
    } else {
      difficultyLevel = 'low';
      reasons.push('技术实现相对简单');
    }

    return {
      quality_level: qualityLevel,
      difficulty_level: difficultyLevel,
      is_invalid: isInvalid,
      review_reason: reasons.join(';'),
      reviewer: 'local'
    };
  }

  /**
   * 检查模型是否已就绪
   */
  isReady(): boolean {
    return this.initialized && this.modelAvailable;
  }

  /**
   * 获取模型状态
   */
  getStatus(): { initialized: boolean; modelAvailable: boolean; modelPath: string } {
    return {
      initialized: this.initialized,
      modelAvailable: this.modelAvailable,
      modelPath: this.modelPath
    };
  }
}
