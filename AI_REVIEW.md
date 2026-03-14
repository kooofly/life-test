# AI 需求审查功能 - 使用指南

## 功能概述

基于 `node-llama-cpp` 的本地 AI 需求审查功能，完全内置，无需外部 API。

### 特性

- **异步审查**: 提交后后台处理，不阻塞响应
- **降级方案**: 模型加载失败时自动使用本地规则
- **内存优化**: CPU 推理，懒加载，GC 管理
- **超时保护**: 5 秒超时，避免卡死

---

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 下载 AI 模型

**自动下载**（推荐）:
```bash
npm run download-model
```

**手动下载**:
1. 访问 https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF
2. 下载 `qwen2.5-0.5b-instruct-q4_k_m.gguf` (~300MB)
3. 放置到 `./models/qwen2.5-0.5b.gguf`

### 3. 启动应用

```bash
npm run dev
```

---

## 审查规则

### 无效需求
- 内容少于 5 字
- 包含测试关键词（测试，test, xxx, asdf 等）

### 高质量需求
- 包含 3+ 个质量指标词（详细、说明、步骤、预期、功能等）

### 高难度需求
- 包含 2+ 个难度指标词（算法、架构、重构、分布式等）

---

## 配置选项

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `AI_REVIEW_ENABLED` | 是否启用 AI 审查 | `true` |

### 代码配置

编辑 `src/service/review.service.ts`:

```typescript
private localRules = {
  invalidKeywords: ['测试', 'test', ...],  // 无效关键词
  qualityIndicators: ['详细', '说明', ...], // 质量指标
  difficultyIndicators: ['算法', '架构', ...] // 难度指标
};
```

---

## 架构设计

```
用户提交需求
    │
    ├──→ 保存到数据库
    │
    └──→ 加入审查队列（异步）
            │
            ▼
        审查服务
            │
            ├──→ AI 模型审查（如果可用）
            │       │
            │       ├──→ 成功 → 更新数据库
            │       │
            │       └──→ 失败/超时 → 降级
            │
            └──→ 本地规则审查（降级）
                    │
                    └──→ 更新数据库
```

---

## 内存管理

- **懒加载**: 首次调用时才加载模型
- **异步队列**: 逐个处理，避免并发内存峰值
- **GC 触发**: 每次处理后手动触发 GC
- **超时保护**: 5 秒超时释放资源

### 监控内存

```typescript
// 可选：添加内存监控
setInterval(() => {
  const used = process.memoryUsage();
  console.log(`Memory: ${Math.round(used.heapUsed / 1024 / 1024)}MB`);
}, 60000);
```

---

## 视觉标签

需求列表页面显示审查结果：

- `[无效]` - 红色标签
- `[高质量]` - 蓝色标签
- `[高难度]` - 紫色标签

---

## 故障排除

### 模型加载失败

```
[ReviewService] 模型文件不存在：./models/qwen2.5-0.5b.gguf，将使用本地规则
```

**解决方案**: 下载模型文件或检查路径。

### AI 审查超时

```
[ReviewService] AI 审查失败，降级到本地规则：审查超时
```

**解决方案**: 服务器负载高，自动降级到本地规则（正常行为）。

### 内存不足

2G 内存服务器建议：
- 使用 Q2_K 量化模型（~400MB）
- 禁用 GPU 推理
- 减少上下文窗口

---

## 性能指标

| 场景 | 响应时间 | 内存占用 |
|------|----------|----------|
| 本地规则 | <10ms | ~50MB |
| AI 审查（Qwen2.5-0.5B）| 1-3s | ~500MB |
| AI 审查（超时）| 5s | ~500MB |

---

## 文件结构

```
.
├── src/
│   ├── controller/
│   │   └── home.controller.ts      # 主页 + 审查队列
│   └── service/
│       └── review.service.ts       # AI 审查服务
├── models/
│   └── qwen2.5-0.5b.gguf          # AI 模型文件
├── scripts/
│   └── download-model.js          # 模型下载脚本
└── data/
    └── requirements.db            # 需求数据库
```

---

## 扩展建议

1. **批量审查**: 对历史需求进行批量审查
2. **审查日志**: 记录详细的审查过程
3. **人工审核**: 对 AI 结果进行人工复核
4. **模型热更新**: 支持不重启更新模型
5. **多模型支持**: 根据任务复杂度选择模型

---

## 相关链接

- [Qwen2.5-0.5B 模型](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF)
- [node-llama-cpp 文档](https://node-llama-cpp.guide/)
- [Midway.js 文档](https://midwayjs.org/)
