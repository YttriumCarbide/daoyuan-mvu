---
feature: workshop-images
status: delivered
updated: 2026-09-06
branch: workshop-preview
commits: 453e45ee1419ffbabce7dac82dacd944f1a846df..d35ef331c52af68e23b0ffa8204aff04ee9a5b30
---

# Workshop 图片接入

## Report

**What was built** — 复用现有 ImageIndex v2 图片库，校验外部图片数据，并将 Workshop 作为独立的内存来源合入共享 store。角色榜、人物立绘和其他图片消费者继续使用同一查询接口；主库顺序、自定义覆盖以及主库缓存保持独立。

每次状态栏页面或 iframe 加载并完成首次渲染后，只从父窗口读取一次 Workshop。收起展开、MVU 更新和主库手动同步不再读取；API 不可用、返回无效数据、拒绝或等待超过 2 秒时静默降级。已更新仓库追踪的 MVU、shujuku、悬浮 MVU 当前构建产物，宿主 bridge 与 setCollapsed 未改动。

**Verification** —

| 验证 | 观察结果 |
| --- | --- |
| `pnpm install --frozen-lockfile` | PASS，锁文件无变化 |
| 新增行为测试先于实现执行 | 初次 14 项中 13 项按预期失败；用户收窄为仅页面加载后，移除不再需要的重复请求/页面退出用例，保留 12 项 |
| `pnpm validate:images`（Node 24.15.0） | PASS，12/12，既有 `IMAGES_SYSTEM_OK`；IndexedDB 缺失和 quota 警告来自故意模拟的回退场景 |
| `node --test scripts/image-library.test.js`（Node 18.20.8） | PASS，12/12，真实 2 秒超时测试通过 |
| `node scripts/validate-images-system.js`（Node 18.20.8） | PASS，既有图片路由、主题、偏好迁移与 quota 回退验证通过 |
| `pnpm build:all` | PASS，MVU / shujuku / floating-mvu 均完成构建、内联 JS、srcdoc 安全及产物格式校验 |
| `git diff --check` | PASS |
| `agent-browser` 独立页面验证，`http://127.0.0.1:5175/` | PASS，页面内容、绝色榜交互正常，无相关应用错误或框架错误遮罩 |
| `python3 /tmp/status-workshop-qa/verify.py` 与配套 `agent-browser` 断言 | PASS，实际生成的悬浮脚本在 `http://127.0.0.1:5190/` 的 srcdoc fixture 中验证 parent API、人物与角色榜图片、自定义优先、主库缓存隔离、手动同步不重取、iframe 重载读取新快照、缺失/拒绝/非法/持续等待时界面可操作；桌面 1280×720 与移动 390×844 截图检查通过 |
| `agent-browser` 收起展开及 MVU 事件断言 | PASS，两次 launcher 点击与 `VARIABLE_UPDATE_ENDED` 后 Workshop 调用次数仍为 1 |
| 发布 JSON 顶层字段比较 | floating 仅 `content` 变化，两个 regex 仅 `replaceString` 变化；元数据及历史产物不变 |
| 独立审查及复审 | 规格符合性、正确性、仓库一致性、复杂度均通过；唯一发现的 Node 18 测试兼容性问题已复现、修正并在 Node 18/24 验证 |

浏览器验证使用本地 MVU/Workshop fixture，未在用户实际 SillyTavern 会话中导入或验收。未执行推送、部署或上游写操作。

**Journey log** —

1. 当前运行源码已迁移到 v2，因此沿共享 image-library 完成边界校验和可选来源接入，避免重做已有图片业务。
2. 用户明确收起展开不得重取图片后，读取收敛为页面加载一次；无需重开事件、请求序号或刷新状态机。
3. 原图片变更通知仅重建立绘池；异步 Workshop 数据到达后还需复用现有渲染函数更新已经显示的消费者。
4. 独立审查发现 Node 18 默认缺少 CustomEvent 且 timer mock 签名不同；测试改为最小事件环境补充和有上限的真实超时等待，保留原运行版本要求。

