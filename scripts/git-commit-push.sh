#!/bin/bash
# Git 自动提交脚本 - 用于 cc skill
# 用法：./git-commit-push.sh "提交信息"

set -e  # 任何命令失败则退出

COMMIT_MSG="${1:-自动提交}"

echo "🔍 检查 git 状态..."
if ! git status &>/dev/null; then
    echo "❌ 错误：当前目录不是 git 仓库"
    exit 1
fi

echo "📝 变更内容:"
git status --short

echo "➕ 添加所有变更..."
git add -A

echo "💾 提交变更：$COMMIT_MSG"
git commit -m "$COMMIT_MSG" || {
    echo "⚠️  没有变更需要提交"
    exit 0
}

echo "🚀 推送到远程..."
git push

echo "✅ 完成！"
