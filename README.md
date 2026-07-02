# 词汇随记

一个用于个人英语词汇记忆的手机端 Web App。采用“重点词深度记忆 + 非重点词了解 + 短语化记忆 + 科学复习”的方法。

---

## 项目定位

- **使用场景**：每天学习 28 个单词，其中 8 个作为重点词深度掌握，其余 20 个作为了解词，同时记录重点短语和例句。
- **核心目标**：通过结构化存储、关联词网和间隔重复，提升词汇记忆的长期留存率。
- **当前阶段**：MVP 已完成，具备录入、展示、批量导入功能，正在逐步加入复习模块和 PWA 支持。

---

## 当前功能

### 已完成功能

- [x] 单词录入：单词、中文释义、短语、例句、备注
- [x] 重点 / 非重点区分（左侧边框颜色不同）
- [x] 短语重点标记（`★` 前缀）
- [x] 单词编辑与删除
- [x] 按“全部 / 重点 / 非重点”筛选
- [x] 本地持久化存储（`localStorage`）
- [x] 关联字段展示：近义词、反义词、派生词、易混词、典型词根 / 同源
- [x] 批量导入：支持按天一键导入和通用 JSON 文件导入

### 进行中 / 待完成

- [x] 科学复习模块（基于 SRS 间隔重复算法）
- [x] 每日复习提醒与待复习统计
- [x] 词组化复习（见到单词回想重点词组）
- [x] 词汇星图可视化（近义词、反义词、派生词、易混词、同根词）
- [ ] 学习数据统计（打卡、词汇量曲线等）
- [ ] 数据导出 / 备份功能
- [x] PWA 配置（可添加到手机桌面、离线使用）
- [ ] 封装为可安装 App（Expo / Capacitor 或纯 PWA）

---

## 文件结构

```
D:/词汇随记/
├── index.html              # 主应用页面
├── style.css               # 全局样式（已做移动端适配）
├── app.js                  # 核心逻辑：增删改查、渲染、本地存储、复习计数
├── review.html             # 词义复习页面
├── review-phrases.html     # 词组复习页面
├── review.css              # 复习页面样式
├── review.js               # 词义复习逻辑（基于 SRS 算法）
├── review-phrases.js       # 词组复习逻辑
├── network.html            # 词汇星图可视化
├── network.css             # 词汇星图样式
├── network.js              # 词汇星图逻辑（使用 D3.js）
├── import.html             # 导入中心（按天导入的入口目录）
├── import-batch-01.html    # 第 1 天词汇一键导入页
├── import-batch-02.html    # 第 2 天词汇一键导入页
├── import-batch-03.html    # 第 3 天词汇一键导入页
├── import-batch-04.html    # 第 4 天词汇一键导入页
├── import-batch-05.html    # 第 5 天词汇一键导入页
├── import-batch-06.html    # 第 6 天词汇一键导入页
├── import-batch-07.html    # 第 7 天词汇一键导入页
├── import-tool.html        # 通用批量导入工具（选择 JSON 文件导入）
├── data/
│   ├── words-batch-01.json # 第 1 天词汇的源数据（JSON 备份）
│   ├── words-batch-02.json # 第 2 天词汇的源数据（JSON 备份）
│   ├── words-batch-03.json # 第 3 天词汇的源数据（JSON 备份）
│   ├── words-batch-04.json # 第 4 天词汇的源数据（JSON 备份）
│   ├── words-batch-05.json # 第 5 天词汇的源数据（JSON 备份）
│   ├── words-batch-06.json # 第 6 天词汇的源数据（JSON 备份）
│   └── words-batch-07.json # 第 7 天词汇的源数据（JSON 备份）
└── README.md               # 本说明文档
```

---

## 使用方式

### 1. 打开应用

双击 `index.html`，在现代浏览器（Chrome / Edge / Firefox）中打开。

### 2. 导入历史数据

1. 双击 `import.html`
2. 选择对应的天数（如“第 1 天词汇”）
3. 点击“立即导入”
4. 导入成功后打开 `index.html` 查看

### 3. 每日复习

打开 `index.html`，首页会显示“今日复习”数量，提供三种入口：

- **词义复习**（`review.html`）：见到单词回想中文释义。
- **词组复习**（`review-phrases.html`）：见到单词回想重点词组 / 短语。
- **词汇星图**（`network.html`）：可视化查看单词之间的关联。

复习评分：
- **忘记 / 没想起**：重置复习间隔为 1 天
- **模糊 / 想起部分**：间隔小幅延长
- **认识 / 全想起**：进入下一级复习间隔

### 4. 词汇星图

- 使用 D3.js 绘制力导向图。
- 节点颜色：红色为重点词，蓝色为非重点词，橙色为词根节点。
- 连线颜色：绿色（近义）、蓝色（派生）、红色（易混）、橙色（同根）。
- 支持按关系类型和重点/全部筛选。
- 点击节点查看单词详情。

### 5. 手动添加新单词

在 `index.html` 页面顶部的表单中填写：

- **单词**、**中文释义**：必填
- **词组 / 短语**：每行一个，以 `*` 开头表示重点短语
- **例句、备注**：可选
- **是否重点**：勾选后左侧显示红色边框

### 5. 导入文件说明

