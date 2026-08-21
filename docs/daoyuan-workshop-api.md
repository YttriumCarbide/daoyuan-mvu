# Daoyuan Workshop API (`window.DaoyuanWorkshopAPI`)

道渊工坊在 SillyTavern（酒馆）全局暴露的只读 API，供第三方脚本与插件读取当前激活角色已启用的工坊 MOD（角色与世界书）图片数据。

数据格式遵循上游 [`YttriumCarbide/Daoyuan`](https://github.com/YttriumCarbide/Daoyuan) 的 [`images.schema.json`](https://github.com/YttriumCarbide/Daoyuan/blob/main/images.schema.json) (v2) 规范，并与 `daoyuan-images` SDK 保持一致。

- 上游仓库：<https://github.com/YttriumCarbide/Daoyuan>
- Schema 定义：<https://github.com/YttriumCarbide/Daoyuan/blob/main/images.schema.json>
- 数据格式参考：<https://github.com/YttriumCarbide/Daoyuan/blob/main/images.json>
- 上游 SDK 文档：<https://github.com/YttriumCarbide/Daoyuan/blob/main/docs/sdk.md>
---

## 快速上手

### 1. 读取图片索引
`window.DaoyuanWorkshopAPI.images` 为只读同步 Getter：

```javascript
function getWorkshopImages() {
  if (typeof window.DaoyuanWorkshopAPI === 'undefined') return null;
  try {
    return window.DaoyuanWorkshopAPI.images;
  } catch (err) {
    // 没有可用图片、正在切换角色或刷新配置时会抛出 WORKSHOP_IMAGES_UNAVAILABLE
    if (err?.code === 'WORKSHOP_IMAGES_UNAVAILABLE') return null;
    throw err;
  }
}
```

### 2. 配合 `daoyuan-images` SDK 使用
返回的索引结构与上游 `images.json` 相同，可直接传给 `daoyuan-images` 的查询函数：

```javascript
import { getEntity, imagesForTheme } from 'daoyuan-images';

const index = getWorkshopImages();
if (index) {
  const character = getEntity(index, '林雪');
  const femaleImages = imagesForTheme(index, '林雪', 'female');
}
```

### 3. 原生 JS 检索示例

```javascript
const index = getWorkshopImages();
if (index) {
  // 查找指定角色的默认立绘
  const entity = index.data.entities['林雪'];
  const defaultImage = entity?.images.find(img => img.theme === 'default') || entity?.images[0];
  console.log(defaultImage?.url);

  // 按标签筛选
  const battleImages = entity?.images.filter(img => img.tags.includes('battle'));
}
```

### 4. 监听角色切换
酒馆切换角色时，工坊会自动刷新图片索引：

```javascript
if (typeof eventOn === 'function') {
  eventOn('chat_id_changed', () => {
    setTimeout(() => {
      const index = getWorkshopImages();
      console.log('新角色的工坊图片:', index);
    }, 100);
  });
}
```

---

## TypeScript 类型定义

所有返回的数据对象及数组均已递归冻结（`Object.freeze`）：

```typescript
interface Window {
  readonly DaoyuanWorkshopAPI?: {
    readonly images: ImageIndexV2;
  };
}

interface ImageIndexV2 {
  readonly schemaVersion: 2;
  readonly data: {
    readonly entities: Readonly<Record<string, ImageEntityV2>>;
  };
}

interface ImageEntityV2 {
  /**
   * 实体类型：
   * - 'character': 工坊角色 (Character) 条目固定映射为此值
   * - 'sect': 工坊世界书 (Worldbook) 条目固定映射为此值
   * (当前仅支持 'character' 与 'sect'，不支持 other 等其他类型)
   */
  readonly type: 'character' | 'sect';
  readonly images: readonly ImageV2[];
}

interface ImageV2 {
  readonly url: string;               // HTTPS 直链
  readonly theme: string;             // 主题（如 'default', 'female' 等）
  readonly tags: readonly string[];   // 标签列表
  readonly comment?: string;          // 可选备注说明
}
```

---

## 行为与注意事项

1. **同步只读**：接口纯同步，不发起网络请求，不提供数据修改接口。
2. **数据范围与类型映射**：
   - 仅包含当前角色已安装且**已启用**的条目；没有图片的条目不会出现在 `entities` 中。
   - 工坊中的 **角色 (Character)** 条目固定映射为 `'character'`；
   - 工坊中的 **世界书 (Worldbook)** 条目固定映射为 `'sect'`。
   - 当前类型仅支持 `'character'` 与 `'sect'`，无 `other` 等额外类型。
3. **实体合并**：同名且同类型的条目会自动合并图片并去重；若同名但类型冲突（如同时存在同名角色和世界书），为保证数据安全会整批失效并抛错。
4. **错误处理**：当前角色无图片、正在切换角色或数据冲突时，访问 `images` 会抛出 `code: 'WORKSHOP_IMAGES_UNAVAILABLE'` 错误，不会返回非法空对象。
