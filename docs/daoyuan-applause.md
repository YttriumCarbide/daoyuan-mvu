# DaoYuan Applause Web Component

`<daoyuan-applause>` 是给第三方 HTTPS 页面使用的点赞按钮。宿主页面只负责按钮外观；登录、额度、写入和反馈 UI 由 DaoYuan 共享 iframe 处理。

更完整的 iframe、消息协议和安全约束见 [`applause-iframe-widget-spec.md`](./applause-iframe-widget-spec.md)。

## 1. 接入

### 加载一次脚本

生产环境：

```html
<script
  type="module"
  src="https://cdn.daoyuan.mayuworld.com/scripts/prod/latest/daoyuan-applause.min.js"
  data-daoyuan-applause
></script>
```

Preview 环境使用 Preview 脚本，并在脚本上设置一次文档级 `data-app-origin`：

```html
<script
  type="module"
  src="https://cdn.daoyuan.mayuworld.com/scripts/preview/latest/daoyuan-applause.min.js"
  data-daoyuan-applause
  data-app-origin="https://preview.daoyuan.mayuworld.com"
></script>
```

同一页面只加载一个可信 origin。`data-app-origin` 不能写在组件实例上。

`data-local-mode` 用于指定组件在当前文档注册。若当前文档能访问 SillyTavern 宿主窗口，共享 surface 仍会提升到宿主窗口，以覆盖宿主完整可视区域；组件的 anchor 会自动转换为宿主视口坐标。在无法访问宿主的独立文档中，surface 才留在当前文档。

嵌套文档中的配置示例：

```html
<script
  type="module"
  src="https://cdn.daoyuan.mayuworld.com/scripts/prod/latest/daoyuan-applause.min.js"
  data-daoyuan-applause
  data-local-mode
></script>
```

该属性只影响组件注册位置，不改变 surface owner。iframe 的 DaoYuan origin 由脚本级 `data-app-origin` 单独决定，未设置时使用默认生产 origin。

### 放置组件

```html
<daoyuan-applause
  class="c-demo-applause"
  character-id="2"
  version="v52"
  aria-label="为林若悠点赞"
>
  <span aria-hidden="true">👏 点赞</span>
</daoyuan-applause>
```

- `character-id` 必须是正整数角色 ID。
- slot 只放视觉内容，不要放 `<button>`、`<a>` 或其他交互元素。
- 页面可以放多个组件，但它们共享一个 iframe，同一时间只有一个组件处理点赞。

## 2. 属性与样式

| 属性 | 默认值 | 用途 |
| --- | --- | --- |
| `character-id` | 必填 | 角色数字 ID |
| `version` | 当前默认版本 | 角色版本；非法值会报告 `invalid-version` |
| `aria-label` | `点赞` | 内部原生 button 的可访问名称 |
| `disabled` | 未设置 | 禁用当前组件，不加载、不抢占宿主事件、不发送点赞 |

公开的 style parts 只有：

- `::part(surface)`：内部原生 button；
- `::part(visual)`：slot 的视觉包装层。

共享 iframe 不属于组件样式 API，宿主 CSS 不应尝试修改它。

```css
.c-demo-applause {
  display: inline-grid;
  min-block-size: 2.5rem;
  min-inline-size: 7rem;
}

.c-demo-applause::part(surface) {
  align-items: center;
  background: rgba(228, 200, 120, 0.12);
  border: 0.0625rem solid rgba(228, 200, 120, 0.55);
  border-radius: 999rem;
  color: #f8e8aa;
  cursor: pointer;
  display: inline-flex;
  font: inherit;
  inline-size: 100%;
  justify-content: center;
  min-block-size: 100%;
  padding: 0.5rem 0.875rem;
}

.c-demo-applause:focus-within {
  outline: 0.125rem solid rgba(228, 200, 120, 0.78);
  outline-offset: 0.1875rem;
}

.c-demo-applause[data-busy],
.c-demo-applause[data-runtime-blocked] {
  cursor: wait;
  opacity: 0.72;
}

.c-demo-applause[disabled],
.c-demo-applause[data-disabled] {
  cursor: not-allowed;
  opacity: 0.48;
}
```

