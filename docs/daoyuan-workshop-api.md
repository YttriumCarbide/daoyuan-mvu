# 道渊工坊第三方 API

> 文档更新日期：2026-09-06。

> 发布状态：Workshop 已于 2026-08-30 发布。本文列出的公开 facade 与 wire 版本是已发布兼容面；后续版本遵循 Schema 演进规范 与 Workshop 发布后兼容 ADR。

本文面向在 SillyTavern 中运行的第三方脚本与插件开发者。道渊工坊加载完成后，会提供冻结的
`window.DaoyuanWorkshopAPI`（在浏览器中也可以通过 `globalThis.DaoyuanWorkshopAPI` 访问），用于：

- 打开道渊工坊；
- 批量读取当前角色已安装且启用的 Workshop Character / Worldbook entry；
- 读取这些受控内容提供的 Workshop 图片索引。

公开 facade 只有 `open()`、`getEntry()` 和 `getImages()` 三个自有方法。本文明确记录的
入口和行为视为兼容性承诺。

## 接入前提

- 用户已安装并启用道渊工坊；
- 脚本运行环境提供 JS-Slash-Runner 的 `waitGlobalInitialized()`；
- 如果道渊工坊没有成功加载，公开 API 不会出现。不能无限等待的调用方应自行设置加载超时。

## 快速上手

先等待 API 出现，再从当前脚本环境读取它：

```javascript
await waitGlobalInitialized('DaoyuanWorkshopAPI');

const workshop = window.DaoyuanWorkshopAPI;
if (!workshop) {
  throw new Error('DaoyuanWorkshopAPI is unavailable');
}
```

`waitGlobalInitialized()` 用于等待全局名称可用，不返回 API 对象。因此应始终在等待完成后读取
`window.DaoyuanWorkshopAPI`，不要使用固定延时或轮询代替。

### 打开道渊工坊

```javascript
workshop.open();
```

`open()` 同步返回 `void`。它只负责请求打开工坊界面，不等待界面加载完成。

### 读取当前 Workshop entries

需求指定的方法名是单数 `getEntry()`，但它是批量快照接口，不接收单条 identity：

```javascript
try {
  const index = await workshop.getEntry();

  for (const entry of index.data.entries) {
    console.log(
      entry.packageDisplayName,
      entry.packageId,
      entry.version,
      entry.entryId,
      entry.displayName,
      entry.primaryKeys,
    );
  }
} catch (error) {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? error.code
    : undefined;

  switch (code) {
    case 'WORKSHOP_ENTRIES_INVALID':
      // 当前受控安装状态无法安全校验；回退到插件自己的内容。
      break;
    case 'WORKSHOP_ENTRIES_READ_FAILED':
      // 本次宿主读取失败；回退，并只在页面或角色状态变化后重试。
      break;
    case 'WORKSHOP_API_STALE':
      // 旧 API 已失效；重新执行全局发现流程后再读取当前 API。
      break;
    default:
      throw error;
  }
}
```

成功返回一个只读的 current-only v1 Envelope：

```typescript
interface WorkshopEntryIndexEnvelopeV1 {
  readonly schemaVersion: 1;
  readonly data: {
    readonly revision: number;
    readonly workshopOrigin: string;
    readonly entries: readonly {
      readonly packageId: string;
      readonly packageDisplayName: string;
      readonly version: string;
      readonly entryId: string;
      readonly kind: 'character' | 'worldbook';
      readonly displayName: string;
      readonly primaryKeys: readonly string[];
    }[];
  };
}
```

字段语义：

- `workshopOrigin` 是当前快照对应的规范 HTTP(S) Workshop origin；
- `packageDisplayName` 是该 mod / DLC 签名发布物的作品名，与 entry 自身的 `displayName` 分离；
- `primaryKeys` 是当前受控物理 Worldbook entry 的主 keys；每项最多 4096 个 UTF-16 code units，
  每个 entry 最多 256 项。字符串按安装快照原样返回，调用方应按自身用途 trim、去空和去重；
- `revision` 只在同一个 API identity 内用于判断 entry metadata 是否相同。它是不透明的正整数，不是
  时间戳，不应跨页面、跨重装持久化，也不应通过大小比较推断新旧；
- `entries` 最多 4096 项，使用稳定 identity 顺序且不会出现重复的
  `packageId + version + entryId`；Envelope、entry 与嵌套数组均被冻结，应按只读数据使用。

