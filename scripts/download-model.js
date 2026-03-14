#!/usr/bin/env node

/**
 * 模型下载脚本
 * 用于下载 Qwen2.5-0.5B-Instruct 量化模型
 *
 * 使用方法:
 *   npm run download-model
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// 模型下载地址（多个镜像源）
const MODEL_URLS = [
  // HuggingFace（主）
  'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf',
  // ModelScope（国内镜像）
  'https://modelscope.cn/models/Qwen/Qwen2.5-0.5B-Instruct-GGUF/files?Revision=master&FilePath=qwen2.5-0.5b-instruct-q4_k_m.gguf',
  // Gitee AI（备用）
  'https://ai.gitee.com/Qwen/Qwen2.5-0.5B-Instruct-GGUF/attachments/10730489',
];

const MODEL_PATH = path.join(process.cwd(), 'models', 'qwen2.5-0.5b.gguf');

async function downloadModel() {
  console.log('🚀 开始下载 AI 模型...');
  console.log(`📍 保存路径：${MODEL_PATH}`);

  // 确保目录存在
  const dir = path.dirname(MODEL_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ 创建目录：${dir}`);
  }

  // 检查是否已下载
  if (fs.existsSync(MODEL_PATH)) {
    const stats = fs.statSync(MODEL_PATH);
    const sizeMB = Math.round(stats.size / 1024 / 1024);
    if (sizeMB < 100) {
      console.log(`⚠️  模型文件异常，大小仅：${sizeMB}MB，将重新下载`);
      fs.unlinkSync(MODEL_PATH);
    } else {
      console.log(`✅ 模型文件已存在，大小：${sizeMB}MB`);
      console.log('💡 如需重新下载，请删除现有文件');
      return;
    }
  }

  // 尝试多个镜像源
  for (let i = 0; i < MODEL_URLS.length; i++) {
    const url = MODEL_URLS[i];
    console.log(`\n📡 尝试下载源 ${i + 1}/${MODEL_URLS.length}: ${url.substring(0, 50)}...`);

    try {
      const success = await downloadFromUrl(url);
      if (success) {
        console.log('\n✅ 下载完成！');
        const stats = fs.statSync(MODEL_PATH);
        console.log(`📦 文件大小：${Math.round(stats.size / 1024 / 1024)}MB`);
        console.log('💡 提示：重启应用以启用 AI 审查功能');
        return;
      }
    } catch (err) {
      console.log(`❌ 下载失败：${err.message}`);
      if (i < MODEL_URLS.length - 1) {
        console.log('🔄 尝试下一个下载源...');
      }
    }
  }

  // 所有源都失败
  throw new Error('所有下载源均失败，请检查网络连接或手动下载模型');
}

function downloadFromUrl(url) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(MODEL_PATH);
    let downloadedBytes = 0;
    let totalBytes = 0;
    let startTime = Date.now();

    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        https.get(response.headers.location, (redirectResponse) => {
          handleDownload(redirectResponse, file, resolve, reject, startTime);
        }).on('error', reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      handleDownload(response, file, resolve, reject, startTime);
    }).on('error', reject);

    function handleDownload(response, file, resolve, reject, startTime) {
      totalBytes = parseInt(response.headers['content-length'] || '0', 10);

      response.pipe(file);

      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        if (totalBytes > 0) {
          const percent = ((downloadedBytes / totalBytes) * 100).toFixed(1);
          const mb = Math.round(downloadedBytes / 1024 / 1024);
          const totalMB = Math.round(totalBytes / 1024 / 1024);
          process.stdout.write(`\r📥 下载进度：${percent}% (${mb}MB / ${totalMB}MB)`);
        }
      });

      file.on('finish', () => {
        file.close();
        resolve(true);
      });
    }

    file.on('error', (err) => {
      fs.unlink(MODEL_PATH, () => {}); // 删除损坏的文件
      reject(err);
    });
  });
}

// 手动下载说明
function showManualInstructions() {
  console.log('\n📖 手动下载说明:\n');
  console.log('如果自动下载失败，可以通过以下方式手动下载模型:\n');
  console.log('1. 访问 HuggingFace:');
  console.log('   https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF');
  console.log('\n2. 下载文件:');
  console.log('   qwen2.5-0.5b-instruct-q4_k_m.gguf (~300MB)');
  console.log('\n3. 将文件保存到项目的 models/ 目录下');
  console.log('   并重命名为：qwen2.5-0.5b.gguf\n');
}

// 执行
downloadModel()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ 下载失败:', err.message);
    showManualInstructions();
    process.exit(1);
  });