- `import-batch-XX.html`：一次性导入页面，导入完成后可删除。
- `data/words-batch-XX.json`：**建议保留**，作为词汇源文件备份。
- `import-tool.html`：通用导入工具，建议保留，用于导入自定义 JSON。

---

## 批量导入流程（与 AI 协作）

每完成一天的词汇手写笔记后：

1. 拍照并发送给 AI。
2. AI 转录并生成：
   - `data/words-batch-0N.json`
   - `import-batch-0N.html`
3. 在 `import.html` 中追加第 N 天的入口。
4. 用户打开 `import.html` → 点击“第 N 天词汇”→ 一键导入。

---

## SRS 复习算法说明

采用简化版 SM-2 间隔重复算法：

- 每个单词记录 `reviewLevel`（复习等级）、`interval`（间隔天数）、`nextReviewDate`（下次复习日期）。
- **忘记**：等级归零，间隔 1 天。
- **模糊**：等级不变，间隔 × 1.3。
- **认识**：等级 +1，间隔按等级递增：1 天 → 3 天 → 6 天 → 之后翻倍。
- 每日新词上限为 10 个，优先复习已到期的单词。

---

## 数据结构

每个单词在 `localStorage` 中保存为如下 JSON 对象：

```json
{
  "id": "betray",
  "word": "betray",
  "meaning": "vt. 背叛；辜负；泄露",
  "phrases": [
    { "text": "betray sb.", "important": true }
  ],
  "examples": ["He felt betrayed when his friend revealed his secrets."],
  "notes": "过去式/过去分词：betrayed",
  "isImportant": true,
  "createdAt": "2026-07-02",
  "lastReviewedAt": null,
  "reviewLevel": 0,
  "relations": {
    "synonyms": ["deceive", "reveal"],
    "derivatives": ["betrayal", "betrayer"],
    "confusable": ["portray"],
    "roots": ["-tray- (hand over, 交付)"]
  }
}
```

---

## 开发路线图

1. **第一阶段：数据积累**
   - 导入历史手写词汇（多天的 `words-batch-XX.json`）。

2. **第二阶段：复习系统**
   - 实现基于 SRS 的复习调度。
   - 增加“今日待复习”页面。
   - 记录每次复习结果，调整复习间隔。

3. **第三阶段：常用功能**
   - 数据统计、打卡、导出备份。
   - 搜索、排序、标签。

4. **第四阶段：封装为 App**
   - PWA 配置（离线、桌面图标）。
   - 可选：用 Capacitor / Expo 打包为原生 App。

---

## 注意事项

- 当前数据完全存储在浏览器 `localStorage` 中，**清空浏览器数据会导致丢失**。
- 建议定期导出 `data/words-batch-XX.json` 备份。
- 不同浏览器之间的 localStorage 不互通，换浏览器需重新导入 JSON。

---

## 更新日志

### 2026-07-02
- 创建项目基础结构（index.html / style.css / app.js）。
- 完成第 1 天 29 个词条的转录与导入（8 重点 + 20 非重点 + 1 补充短语词条）。
- 完成导入中心、一键导入页、通用导入工具。
- 增加关联字段展示（近义词、反义词、派生词、易混词、词根）。

### 2026-07-02
- 完成第 2 天 28 个词条的转录与导入（8 重点 + 20 非重点）。
- 更新导入中心，追加第 2 天入口。
- 修正手写拼写：scenario（原 senario）、photosynthesis（原 photosynthese）。

### 2026-07-02
- 完成第 3 天 28 个词条的转录与导入（8 重点 + 20 非重点）。
- 更新导入中心，追加第 3 天入口。
- 修正手写拼写：Adolescence（原 Adolescene）。

### 2026-07-02
- 完成第 4 天 28 个词条的转录与导入（8 重点 + 20 非重点）。
- 更新导入中心，追加第 4 天入口。
- 修正手写拼写：hormone（原 harmone）。

### 2026-07-02
- 完成第 5 天 28 个词条的转录与导入（8 重点 + 20 非重点）。
- 更新导入中心，追加第 5 天入口。
- 修正手写拼写：dormitory（原 dormtory）。

### 2026-07-02
- 完成第 6 天 28 个词条的转录与导入（8 重点 + 20 非重点）。
- 完成第 7 天 28 个词条的转录与导入（8 重点 + 20 非重点）。
- 更新导入中心，追加第 6、7 天入口。
- 修正手写拼写：injection（原 injuction）、dusk 短语 from dawn to dusk（原 dust）。

### 2026-07-02
- 实现复习模块（review.html / review.css / review.js）。
- 采用简化版 SM-2 SRS 间隔重复算法。
- 首页显示今日待复习数量，支持一键开始复习。
- 旧数据自动兼容 SRS 字段（reviewLevel、interval、nextReviewDate）。

### 2026-07-02
- 新增词组复习页面（review-phrases.html / review-phrases.js）。
- 新增词汇星图可视化（network.html / network.css / network.js），使用 D3.js。
- 首页整合词义复习、词组复习、词汇星图三个入口。
- 词汇星图支持近义词、反义词、派生词、易混词、同根词五类关联展示与筛选。
- 新增数据备份与恢复功能（导出 / 导入 JSON）。
- 新增 PWA 支持：manifest、Service Worker 离线缓存、本地 D3、可添加到手机桌面。
