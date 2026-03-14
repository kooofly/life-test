#!/usr/bin/env node

/**
 * AI 审查服务 - 独立 ESM 模块
 * 用于在 CommonJS 项目中运行 node-llama-cpp
 */

import { getLlama, LlamaChatSession } from 'node-llama-cpp';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import path from 'path';

const MODEL_PATH = path.join(process.cwd(), 'models', 'qwen2.5-0.5b.gguf');

/**
 * 验证模型文件
 */
async function validateModel() {
  try {
    const stats = await stat(MODEL_PATH);
    const sizeMB = Math.round(stats.size / 1024 / 1024);

    if (sizeMB < 100) {
      return { valid: false, error: `模型文件过小：${sizeMB}MB` };
    }

    return { valid: true, size: sizeMB };
  } catch (err) {
    return { valid: false, error: `模型文件不存在：${err.message}` };
  }
}

/**
 * 初始化模型
 */
async function initModel() {
  console.error('[AIReview] 开始加载模型...');

  const validation = await validateModel();
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  console.error(`[AIReview] 模型文件大小：${validation.size}MB`);

  const llama = await getLlama({ gpu: false });
  const model = await llama.loadModel({ modelPath: MODEL_PATH });
  const context = await model.createContext();

  console.error('[AIReview] 模型加载成功');
  return context;
}

/**
 * 执行 AI 审查
 */
async function review(content, author) {
  const systemPrompt = `你是一个需求审查助手。请分析用户提交的需求内容，判断其质量、难度和是否有效。

请按照以下标准判断：
1. 无效需求：内容过于简短（少于 5 字）、包含测试关键词、明显乱填的内容
2. 高质量需求：描述详细、包含功能说明、有明确的步骤或预期
3. 高难度需求：涉及复杂算法、架构设计、性能优化、系统集成等

请以 JSON 格式回复，包含以下字段：
- is_invalid: 0 或 1（是否无效）
- quality_level: "low"、"medium" 或 "high"
- difficulty_level: "low"、"medium" 或 "high"
- review_reason: 简短的审查理由（20 字以内）

直接返回 JSON，不要其他说明。`;

  const userPrompt = `作者：${author}
需求内容：${content}

请审查这个需求：`;

  const context = await initModel();

  try {
    const sequence = context.getSequence();
    const session = new LlamaChatSession({
      contextSequence: sequence,
      systemPrompt
    });

    const response = await session.prompt(userPrompt, {
      maxTokens: 200,
      temperature: 0.1
    });

    session.dispose();

    // 提取 JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI 返回格式不正确，未找到 JSON');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // 规范化结果
    const result = {
      is_invalid: parsed.is_invalid === 1 || parsed.is_invalid === true ? 1 : 0,
      quality_level: normalizeLevel(parsed.quality_level),
      difficulty_level: normalizeLevel(parsed.difficulty_level),
      review_reason: String(parsed.review_reason || '').substring(0, 100),
      reviewer: 'ai'
    };

    console.error('[AIReview] 审查完成');
    return result;
  } finally {
    // 清理内存
    if (global.gc) {
      global.gc();
    }
  }
}

/**
 * 规范化等级值
 */
function normalizeLevel(level) {
  if (typeof level !== 'string') return 'medium';
  const normalized = level.toLowerCase().trim();
  if (['low', 'medium', 'high'].includes(normalized)) {
    return normalized;
  }
  return 'medium';
}

/**
 * 主函数 - 处理命令行输入
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('用法：node ai-review.mjs <author> <content>');
    process.exit(1);
  }

  const author = args[0];
  const content = args.slice(1).join(' ');

  try {
    const result = await review(author, content);
    console.log(JSON.stringify(result));
    process.exit(0);
  } catch (error) {
    console.error('[AIReview] 错误:', error.message);
    console.log(JSON.stringify({ error: error.message }));
    process.exit(1);
  }
}

// 直接运行时执行
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

// 导出给其他模块使用
export { review, initModel, validateModel };