## [S1] Problem

当前运行源码已经使用 ImageIndex v2，旧 portrait 数据只存在于历史发布源。状态栏尚未读取当前酒馆角色启用的 Workshop 图片，角色榜、人物立绘和其他图片消费者无法使用这些图片；可选工坊故障不能影响状态栏或已有图片。

## [S2] Design

- 复用 `features/image-library` 的 v2 解析、缓存、store 和 selectors。主图片库继续缓存优先、缺少缓存时首次下载及手动同步 `images.json`，不在收起、展开或普通 MVU 数据刷新时下载主库。外部索引在边界校验，主题和标签保持开放字符串；自定义立绘及历史偏好迁移保持独立。
- 主库与 Workshop 快照分别保存在内存，由 store 发布一份合并的 ImageIndex v2 投影。Workshop 不写入主库缓存。同名同类型按主库在前、Workshop 在后的顺序合并，以 `url + theme` 去重，同图标签取并集；同名不同类型保留主库实体。新实体和新主题自然进入原有 selectors，业务不识别数据来源。用户自定义图片继续覆盖对应默认主题。
- Workshop adapter 在本次加载中从 `window.parent` 取得宿主（独立页面的 parent 为自身）。若当前环境提供 `waitGlobalInitialized`，先执行标准发现，再读取父窗口 API；发现和图片读取共用 2 秒超时。没有发现接口时直接检查父窗口 API。仅使用 `getImages()`。父窗口不可访问、发现失败、API 不可用、同步抛错、异步拒绝、非法索引或超时都返回空的可选结果，不弹错误、不拒绝状态栏初始化。
- 每个状态栏页面 / iframe 加载并完成首次数据渲染后启动一次可选读取，不等待 Workshop。收起、展开、窗口尺寸调整、聊天事件、普通 MVU 数据刷新及手动主库同步均不再请求 Workshop；只有重新加载状态栏才获取新的 Workshop 快照。不修改 `setCollapsed` 或宿主 bridge，不轮询、不订阅 Workshop。
- Workshop 快照仅属于本次页面加载，重新加载后自然清空。超时后的迟到结果不发布；主库手动同步与可选读取彼此独立，不互相覆盖。不增加请求序号、失效订阅或重试状态机。
- 合并结果沿现有 `daoyuan_images_changed` 通知更新立绘池、角色榜及状态栏；无主库时仍可使用 Workshop 图片与本地自定义立绘。复用既有渲染函数，不新增第二套业务查询、图片组件或跨窗口 RPC 框架。图片进入 HTML 字符串时复用属性转义。
- 聊天内容刷新与打开聊天共用渲染函数；仅打开聊天时重置输入框和详情面板，图片或 MVU 刷新保留当前草稿及输入框高度。

## [S3] Out of Scope

不修改上游工坊、历史 `origin` 发布源、MVU 数据结构或自定义立绘存储格式；不新增依赖、自动轮询、后台定时刷新、Workshop 写操作、部署或推送。

## Tasks

- [x] T1: 校验并复用 ImageIndex v2 边界及合并投影 — acceptance: 开放主题可查询，同类型追加和去重、跨类型冲突及冻结输入有行为测试，旧格式被拒绝。(covers: S2)
- [x] T2: 接入可选 Workshop 读取 — acceptance: 父窗口发现、缺失、抛错、拒绝、超时、非法数据、迟到结果及主库缓存隔离均有行为测试，失败不影响主库读取。(covers: S2; depends: T1)
- [x] T3: 接通页面加载和已有图片消费者 — acceptance: 浏览器验证 srcdoc 父窗口读取、重新加载后图片变化，收起展开及数据刷新不重取、API 不可用时界面可交互；角色榜与人物立绘使用合并结果，自定义立绘仍优先。(covers: S2; depends: T2)
- [x] T4: 验证并独立审查 — acceptance: 图片验证与所有发布目标构建通过，浏览器检查完成；独立审查分别确认规格、正确性、仓库一致性和复杂度，修复并复核必要问题。(covers: S2; depends: T3)
