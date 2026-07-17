"use client";

import type { ResidentInfo, FamilyMember } from "./types";
import CssFrame from "./css-frame";

interface PageInfoProps {
  info: ResidentInfo;
  residentId: string;
  family: FamilyMember[];
}

const genderSymbol: Record<string, string> = {
  male: "弟弟",
  female: "妹妹",
  other: "",
};

const genderText: Record<string, string> = {
  male: "",
  female: "",
  other: "",
};

// 标签渐变色（封面页暖橙配色）
const tagGradients = [
  "linear-gradient(135deg,#f59662,#e8784a)",
  "linear-gradient(135deg,#ffb84d,#ff9a1a)",
  "linear-gradient(135deg,#d4a574,#b8864a)",
  "linear-gradient(135deg,#feeede,#f5d4b8)",
];

export default function PageInfo({ info, residentId, family }: PageInfoProps) {
  const owner = family.find((m) => m.role === "owner");
  const members = family.filter((m) => m.role === "member");

  return (
    <CssFrame>
      <div
        className="w-full h-full flex flex-col relative overflow-hidden"
        style={{
          background: "#FFF7ED",
          fontFamily: "'Nunito', sans-serif",
        }}
      >

      {/* 户主区域 - flex:1.2 (约40%高度) */}
      {owner && (
        <div
          className="flex items-center justify-center relative overflow-hidden"
          style={{
            flex: 1.2,
            background: "url(/resident-book/hukoubu2.png) center/98% no-repeat",
            padding: "1rem 1.5rem",
            height: "180px",
            minHeight: "180px",
            maxHeight: "180px",
            width: "817px",
            left: "-8px",
          }}
        >
          {/* 装饰气泡 - 对应 CSS ::before */}
          <div
            className="absolute rounded-full"
            style={{
              width: "140px",
              height: "140px",
              background: "radial-gradient(circle,rgba(245,150,98,0.25) 0%,transparent 70%)",
              top: "-40px",
              right: "-30px",
              animation: "float 6s ease-in-out infinite",
            }}
          />
          {/* 装饰气泡 - 对应 CSS ::after */}
          <div
            className="absolute rounded-full"
            style={{
              width: "100px",
              height: "100px",
              background: "radial-gradient(circle,rgba(255,184,77,0.25) 0%,transparent 70%)",
              bottom: "-25px",
              left: "15%",
              animation: "float 8s ease-in-out infinite reverse",
            }}
          />

          {/* 装饰点 1 */}
          <div
            className="absolute rounded-full"
            style={{
              width: "12px",
              height: "12px",
              background: "#f59662",
              opacity: 0.3,
              top: "20%",
              left: "10%",
              animation: "twinkle 3s ease-in-out infinite",
              animationDelay: "0s",
            }}
          />
          {/* 装饰点 2 */}
          <div
            className="absolute rounded-full"
            style={{
              width: "8px",
              height: "8px",
              background: "#ffb84d",
              opacity: 0.3,
              top: "30%",
              right: "15%",
              animation: "twinkle 3s ease-in-out infinite",
              animationDelay: "1s",
            }}
          />
          {/* 装饰点 3 */}
          <div
            className="absolute rounded-full"
            style={{
              width: "10px",
              height: "10px",
              background: "#d4a574",
              opacity: 0.3,
              bottom: "25%",
              right: "25%",
              animation: "twinkle 3s ease-in-out infinite",
              animationDelay: "2s",
            }}
          />

          {/* 户主信息背景框 */}
          <div
            className="relative flex items-center z-[1]"
            style={{
              background: "linear-gradient(90deg, rgba(202, 102, 49, 0.8), rgba(255, 255, 255, 0.6))",
              borderRadius: "66px",
              padding: "0.8rem 1.2rem",
              boxShadow: "0px 4px 8px 0px #f99e48",
            }}
          >
            {/* 头像 - 左侧 */}
            <div
              className="z-10 flex items-center justify-center rounded-full shrink-0"
            style={{
              width: "110px",
              height: "110px",
              background: "linear-gradient(135deg,#f59662,#ffb84d)",
              border: "4px solid #fff",
              boxShadow: "0 6px 20px rgba(245,150,98,0.3),0 0 0 4px rgba(255,255,255,0.5)",
              fontSize: "2.8rem",
              marginRight: "1.2rem",
              transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)",
              position: "static",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.08) rotate(-5deg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "";
            }}
          >
            {owner.avatarUrl ? (
              <img
                src={owner.avatarUrl}
                alt={owner.nickname}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <span>🐱</span>
            )}
          </div>

          {/* 信息 - 右侧 */}
          <div className="flex flex-col items-start text-left z-10" style={{ left: "-64px", top: "8px", width: "313px", height: "111px", position: "static" }}>
            {/* 名字 */}
            <div
              style={{
                fontSize: "1.5rem",
                fontWeight: 800,
                color: "rgb(249, 249, 248)",
                marginBottom: "0.3rem",
                letterSpacing: "0.5px",
              }}
            >
              {owner.nickname}
            </div>

            {/* 元信息 */}
            <div
              className="flex items-center"
              style={{
                gap: "0.5rem",
                marginBottom: "0.6rem",
                fontSize: "0.8rem",
                color: "#8B5E46",
              }}
            >
              {owner.gender && (
                <span
                  style={{
                    background: "#feeede",
                    padding: "0.2rem 0.7rem",
                    borderRadius: "999px",
                    backdropFilter: "blur(4px)",
                    boxShadow: "0 2px 8px rgba(245,150,98,0.1)",
                  }}
                >
                  {genderSymbol[owner.gender]}
                </span>
              )}
              {owner.age && (
                <span
                  style={{
                    background: "#feeede",
                    padding: "0.2rem 0.7rem",
                    borderRadius: "999px",
                    backdropFilter: "blur(4px)",
                    boxShadow: "0 2px 8px rgba(245,150,98,0.1)",
                  }}
                >
                  {owner.age}岁
                </span>
              )}
              <span
                style={{
                  background: "#feeede",
                  padding: "0.2rem 0.7rem",
                  borderRadius: "999px",
                  backdropFilter: "blur(4px)",
                  boxShadow: "0 2px 8px rgba(245,150,98,0.1)",
                }}
              >
                👑 户主
              </span>
            </div>

            {/* 性格标签 */}
            {owner.personalityTags.length > 0 && (
              <div
                className="flex flex-wrap"
                style={{ gap: "0.5rem" }}
              >
                {owner.personalityTags.map((tag, i) => (
                  <span
                    key={i}
                    style={{
                      padding: "0.25rem 0.75rem",
                      borderRadius: "999px",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: i === 3 ? "#8B5E46" : "#fff",
                      background: tagGradients[i % tagGradients.length],
                      boxShadow: "0 2px 8px rgba(245,150,98,0.2)",
                      transition: "transform 0.2s ease",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "";
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          </div>
        </div>
      )}

      {/* 成员区域 - flex:1.8 (约60%高度) */}
      <div
        className="relative"
        style={{
          flex: 1.8,
          padding: "1rem 1.5rem",
          overflowY: "auto",
          background: "#FFF7ED",
        }}
      >
        {/* 区域标题 */}
        <div
          className="flex items-center"
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "#8B5E46",
            textTransform: "uppercase",
            letterSpacing: "1.5px",
            marginBottom: "0.6rem",
            paddingLeft: "0.5rem",
            gap: "0.5rem",
          }}
        >
          <span style={{ fontSize: "0.9rem" }}>🐾</span>
          <span>家庭成员 · Family Members</span>
          <div
            className="flex-1"
            style={{
              height: "2px",
              background: "linear-gradient(90deg,#feeede,transparent)",
              borderRadius: "2px",
            }}
          />
        </div>

        {/* 表头 */}
        <div
          className="flex items-center"
          style={{
            padding: "0.6rem 1rem",
            gap: "0.5rem",
            borderRadius: "1rem",
            marginBottom: "0.4rem",
            fontSize: "0.65rem",
            fontWeight: 700,
            color: "#8B5E46",
            textTransform: "uppercase",
            letterSpacing: "0.8px",
            paddingBottom: "0.4rem",
          }}
        >
          <div style={{ width: "36px", flexShrink: 0 }} />
          <div
            className="flex flex-col"
            style={{
              flex: 1.5,
              fontWeight: 700,
              fontSize: "0.78rem",
              color: "#8B5E46",
            }}
          >
            名字
          </div>
          <div
            style={{
              flex: 0.7,
              fontSize: "0.78rem",
              color: "#8B5E46",
              textAlign: "center",
              fontWeight: 500,
            }}
          >
            年龄
          </div>
          <div
            style={{
              flex: 0.6,
              fontSize: "0.78rem",
              color: "#8B5E46",
              textAlign: "center",
              fontWeight: 500,
            }}
          >
            性别
          </div>
          <div
            style={{
              flex: 1.2,
              fontSize: "0.78rem",
              color: "#8B5E46",
              textAlign: "center",
              fontWeight: 500,
            }}
          >
            生日
          </div>
          <div
            style={{
              flex: 1,
              fontSize: "0.78rem",
              color: "#8B5E46",
              textAlign: "center",
              fontWeight: 500,
            }}
          >
            入住
          </div>
          <div
            style={{
              flex: 3,
              fontSize: "0.78rem",
              color: "#8B5E46",
              textAlign: "center",
              fontWeight: 500,
              wordBreak: "break-all",
            }}
          >
            宠物编码
          </div>
        </div>

        {/* 成员列表 */}
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center relative overflow-hidden"
            style={{
              padding: "0.6rem 1rem",
              gap: "0.5rem",
              borderRadius: "1rem",
              marginBottom: "0.4rem",
              background: "#fff",
              border: "2px solid #feeede",
              transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateX(4px) scale(1.01)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(245,150,98,0.2)";
              e.currentTarget.style.borderColor = "#f59662";
              const before = e.currentTarget.querySelector(".hover-bar") as HTMLElement;
              if (before) before.style.opacity = "1";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "";
              e.currentTarget.style.boxShadow = "";
              e.currentTarget.style.borderColor = "#feeede";
              const before = e.currentTarget.querySelector(".hover-bar") as HTMLElement;
              if (before) before.style.opacity = "0";
            }}
          >
            {/* 左侧渐变条（hover 时显示） */}
            <div
              className="hover-bar absolute left-0 top-0 bottom-0"
              style={{
                width: "4px",
                background: "linear-gradient(180deg,#f59662,#ffb84d)",
                opacity: 0,
                transition: "opacity 0.3s ease",
              }}
            />

            {/* 宠物图标 */}
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: "36px",
                height: "36px",
                background: "linear-gradient(135deg,#feeede,#fff5eb)",
                fontSize: "1.1rem",
                flexShrink: 0,
                border: "2px solid rgba(255,255,255,0.8)",
                boxShadow: "0 2px 8px rgba(245,150,98,0.1)",
              }}
            >
              {member.icon || "🐾"}
            </div>

            {/* 名字 + 品种 */}
            <div
              className="flex flex-col"
              style={{
                flex: 1.5,
                fontWeight: 700,
                fontSize: "0.78rem",
                color: "#8B5E46",
              }}
            >
              {member.nickname}
              <small
                style={{
                  fontSize: "0.65rem",
                  color: "#8B5E46",
                  fontWeight: 500,
                  marginTop: "1px",
                  opacity: 0.7,
                }}
              >
                {member.breed}
              </small>
            </div>

            {/* 年龄 */}
            <div
              style={{
                flex: 0.7,
                fontSize: "0.78rem",
                color: "#8B5E46",
                textAlign: "center",
                fontWeight: 500,
              }}
            >
              <span className="col-label" style={{ display: "none" }}>
                年龄
              </span>
              {member.ageText ?? "-"}
            </div>

            {/* 性别 */}
            <div
              style={{
                flex: 0.6,
                fontSize: "0.78rem",
                color: "#8B5E46",
                textAlign: "center",
                fontWeight: 500,
              }}
            >
              <span className="col-label" style={{ display: "none" }}>
                性别
              </span>
              {member.gender ? genderSymbol[member.gender] : "-"}
            </div>

            {/* 生日 */}
            <div
              style={{
                flex: 1.2,
                fontSize: "0.78rem",
                color: "#8B5E46",
                textAlign: "center",
                fontWeight: 500,
              }}
            >
              <span className="col-label" style={{ display: "none" }}>
                生日
              </span>
              {member.birthDate || "-"}
            </div>

            {/* 入住 */}
            <div
              style={{
                flex: 1,
                fontSize: "0.78rem",
                color: "#8B5E46",
                textAlign: "center",
                fontWeight: 500,
              }}
            >
              <span className="col-label" style={{ display: "none" }}>
                入住
              </span>
              {member.homeDate || "-"}
            </div>

            {/* 宠物编码 */}
            <div
              style={{
                flex: 3,
                fontSize: "0.78rem",
                color: "#8B5E46",
                textAlign: "center",
                fontWeight: 500,
                wordBreak: "break-all",
              }}
            >
              <span className="col-label" style={{ display: "none" }}>
                宠物编码
              </span>
              {member.petCode || "-"}
            </div>
          </div>
        ))}
      </div>

      {/* CSS 动画 */}
      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-10px) scale(1.05);
          }
        }
        @keyframes twinkle {
          0%,
          100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.2);
          }
        }

        /* 滚动条美化 */
        div::-webkit-scrollbar {
          width: 6px;
        }
        div::-webkit-scrollbar-track {
          background: transparent;
        }
        div::-webkit-scrollbar-thumb {
          background: #feeede;
          border-radius: 3px;
        }
        div::-webkit-scrollbar-thumb:hover {
          background: #f59662;
        }

        @media (max-width: 640px) {
          .col-label {
            display: inline !important;
            color: #9ca3af;
            font-size: 0.6rem;
            margin-right: 0.3rem;
          }
        }
      `}</style>
      </div>
    </CssFrame>
  );
}
