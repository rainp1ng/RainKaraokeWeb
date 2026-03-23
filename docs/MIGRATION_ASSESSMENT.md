# RainKaraoke Web 迁移评估方案

## 一、项目概述

### 1.1 原项目分析

**项目名称**: RainKaraoke
**技术栈**: Tauri 2.0 (React + TypeScript 前端 + Rust 后端)
**目标平台**: 桌面端 (Windows/macOS/Linux)
**核心功能**: 直播K歌助手，提供歌曲播放、原唱/伴唱切换、音效处理、气氛组音效等功能

### 1.2 迁移目标

**项目名称**: RainKaraoke Web
**目标平台**: Web (响应式设计，兼容手机、平板、PC)
**技术栈**: React 18 + TypeScript + Tailwind CSS + Vite

---

## 二、功能迁移评估

### 2.1 核心功能模块评估

| 模块 | 复杂度 | 可行性 | 说明 |
|------|--------|--------|------|
| 媒体库管理 | ★★☆ | ✅ 高 | IndexedDB存储，File API访问 |
| 视频播放 | ★★☆ | ✅ 高 | HTML5 Video + HLS.js |
| 音频播放 | ★★☆ | ✅ 高 | Web Audio API |
| 原唱/伴唱切换 | ★★★ | ✅ 高 | 多音轨管理 |
| 音调调节 | ★★★★ | ✅ 中 | Web Audio API + SoundTouch.js |
| 播放速度调节 | ★★☆ | ✅ 高 | HTML5原生支持 |
| 歌词解析显示 | ★★☆ | ✅ 高 | 纯前端逻辑 |
| 过场音乐 | ★★☆ | ✅ 高 | Web Audio API |
| VAD人声检测 | ★★★★ | ⚠️ 中 | Web Audio API + 算法实现 |
| Ducking音量控制 | ★★★ | ✅ 高 | Web Audio API GainNode |
| 气氛组音效 | ★★☆ | ✅ 高 | AudioContext多实例 |
| MIDI控制 | ★★★ | ⚠️ 中 | Web MIDI API（需浏览器支持）|
| 音频路由 | ★★★★ | ❌ 低 | Web限制，无法实现 |
| 人声效果器链 | ★★★★★ | ✅ 中 | Web Audio API节点链 |
| 数据库存储 | ★☆☆ | ✅ 高 | IndexedDB |

### 2.2 功能优先级排序

**P0 - 核心必需功能**:
1. 媒体库管理（歌曲导入、分类、搜索）
2. 视频播放器
3. 原唱/伴唱切换
4. 播放速度调节
5. 歌词解析与显示
6. 播放队列管理

**P1 - 重要功能**:
1. 过场音乐播放
2. 气氛组音效
3. 音调调节（基础）
4. 简单的人声效果（混响）
5. 响应式布局适配

**P2 - 增强功能**:
1. VAD Ducking
2. MIDI控制
3. 高级音频效果器
4. PWA离线支持

**P3 - 可选功能**:
1. 云端同步
2. 社交分享
3. 直播推流集成

---

## 三、技术风险评估

### 3.1 高风险项

#### 3.1.1 音调调节 (Pitch Shifting)
- **风险**: 需要实时音频处理，性能要求高
- **方案**:
  - 方案A: 使用SoundTouch.js（WebAssembly版本）
  - 方案B: 使用Web Audio API的playbackRate + AudioWorklet
- **建议**: 使用SoundTouch.js，提供更好的音质

#### 3.1.2 文件访问
- **风险**: Web浏览器文件访问受限
- **现状分析**:
  - 可以使用File API读取用户选择的文件
  - 无法像桌面应用一样扫描文件夹
  - IndexedDB可存储文件引用
- **方案**: 提供文件拖拽上传和文件夹选择（Chrome支持）

### 3.2 中风险项

#### 3.2.1 多音轨同步
- **风险**: 原唱/伴唱切换需要精确同步
- **方案**: 使用单个视频/音频源 + 多轨道管理
- **建议**: 预加载所有音轨，切换时保持时间同步

#### 3.2.2 移动端兼容性
- **风险**: iOS Safari对Web Audio有特殊限制
- **方案**:
  - 用户交互后才初始化AudioContext
  - 使用标准的Web Audio API
  - 测试主流浏览器兼容性
- **建议**: 优先测试iOS Safari和Chrome Mobile

### 3.3 低风险项

| 项目 | 说明 |
|------|------|
| UI开发 | React + Tailwind CSS成熟稳定 |
| 数据存储 | IndexedDB广泛支持 |
| 视频播放 | HTML5 Video原生支持 |
| 响应式设计 | Tailwind响应式类完善 |

