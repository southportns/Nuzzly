"use client";

interface CssFrameProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * 牛皮纸材质三维边框
 * - 保留 frame.png 暖橙色调
 * - 牛皮纸纤维纹理 + 褶皱颗粒感
 * - 内嵌白色虚线缝线（融入橘色框内）
 * - 立体高光与阴影
 */
export default function CssFrame({ children, className = "" }: CssFrameProps) {
  return (
    <div className={`relative w-full h-full ${className}`} style={{ borderRadius: "1.5rem" }}>
      {/* 外层立体边框：暖橙牛皮纸底色 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius: "1.5rem",
          background: `
            linear-gradient(
              145deg,
              #ffcbb0 0%,
              #ffaa7d 15%,
              #ff9a6c 35%,
              #f58a5a 50%,
              #ff9a6c 65%,
              #ffb08a 85%,
              #ffaa7d 100%
            )
          `,
          boxShadow: `
            inset 1px 1px 2px rgba(255, 255, 255, 0.55),
            inset -2px -3px 5px rgba(100, 45, 20, 0.22),
            4px 6px 18px rgba(120, 55, 25, 0.2),
            0 2px 4px rgba(0, 0, 0, 0.08)
          `,
        }}
      />

      {/* 牛皮纸纹理：纤维 + 颗粒 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius: "1.5rem",
          background: `
            radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.12) 0%, transparent 2%),
            radial-gradient(circle at 70% 60%, rgba(255, 255, 255, 0.08) 0%, transparent 2%),
            radial-gradient(circle at 40% 80%, rgba(120, 60, 30, 0.06) 0%, transparent 2%),
            radial-gradient(circle at 85% 20%, rgba(120, 60, 30, 0.05) 0%, transparent 2%),
            repeating-linear-gradient(
              90deg,
              transparent 0px,
              rgba(255, 255, 255, 0.04) 1px,
              transparent 2px,
              transparent 6px
            ),
            repeating-linear-gradient(
              0deg,
              transparent 0px,
              rgba(120, 60, 30, 0.03) 1px,
              transparent 2px,
              transparent 8px
            ),
            repeating-linear-gradient(
              45deg,
              transparent 0px,
              rgba(255, 255, 255, 0.02) 1px,
              transparent 2px,
              transparent 10px
            )
          `,
          opacity: 0.85,
        }}
      />

      {/* 内层倒角阴影：增强三维感 */}
      <div
        className="absolute pointer-events-none"
        style={{
          inset: "10px",
          borderRadius: "calc(1.5rem - 8px)",
          boxShadow: `
            inset 0 2px 4px rgba(100, 45, 20, 0.18),
            inset 0 -1px 2px rgba(255, 255, 255, 0.25)
          `,
        }}
      />

      {/* 内嵌白色虚线缝线：融入橘色框内 */}
      <div
        className="absolute pointer-events-none"
        style={{
          inset: "14px",
          borderRadius: "calc(1.5rem - 10px)",
          border: "2px dashed rgba(255, 248, 240, 0.78)",
          boxShadow: "0 1px 2px rgba(100, 45, 20, 0.25)",
        }}
      />

      {/* 内部内容区：inset 从 16px 加大到 21px，让边框宽度变为 130% */}
      <div
        className="absolute overflow-hidden"
        style={{
          inset: "21px",
          borderRadius: "calc(1.5rem - 12px)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