合法但没有可公开 entry 的当前角色会成功返回 `entries: []`，没有 `WORKSHOP_ENTRIES_EMPTY`。只有以下
内容可以进入结果：当前角色关联、Binding、安装 Ledger、marker 与完整物理 inventory 全部校验通过，且
物理状态为 `enabled === true` 的受控 Character / Worldbook。Regex、控制词条、普通 Tavern Worldbook、
disabled entry、未受管理内容和缺失可信静态元数据的 entry 都不会被公开。

该索引只公开 literal-term discovery 所需的 identity、kind、`packageDisplayName`、`displayName` 和
`primaryKeys`。它不公开导航 URL、secondary keys、Regex rules、本地正文、图片字节、ReleaseDocument、
Registry locator、安装控制、session 或 mutation 信息。未在本文列出的 Workshop route template 不是
`getEntry()` 契约；调用方不能仅因 API 返回某个 origin 就扩大自己的 iframe trust allowlist。

无法返回 entry index 时，Promise 会以以下错误码之一拒绝：

| 错误码 | 含义 | 建议处理 |
| --- | --- | --- |
| `WORKSHOP_ENTRIES_INVALID` | ownership / Ledger / inventory 或 entry index 无法安全校验 | 回退到自己的内容，并提示用户打开工坊检查或重新应用当前角色的内容 |
| `WORKSHOP_ENTRIES_READ_FAILED` | 本次宿主读取无法完成 | 回退，并提示用户刷新页面；只在页面或角色状态变化后重试 |
| `WORKSHOP_API_STALE` | 这份 API 引用已经失效 | 重新调用 `waitGlobalInitialized()`，再从当前脚本环境读取新的 `DaoyuanWorkshopAPI` |

### 读取图片

```javascript
try {
  const index = await workshop.getImages();
  const entity = index.data.entities['林雪'];
  const image = entity?.images.find(item => item.theme === 'default')
    ?? entity?.images[0];

  console.log(image?.url);
} catch (error) {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? error.code
    : undefined;

  switch (code) {
    case 'WORKSHOP_IMAGES_EMPTY':
      // 当前角色没有 Workshop 图片，使用插件自己的备用内容。
      break;
    case 'WORKSHOP_IMAGES_INVALID':
      // 提示用户打开工坊，检查或重新应用当前角色的内容。
      break;
    case 'WORKSHOP_IMAGES_READ_FAILED':
      // 本次读取失败；使用备用内容，并提示用户刷新页面后重试。
      break;
    case 'WORKSHOP_API_STALE':
      // 旧 API 已失效；重新执行全局发现流程后再读取当前 API。
      break;
    default:
      throw error;
  }
}
```

`getImages()` 会等待当前角色的图片数据可用，然后返回一个只读的 ImageIndex v2。如果等待期间用户切换了
角色，调用会继续等待新角色的数据，不会返回切换前的结果。

无法返回图片索引时，Promise 会以以下错误码之一拒绝：

| 错误码 | 含义 | 建议处理 |
| --- | --- | --- |
| `WORKSHOP_IMAGES_EMPTY` | 当前角色没有可用的 Workshop 图片 | 使用插件自己的备用内容；当前状态不变时无需反复重试 |
| `WORKSHOP_IMAGES_INVALID` | 当前角色的 Workshop 图片配置无法通过校验 | 使用备用内容，并提示用户打开工坊检查或重新应用当前角色的内容 |
| `WORKSHOP_IMAGES_READ_FAILED` | 本次无法读取图片数据 | 使用备用内容，并提示用户刷新页面；只在页面或角色状态变化后重试 |
| `WORKSHOP_API_STALE` | 这份 API 引用已经失效 | 重新调用 `waitGlobalInitialized()`，再从当前脚本环境读取新的 `DaoyuanWorkshopAPI` |

一个 enabled entry 即使没有图片，仍可以出现在 `getEntry()` 中，而 `getImages()` 会按图片自己的结果
返回索引或拒绝 `WORKSHOP_IMAGES_EMPTY`。图片 display-name 的跨 kind 冲突也只会使图片投影无效，不会
抹掉已经通过 entry 契约校验的 exact identity。

## 快照、刷新与性能

Host 对当前角色只执行一次权威 entity scan，并在同一次 materialization 中生成 entry index、随机角色
候选和图片结果。`getEntry()` 与 `getImages()` 等待同一个当前 attempt，之后直接返回其内存中的冻结
快照；公开调用不会重新读取 Worldbook 或重建 index。作品名、entry display name 或主 keys 只有在
权威 scan 观察到变化时才生成新的 entry revision；相同 revision 的 consumer 可以直接复用既有 matcher
或其它派生结构。

