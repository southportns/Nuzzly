# Nuzzly 代码图谱

## 项目架构概览

```mermaid
graph TB
    subgraph "🌐 Web应用层"
        APP[web/app<br/>Next.js路由]
        COMPONENTS[web/components<br/>React组件]
    end

    subgraph "⚡ 核心逻辑层"
        LIB[web/lib<br/>核心库]
        HOOKS[web/hooks<br/>React Hooks]
        TIMELINE[web/lib/timeline<br/>时间线分析引擎]
    end

    subgraph "🔗 数据层"
        SUPABASE[web/lib/supabase<br/>Supabase客户端]
        GATEWAY[web/lib/gateway<br/>写入网关]
        VECTORDDB[web/lib/vectordb<br/>向量数据库]
    end

    subgraph "📱 移动端"
        IOS[ios-app-frontend<br/>Vue.js iOS应用]
    end

    APP --> LIB
    APP --> COMPONENTS
    COMPONENTS --> LIB
    COMPONENTS --> HOOKS
    LIB --> SUPABASE
    LIB --> TIMELINE
    LIB --> GATEWAY
    TIMELINE --> SUPABASE
    IOS --> SUPABASE
```

## 核心模块调用关系

```mermaid
graph LR
    subgraph "热点函数 (高调用)"
        CREATE_CLIENT[createClient<br/>144次调用]
        GET_USER[getUser<br/>46次调用]
        SUBMIT[submit<br/>36次调用]
        ROUND[round<br/>39次调用]
    end

    subgraph "时间线分析引擎"
        CAUSAL[performCausalAnalysis]
        BOOTSTRAP[performBootstrapTest]
        REPLAY[executeReplay]
        ENRICH[enrichWithTimelineScores]
    end

    CAUSAL --> ROUND
    CAUSAL --> BOOTSTRAP
    BOOTSTRAP --> ROUND
    REPLAY --> CAUSAL
    ENRICH --> CAUSAL

    CREATE_CLIENT --> GET_USER
    SUBMIT --> CREATE_CLIENT
```

## 包依赖关系

```mermaid
graph LR
    APP[app<br/>fan-in: 4, fan-out: 282]
    COMPONENTS[components<br/>仅出站调用]
    LIB[lib<br/>fan-in: 416, fan-out: 4]
    HOOKS[hooks<br/>fan-in: 19, fan-out: 0]
    SRC[src<br/>fan-in: 22, fan-out: 8]

    APP --> LIB
    APP --> HOOKS
    APP --> SRC
    COMPONENTS --> LIB
    COMPONENTS --> HOOKS
    COMPONENTS --> SRC
    COMPONENTS --> APP
    LIB --> SRC
    SRC --> VITE[vite]
```

## 代码统计

| 指标 | 数值 |
|------|------|
| 总节点数 | 3,074 |
| 总边数 | 7,340 |
| 函数 | 1,051 |
| 变量 | 445 |
| 文件 | 372 |
| 模块 | 370 |
| 接口 | 231 |
| TypeScript文件 | 278 |
| Vue文件 | 35 |

## 主要入口点

- **useAuth** - 认证管理
- **usePets** - 宠物数据管理
- **useDailyTasks** - 每日任务
- **useHealthRecords** - 健康记录
- **useNotifications** - 通知系统
- **createClient** - Supabase客户端创建

## 技术栈

- **前端**: Next.js (Web), Vue.js (iOS)
- **数据库**: Supabase (PostgreSQL)
- **类型**: TypeScript, JavaScript
- **UI组件**: React, Vue
