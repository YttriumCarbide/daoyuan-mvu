---
feature: workshop-images
status: in-progress
updated: 2026-09-06
branch: workshop-preview
commits:
---

# Workshop 图片接入

## Report

## [S1] Problem

当前运行源码已经使用 ImageIndex v2，旧 portrait 数据只存在于历史发布源。状态栏尚未读取当前酒馆角色启用的 Workshop 图片，角色榜、人物立绘和其他图片消费者无法使用这些图片；可选工坊故障不能影响状态栏或已有图片。

## [S2] Design

- 复用 `features/image-library` 的 v2 解析、缓存、store 和 selectors。主图片库继续缓存优先、缺少缓存时首次下载及手动同步 `images.json`，不在收起、展开或普通 MVU 数据刷新时下载主库。外部索引在边界校验，主题和标签保持开放字符串；自定义立绘及历史偏好迁移保持独立。
- 主库与 Workshop 快照分别保存在内存，由 store 发布一份合并的 ImageIndex v2 投影。Workshop 不写入主库缓存。同名同类型按主库在前、Workshop 在后的顺序合并，以 `url + theme` 去重，同图标签取并集；同名不同类型保留主库实体。新实体和新主题自然进入原有 selectors，业务不识别数据来源。用户自定义图片继续覆盖对应默认主题。
- Workshop adapter 在本次加载中从 `window.parent` 取得宿主（独立页面的 parent 为自身）。API 缺失直接跳过；若 API 已存在且当前环境提供 `waitGlobalInitialized`，先执行标准发现再重新读取父窗口 API。仅使用 `getImages()`。父窗口不可访问、API 不可用、同步抛错、异步拒绝、非法索引或 2 秒超时都返回空的可选结果，不弹错误、不拒绝状态栏初始化。
- 每个状态栏页面 / iframe 加载并完成首次数据渲染后启动一次可选读取，不等待 Workshop。收起、展开、窗口尺寸调整、聊天事件、普通 MVU 数据刷新及手动主库同步均不再请求 Workshop；只有重新加载状态栏才获取新的 Workshop 快照。不修改 `setCollapsed` 或宿主 bridge，不轮询、不订阅 Workshop。
- Workshop 快照仅属于本次页面加载，重新加载后自然清空。超时后的迟到结果不发布；主库手动同步与可选读取彼此独立，不互相覆盖。不增加请求序号、失效订阅或重试状态机。
- 合并结果沿现有 `daoyuan_images_changed` 通知更新立绘池、角色榜及状态栏；无主库时仍可使用 Workshop 图片与本地自定义立绘。复用既有渲染函数，不新增第二套业务查询、图片组件或跨窗口 RPC 框架。图片进入 HTML 字符串时复用属性转义。

## [S3] Out of Scope

不修改上游工坊、历史 `origin` 发布源、MVU 数据结构或自定义立绘存储格式；不新增依赖、自动轮询、后台定时刷新、Workshop 写操作、部署或推送。

## Tasks

- [x] T1: 校验并复用 ImageIndex v2 边界及合并投影 — acceptance: 开放主题可查询，同类型追加和去重、跨类型冲突及冻结输入有行为测试，旧格式被拒绝。(covers: S2)
- [x] T2: 接入可选 Workshop 读取 — acceptance: 父窗口发现、缺失、抛错、拒绝、超时、非法数据、迟到结果及主库缓存隔离均有行为测试，失败不影响主库读取。(covers: S2; depends: T1)
- [x] T3: 接通页面加载和已有图片消费者 — acceptance: 浏览器验证 srcdoc 父窗口读取、重新加载后图片变化，收起展开及数据刷新不重取、API 不可用时界面可交互；角色榜与人物立绘使用合并结果，自定义立绘仍优先。(covers: S2; depends: T2)
- [ ] T4: 验证并独立审查 — acceptance: 图片验证与所有发布目标构建通过，浏览器检查完成；独立审查分别确认规格、正确性、仓库一致性和复杂度，修复并复核必要问题。(covers: S2; depends: T3)
