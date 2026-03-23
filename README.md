# RainKaraoke Web

直播K歌助手Web版，响应式设计，兼容各种手机、平板、PC浏览器。

## 功能特性

### 核心功能
- 🎵 **媒体库管理** - 导入、管理和搜索歌曲
- 🎬 **视频播放** - 支持多种视频格式
- 🎤 **原唱/伴唱切换** - 一键切换原唱和伴唱
- 🎼 **歌词显示** - 支持LRC和KSC格式，逐字高亮
- ⏱️ **播放控制** - 进度控制、音调调节、速度调节
- 📱 **响应式设计** - 适配手机、平板、PC

### 增强功能
- 🎶 **过场音乐** - 歌曲结束自动播放背景音乐
- 🎉 **气氛组** - 掌声、欢呼、倒计时等音效
- 🎛️ **效果器** - 混响、EQ、压缩等音频效果
- 💾 **本地存储** - IndexedDB存储歌曲数据
- 📴 **PWA支持** - 可安装，支持离线基本功能

## 技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **样式**: Tailwind CSS
- **状态管理**: Zustand
- **路由**: React Router v6
- **数据存储**: IndexedDB (idb)
- **PWA**: vite-plugin-pwa

## 浏览器支持

| 浏览器 | 最低版本 |
|--------|----------|
| Chrome | 90+ |
| Safari | 14+ |
| Firefox | 88+ |
| Edge | 90+ |
| Mobile Safari | iOS 14+ |
| Chrome Mobile | Android 8+ |

## 快速开始

### 安装依赖

```bash
pnpm install
# 或
npm install
# 或
yarn install
```

### 开发模式

```bash
pnpm dev
```

访问 http://localhost:5173

### 构建生产版本

```bash
pnpm build
```

### 预览生产版本

```bash
pnpm preview
```

## 项目结构

```
src/
├── components/          # UI组件
│   ├── Layout/         # 布局组件
│   └── Player/         # 播放器组件
├── pages/              # 页面组件
│   ├── Library.tsx     # 媒体库页面
│   ├── Queue.tsx       # 队列页面
│   ├── Effects.tsx     # 效果器页面
│   └── Settings.tsx    # 设置页面
├── hooks/              # 自定义Hooks
├── stores/             # 状态管理
├── services/           # 服务层
├── types/              # TypeScript类型
└── utils/              # 工具函数
```

## 功能说明

### 媒体库
- 支持拖拽上传或点击选择文件
- 支持视频和音频格式
- 自动解析文件名提取歌曲信息
- 支持搜索和分类筛选

### 播放器
- HTML5 Video播放
- 进度条拖拽控制
- 原唱/伴唱切换
- 音调调节 (-12 ~ +12 半音)
- 播放速度调节 (0.5x ~ 2.0x)

### 歌词
- 支持LRC格式（逐行）
- 支持KSC格式（逐字高亮）
- 自动同步滚动

### 效果器
- 混响效果
- 均衡器 (低/中/高频)
- 压缩器
- 预设管理

## 响应式设计

| 设备 | 布局 |
|------|------|
| 手机 (<640px) | 单列布局，底部导航 |
| 平板 (640-1024px) | 双列布局，底部导航 |
| PC (>1024px) | 多列布局，侧边栏 |

## PWA功能

- 可添加到主屏幕
- 支持离线访问
- 后台播放支持

## 许可证

MIT License

## 相关项目

- [RainKaraoke](../RainKaraoke) - 桌面版 (Tauri)
- [RainKaraokeAndroid](../RainKaraokeAndroid) - Android版