---

## 四、浏览器兼容性评估

### 4.1 最低要求

- **Chrome**: 90+
- **Safari**: 14+
- **Firefox**: 88+
- **Edge**: 90+
- **Mobile Safari**: iOS 14+
- **Chrome Mobile**: Android 8+

### 4.2 API支持情况

| API | Chrome | Safari | Firefox | 说明 |
|-----|--------|--------|---------|------|
| Web Audio API | ✅ | ✅ | ✅ | 核心功能 |
| IndexedDB | ✅ | ✅ | ✅ | 数据存储 |
| File API | ✅ | ✅ | ✅ | 文件访问 |
| Web MIDI API | ✅ | ⚠️ | ✅ | MIDI控制 |
| MediaRecorder | ✅ | ✅ | ✅ | 录音功能 |
| PWA | ✅ | ✅ | ✅ | 离线支持 |

### 4.3 移动端测试矩阵

| 设备类型 | 系统 | 浏览器 | 分辨率 |
|----------|------|--------|--------|
| iPhone | iOS 14+ | Safari | 375x667 ~ 430x932 |
| iPad | iPadOS 14+ | Safari | 768x1024 ~ 1024x1366 |
| Android手机 | Android 8+ | Chrome | 360x640 ~ 412x915 |
| Android平板 | Android 8+ | Chrome | 768x1024 ~ 1280x800 |

---

## 五、技术选型建议

### 5.1 推荐技术栈

```
┌─────────────────────────────────────────────────────────────┐
│                    RainKaraoke Web                           │
├─────────────────────────────────────────────────────────────┤
│  UI Framework: React 18 + TypeScript                        │
│  Styling: Tailwind CSS + Headless UI                        │
│  State Management: Zustand                                   │
│  Routing: React Router v6                                    │
├─────────────────────────────────────────────────────────────┤
│  Media Layer:                                                │
│  ├── Video: HTML5 Video + HLS.js (for streaming)            │
│  ├── Audio: Web Audio API                                    │
│  └── Effects: SoundTouch.js + AudioWorklet                  │
├─────────────────────────────────────────────────────────────┤
│  Data Layer:                                                 │
│  ├── Storage: IndexedDB (idb)                                │
│  └── Files: File API + File System Access API               │
├─────────────────────────────────────────────────────────────┤
│  Build Tools:                                                │
│  ├── Bundler: Vite                                           │
│  ├── Linting: ESLint + Prettier                              │
│  └── Testing: Vitest + Playwright                            │
├─────────────────────────────────────────────────────────────┤
│  PWA:                                                        │
│  ├── Service Worker                                          │
│  ├── Manifest                                                │
│  └── Offline Support                                         │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 关键依赖库

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "zustand": "^4.5.0",
    "idb": "^8.0.0",
    "soundtouch.js": "^2.0.0",
    "hls.js": "^1.5.0"
  },
  "devDependencies": {
    "vite": "^5.1.0",
    "typescript": "^5.3.0",
    "tailwindcss": "^3.4.0",
    "@headlessui/react": "^1.7.0",
    "@heroicons/react": "^2.1.0"
  }
}
```

---

## 六、资源评估

### 6.1 时间评估

| 阶段 | 工期 | 里程碑 |
|------|------|--------|
| 第一阶段 | 1周 | 基础框架 + 媒体库 + 播放器 |
| 第二阶段 | 1周 | 原唱伴唱切换 + 歌词显示 + 队列管理 |
| 第三阶段 | 1周 | 过场音乐 + 气氛组 + 音调调节 |
| 第四阶段 | 1周 | 效果器 + 响应式适配 + PWA |
| **总计** | **4周** | 完整版本发布 |

---

## 七、结论与建议

### 7.1 可行性结论

**总体评估: 高度可行**

RainKaraoke的核心功能在Web平台上有良好的支持：
1. Web Audio API提供了强大的音频处理能力
2. IndexedDB提供本地数据存储
3. 响应式设计可适配多设备

主要限制：
1. 文件系统访问受限（需用户主动选择）
2. 音频路由功能无法实现
3. 部分高级功能需要用户交互才能初始化

### 7.2 建议策略

1. **渐进式Web应用(PWA)**: 提供类原生应用体验
2. **移动优先设计**: 先保证移动端体验，再优化PC端
3. **离线支持**: 缓存关键资源，支持离线播放已导入歌曲
4. **性能优化**: 懒加载、代码分割、音频预加载

### 7.3 下一步行动

1. 创建项目框架
2. 实现核心播放功能
3. 适配移动端布局
4. 测试主流浏览器兼容性