这两个读取方法都不设置通用超时，也不提供持续订阅。如果第三方必须在限定时间内结束等待，应在调用外层
实现自己的超时策略。不要轮询；在调用方自己拥有的角色或页面生命周期事件发生时重新读取即可。

错误对象只有 `code` 是稳定的公开字段。不要依赖 `message`、`stack`、具体构造函数、`cause` 或其他未记录
字段，也不要把某个错误码当作固定时间后必然成功的重试提示。

## 图片返回数据

`getImages()` 的返回值遵循 Daoyuan ImageIndex v2：

- [JSON Schema](https://github.com/YttriumCarbide/Daoyuan/blob/main/images.schema.json)
- [数据示例](https://github.com/YttriumCarbide/Daoyuan/blob/main/images.json)
- [daoyuan-images SDK 文档](https://github.com/YttriumCarbide/Daoyuan/blob/main/docs/sdk.md)

实体名、图片主题和标签都是开放数据，不应在第三方代码中维护一份封闭枚举。API 返回的是索引信息和图片
URL；只有在页面实际使用 URL 时，浏览器才会加载图片内容。`getImages()` 成功不代表每个 URL 的网络请求
一定成功，展示图片的代码仍应处理常规加载失败。

如果项目已经安装 `daoyuan-images`，可以直接使用它的查询层：

```javascript
import { query } from 'daoyuan-images/query';

const index = await workshop.getImages();
const image = query(index)
  .entity('林雪')
  .theme('default')
  .first();
```

## API 参考

### `open(): void`

请求打开道渊工坊并立即返回，不等待工坊界面加载完成。

### `getEntry(): Promise<WorkshopEntryIndexEnvelopeV1>`

返回调用完成时当前角色可公开的完整 Workshop entry index。

- 成功：resolve 一个只读的 current-only v1 Envelope；没有可用 entry 时 `entries` 为空；
- 无法安全返回 index：reject，`code` 为 `WORKSHOP_ENTRIES_INVALID`、
  `WORKSHOP_ENTRIES_READ_FAILED` 或 `WORKSHOP_API_STALE`；
- 每次调用表示一次当前快照读取，不接收单条 identity，不提供持续订阅。

### `getImages(): Promise<ImageIndexV2>`

返回调用完成时当前角色可用的图片索引。

- 成功：resolve 一个只读的 ImageIndex v2；
- 无法返回索引：reject，`code` 为本文列出的四个图片错误码之一；
- 每次调用表示一次当前快照读取，不提供持续订阅。

## TypeScript

使用 `daoyuan-images` 类型入口时，可以声明：

```typescript
import type { ImageIndex } from 'daoyuan-images/types';

type DaoyuanWorkshopApiErrorCode =
  | 'WORKSHOP_ENTRIES_INVALID'
  | 'WORKSHOP_ENTRIES_READ_FAILED'
  | 'WORKSHOP_IMAGES_EMPTY'
  | 'WORKSHOP_IMAGES_INVALID'
  | 'WORKSHOP_IMAGES_READ_FAILED'
  | 'WORKSHOP_API_STALE';

interface DaoyuanWorkshopApiError {
  readonly code: DaoyuanWorkshopApiErrorCode;
}

interface DaoyuanWorkshopAPI {
  readonly open: () => void;
  readonly getEntry: () => Promise<WorkshopEntryIndexEnvelopeV1>;
  readonly getImages: () => Promise<ImageIndex>;
}

declare global {
  interface Window {
    readonly DaoyuanWorkshopAPI?: DaoyuanWorkshopAPI;
  }
}
```

全局属性在工坊加载前可能不存在，所以类型应保留 `undefined`，并继续通过
`waitGlobalInitialized('DaoyuanWorkshopAPI')` 发现它。捕获异常时应从 `unknown` 检查 `code`，不要用
`instanceof` 判断错误；上面的 `DaoyuanWorkshopApiError` 只描述受支持的公开字段。

## 支持范围

第三方可以依赖：

- 全局名称 `DaoyuanWorkshopAPI`；
- frozen `open()`、`getEntry()` 和 `getImages()` facade 的签名与本文描述的行为；
- 已发布的 Workshop entry index v1 与 ImageIndex v2 数据格式；后续破坏性版本不能原地改变这些版本的格式或语义；
- 本文列出的六个错误码，以及错误对象的 `code` 字段。

本文未列出的内容都不是公开接口，可能随版本变化。如果需要其他能力，请向道渊工坊提出公开 API 需求，
不要依赖偶然可访问的实现细节。每次第三方脚本初始化时，都应重新执行标准的全局发现流程。
