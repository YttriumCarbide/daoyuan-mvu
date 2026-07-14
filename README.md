# MVU Status Bar

用于开发和维护 SillyTavern MVU 状态栏的前端项目。项目将原本嵌在 MVU 正则脚本中的大型 HTML、CSS 和 JavaScript 拆分为可维护的源码，并通过 Vite 提供本地预览和生产构建。

## 项目目标

- 提供一个独立、直观的状态栏开发环境，方便快速调整界面和交互。
- 在接近真实 SillyTavern 聊天页面的 Tavern 模拟环境中验证 iframe 尺寸、滚动、浮层和点击行为。
- 支持在独立 iframe 中检查状态栏嵌入效果和响应式表现。
- 保持 `origin/regex-mvu.json` 作为 MVU 正则脚本的发布源，通过构建自动生成可直接使用的 `dist/regex-mvu.json`。
- 让状态栏的 HTML、样式和功能代码按组件拆分，降低修改和回归验证成本。

## 外部来源

项目中的 `data/applause-character-registry.json` 和 `daoyuan-applause` 组件来自 `daoyuan-wiki`，本项目只负责在状态栏中接入和验证它们，不维护其源代码或数据定义。

## 环境要求

- Node.js 18+
- pnpm 8+

安装依赖：

```bash
pnpm install
```

## 开发

### 独立状态栏预览

```bash
pnpm dev
```

启动 Vite 开发服务器，直接预览 `src/index.html`。开发模式会注入 MVU mock、jQuery 和 Lodash，便于在没有 SillyTavern 的情况下调试状态栏。

### iframe 预览

```bash
pnpm dev:iframe
```

打开 iframe 测试页，可切换全屏、桌面、平板和手机尺寸，也可以拖拽右下角检查状态栏在不同容器尺寸下的表现。

### Tavern 模拟环境

```bash
pnpm dev:tavern
```

启动一个贴近 SillyTavern 聊天页面的本地模拟环境。状态栏会作为真实 iframe 嵌入消息内容中，用于验证聊天页面中的高度同步、滚动定位、面板遮挡和移动端布局。

## 构建与脚本

| 命令 | 用途 |
| --- | --- |
| `pnpm dev` | 启动独立状态栏开发服务器 |
| `pnpm dev:iframe` | 启动 iframe 尺寸和嵌入测试页 |
| `pnpm dev:tavern` | 启动 Tavern 聊天页面模拟环境，默认使用 `5174` 端口 |
| `pnpm build` | 构建单文件状态栏，格式化产物，并生成 `dist/regex-mvu.json` |
| `pnpm extract` | 从 `origin/regex-mvu.json` 拆出 `src/index.html`、`src/style.css` 和 `src/main.js` |
| `pnpm extract -- --force` | 强制重新提取，可能覆盖 `src/` 中未提交的修改，谨慎使用 |
| `pnpm kill <port>` | 结束占用指定端口的进程，例如 `pnpm kill 5173` |

构建产物位于 `dist/`：

- `dist/index.html`：打包后的单文件状态栏。
- `dist/regex-mvu.json`：将构建后的 HTML 写回 `replaceString` 后的 MVU 正则脚本，可导入 SillyTavern。

## 推荐工作流

1. 修改 `src/components/`、`src/style.css` 或 `src/index.html`。
2. 使用 `pnpm dev` 进行快速预览；涉及 iframe 或聊天页行为时，再使用 `pnpm dev:iframe` 或 `pnpm dev:tavern`。
3. 确认功能后运行 `pnpm build`。
4. 检查 `dist/regex-mvu.json`，将其导入或复制到 SillyTavern 的 MVU 正则脚本中验证实际效果。

如果需要从已有的 MVU JSON 恢复源码，先确认当前 `src/` 没有需要保留的修改，再运行 `pnpm extract`。脚本默认会阻止覆盖已有的 `src/index.html`，确需覆盖时才使用 `--force`。

## 目录说明

```text
src/                         状态栏源码
src/components/              按功能拆分的 UI 和交互模块
src/index.html               页面结构
src/style.css                页面样式
origin/regex-mvu.json        原始 MVU 正则脚本
tavern/                      SillyTavern 聊天页模拟环境
scripts/                     提取、构建后处理、校验和端口工具
dist/                        本地构建产物，不作为源码维护
```

## 注意事项

- `src/index.html` 中的状态栏会加载 DaoYuan applause 组件和部分远程资源，预览时需要网络连接。
- `pnpm build` 会执行构建后处理和 `srcdoc` 安全校验；校验失败时不会生成可用的最终产物。
- `pnpm extract -- --force` 是覆盖式操作，执行前请先确认 Git 工作区或自行备份修改。
