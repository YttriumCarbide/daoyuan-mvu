# DaoYuan Applause Web Component

`<daoyuan-applause>` 是 DaoYuan WIKI 提供给第三方 HTTPS 页面的点赞按钮 Web Component。宿主页面只负责按钮外观；登录、额度、写入和反馈 UI 由 DaoYuan 共享 iframe 处理。

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

`data-local-mode` 用于指定组件在当前文档注册，适用于 `srcdoc`、嵌套 iframe 或其他独立文档(比如正则替换的 MVU 状态栏)。若当前文档能访问 SillyTavern 宿主窗口，共享 surface runtime 会提升到宿主窗口，以覆盖宿主完整可视区域；组件的 anchor 会自动转换为宿主视口坐标。无法访问宿主时，surface 留在当前文档；若当前文档本身位于受限的嵌套 iframe 中，surface 的可视范围也会受该 iframe 限制。

嵌套文档中的配置示例：

```html
<script
  type="module"
  src="https://cdn.daoyuan.mayuworld.com/scripts/prod/latest/daoyuan-applause.min.js"
  data-daoyuan-applause
  data-local-mode
></script>
```

该属性只影响组件注册位置，不改变 surface owner。iframe 的 DaoYuan WIKI origin 由脚本级 `data-app-origin` 单独决定，未设置时使用默认生产 origin。

### 放置组件

每个组件需要人物的永久数字 ID。可从公开登记表`https://daoyuan.mayuworld.com/applause-character-registry.json`按规范人物名查询：

```json
{
  "schemaVersion": 1,
  "characters": {
    "林若悠": 2,
    "...": 999
  }
}
```

`characters` 是只读的规范人物名到 ID 映射，只包含当前可用于点赞的人物。如果是按版本发布的项目，可以直接固化到项目里减少运行时请求和复杂度。

```html
<daoyuan-applause
  class="c-demo-applause"
  character-id="2"
  version="v52"
  aria-label="为林若悠点赞"
>
  <span class="c-demo-applause__icon" aria-hidden="true">👏</span>
  <span class="c-demo-applause__label">点赞</span>
</daoyuan-applause>
```

- `character-id` 必须是公开登记表中的正整数人物 ID。
- 页面可以放多个组件，但它们共享一个 iframe，同一时间只有一个组件处理点赞。

## 2. 属性与样式

| 属性 | 默认值 | 用途 |
| --- | --- | --- |
| `character-id` | 必填 | 角色数字 ID |
| `version` | 当前默认版本 | 角色版本；非法值会报告 `invalid-version` |
| `aria-label` | `点赞` | 内部原生 button 的可访问名称 |
| `disabled` | - | 禁用当前实例，不参与输入仲裁、不发送点赞手势 |

### 默认 slot

组件的所有直接子节点都会投影到内部原生 button 的默认 slot。宿主可以自由组合图标、文字、数值或其他静态视觉节点，不需要用单个 `span` 包裹全部内容。组件没有子节点时，slot 回退文本为“点赞”。

- slot 内只放静态视觉内容，不要放入 `<button>`、`<a>`、表单控件或其他可交互元素。
- 可访问名称由宿主元素的 `aria-label` 提供；纯装饰图标应设置 `aria-hidden="true"`。
- slot 子节点位于宿主页面的 light DOM，可以直接用宿主 CSS class 设置样式。

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

.c-demo-applause::part(visual) {
  gap: 0.375rem;
}

.c-demo-applause__icon {
  line-height: 1;
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
| `data-busy` | 当前实例正在进行认证流程 |
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
  const canRetry =
    event.detail.scope === 'runtime' && event.detail.retryable;
  if (retryButton) retryButton.hidden = !canRetry;
});

retryButton?.addEventListener('click', () => {
  applause?.retry();
});
```

## 4. 交互边界

- 短按提交一次点赞；按住约 `0.4s` 后进入连续点赞。Enter 和 Space 同样支持。
- 组件会在 capture 阶段保护自己的按钮区域，避免父级卡片点击、拖拽和装饰层吞掉点赞输入；真实覆盖在按钮之上的独立遮罩仍然优先（不保证目前没有 BUG）。
- Feedback 打开后，透明 iframe 覆盖完整可视视口，但仍在原按钮位置提供同一个短按/长按入口；不会关闭反馈，也不会把事件穿透回宿主页面。
- 只有在按钮锚点之外开始的新一轮空白 `pointerdown`，或按 Escape，才会关闭当前 iframe UI。
- iframe 保持透明，并与宿主同步正常 `color-scheme`；宿主的 `overflow`、`transform`、hover 动画和普通 `z-index` 不会裁剪或改变其视口大小。
- Auth Modal 在 iframe 内居中。普通浏览器由 Discord 登录按钮负责 Storage Access 和 OAuth popup；官方 Scripts runtime 检测到稳定 TauriTavern ABI 时，会在第二次点击后请求顶层打开无尺寸参数的系统浏览器，并在返回应用后自动完成当前分区的登录。两种路径都不会补发登录前丢弃的点赞。

Tauri external relay 已在当前源码实现，但只有部署对应 Wiki 路由并显式发布新版 applause Scripts 资产后才会对用户生效；安装版 macOS 与真实 iOS 仍需发布前实机验证。

## 5. 接入要求与排错

- 宿主页面必须是 HTTPS（本地开发可使用 `http://localhost`）。
- CSP 需要允许 CDN 上的 DaoYuan WIKI 脚本，以及对应 DaoYuan WIKI origin 的 `/embed/applause` iframe。
- 浏览器需要支持 Popover/top layer；不支持时组件报告 `unsupported-top-layer`，不会退回到容易被父级裁剪的 fixed iframe。
- 宿主页不能读取 DaoYuan WIKI cookie、OAuth grant、session key 或账户标识。
- 不要自行模拟 Tauri capability 或转发任意 URL。官方 runtime 只接受服务端生成的 DaoYuan external Auth URL，并严格校验 iframe window、origin 和一次性 bridge ID。

常见错误：

| code | 处理 |
| --- | --- |
| `missing-character-id` / `invalid-character-id` | 修正组件属性 |
| `invalid-version` | 使用受支持的版本 key |
| `iframe-load-failed` / `ready-timeout` / `protocol-error` | 检查 origin、CSP、网络后调用 `retry()` |

## 6. 上线前检查

- 每页只加载一个生产或 Preview origin。
- 每个实例都有合法 `character-id`，slot 内没有交互元素（有交互元素可能会导致点赞失效）。
- 已定义 focus、busy、disabled 和 blocked 状态的外观。
- 在真实宿主页面验证 `overflow: hidden`、hover transform、父级点击层，以及 Feedback 打开后的再次短按、长按和空白关闭。
- 验证 Discord 登录、Storage Access、OAuth popup，以及网络/CSP 失败时的重试入口；Tauri 发布还必须分别验证 macOS 与真实 iOS 的系统浏览器打开、返回后登录和刷新恢复。