常用只读状态：

| 状态 | 含义 |
| --- | --- |
| `data-state="idle|loading|ready|error"` | 共享运行时生命周期 |
| `data-hold-state="idle|arming|active|complete"` | 当前按压阶段 |
| `data-surface="closed|feedback|auth"` | 当前 iframe UI |
| `data-busy` | 正在初始化、认证或提交 |
| `data-disabled` | 当前不可写（例如额度或认证状态） |
| `data-runtime-blocked` | 另一个组件正在使用共享 iframe |

不要手工修改 `data-*` 状态来绕过权限或额度校验。

## 3. 事件

事件从 `<daoyuan-applause>` 冒泡，并设置 `composed: true`：

| 事件 | 重点字段 |
| --- | --- |
| `daoyuan-applause-ready` | `appOrigin`、`characterId`、`version` |
| `daoyuan-applause-state-change` | `busy`、`disabled`、`holdState` |
| `daoyuan-applause-action` | `count`、`continuous` |
| `daoyuan-applause-surface-change` | `surface`：`closed`、`feedback`、`auth` |
| `daoyuan-applause-error` | `scope`、`code`、`message`、`retryable` |

```js
const applause = document.querySelector('daoyuan-applause');
const retryButton = document.querySelector('[data-applause-retry]');

applause?.addEventListener('daoyuan-applause-action', (event) => {
  console.log('accepted applause:', event.detail.count);
});

applause?.addEventListener('daoyuan-applause-error', (event) => {
  if (retryButton) retryButton.hidden = !event.detail.retryable;
});

retryButton?.addEventListener('click', () => {
  applause?.retry();
});
```

## 4. 交互边界

- 短按提交一次点赞；按住约 `0.4s` 后进入连续点赞。Enter 和 Space 同样支持。
- 组件会在 capture 阶段保护自己的按钮区域，父级卡片点击、拖拽和装饰层不能吞掉点赞输入。
- Feedback 打开后，透明 iframe 覆盖完整可视视口，但仍在原按钮位置提供同一个短按/长按入口；不会关闭反馈，也不会把事件穿透回宿主页面。
- 只有在按钮锚点之外开始的新一轮空白 `pointerdown`，或按 Escape，才会关闭当前 iframe UI。
- iframe 保持透明，并与宿主同步正常 `color-scheme`；宿主的 `overflow`、`transform`、hover 动画和普通 `z-index` 不会裁剪或改变其视口大小。
- Auth Modal 在 iframe 内居中。Discord 登录按钮负责 Storage Access 和 OAuth popup；登录前未提交的点赞不会自动补发。

## 5. 接入要求与排错

- 宿主页面必须是 HTTPS（本地开发可使用 `http://localhost`）。
- CSP 需要允许 DaoYuan 脚本、`/embed/applause` iframe 和 Discord 登录 popup。
- 浏览器需要支持 Popover/top layer；不支持时组件报告 `unsupported-top-layer`，不会退回到容易被父级裁剪的 fixed iframe。
- 宿主页不会取得 DaoYuan cookie、OAuth token、session key 或账户标识。

常见错误：

| code | 处理 |
| --- | --- |
| `missing-character-id` / `invalid-character-id` | 修正组件属性 |
| `invalid-version` | 使用受支持的版本 key |
| `iframe-load-failed` / `ready-timeout` / `protocol-error` | 检查 origin、CSP、网络后调用 `retry()` |
| `action-error` | 展示操作失败提示，等待用户再次操作 |

## 6. 上线前检查

- 每页只加载一个生产或 Preview origin。
- 每个实例都有合法 `character-id`，slot 内没有交互元素。
- 已定义 focus、busy、disabled 和 blocked 状态的外观。
- 在真实宿主页面验证 `overflow: hidden`、hover transform、父级点击层，以及 Feedback 打开后的再次短按、长按和空白关闭。
- 验证 Discord 登录、Storage Access、OAuth popup，以及网络/CSP 失败时的重试入口。
