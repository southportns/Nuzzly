"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ResidentInfo, FamilyMember } from "./types";
import CssFrame from "./css-frame";

interface PageInfoProps {
info: ResidentInfo;
residentId: string;
family: FamilyMember[];
}

const genderSymbol: Record<string, string> = {
male: "",
female: "",
other: "",
};

const genderText: Record<string, string> = {
male: "",
female: "",
other: "",
};

// Tag渐变色(封面页暖橙配色)
const tagGradients = [
"linear-gradient(135deg,#f59662,#e8784a)",
"linear-gradient(135deg,#ffb84d,#ff9a1a)",
"linear-gradient(135deg,#d4a574,#b8864a)",
"linear-gradient(135deg,#feeede,#f5d4b8)",
];

export default function PageInfo({ info, residentId, family }: PageInfoProps) {
const [owner, setOwner] = useState(family.find((m) => m.role === "owner"));
const members = family.filter((m) => m.role === "member");

// 客户端按need to拉取and 覆盖户主profile(if果 profileId canuse)——do notusedwhen auth user 来覆盖isView 户主
useEffect(() => {
const fetchOwner = async () => {
try {
if (!owner ||!owner.profileId) return;
const supabase = createClient();
const { data: profile } = await supabase.from("profiles").select("username, display_name, avatar_url").eq("id", owner.profileId).single();
if (profile) {
setOwner((prev) => prev? {...prev,
// and Community,侧边栏保持a致:优先used username,notSettings时回退to display_name
nickname: (profile.username?? profile.display_name)?? prev.nickname,
avatarUrl: profile.avatar_url?? prev.avatarUrl,
}: prev);
}
} catch (e) {
// 静默failed,used props Data
}
};
fetchOwner();
}, [owner?.profileId]);

return (<CssFrame>
<div
className="w-full h-full flex flex-col relative overflow-hidden"
style={{
background: "#FFF7ED",
fontFamily: "'Nunito', sans-serif",
}}
>

{/* - flex:1.2 (40%high) */}
{owner && (<div
className="flex items-center justify-center relative overflow-hidden"
style={{
flex: 1.2,
background: "url(/resident-book/hukoubu2.png) center/98% no-repeat",
padding: "1rem 1.5rem",
height: "148px",
minHeight: "148px",
maxHeight: "148px",
width: "1090px",
left: "-11px",
}}
>
{/* - for should CSS::before */}
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
{/* - for should CSS::after */}
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

{/* 1 */}
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
{/* 2 */}
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
{/* 3 */}
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

{/* */}
<div
className="relative flex items-center z-[1]"
style={{
background: "linear-gradient(90deg, rgba(202, 102, 49, 0.8), rgba(255, 255, 255, 0.6))",
borderRadius: "66px",
padding: "0.8rem 1.2rem",
boxShadow: "0px 4px 8px 0px #f99e48",
}}
>
{/* Avatar - Left side */}
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
{owner.avatarUrl? (<img
src={owner.avatarUrl}
alt={owner.nickname}
className="w-full h-full object-cover rounded-full"
/>): (<span>🐱</span>)}
</div>

{/* - Right side */}
<div className="flex flex-col items-start text-left z-10" style={{ left: "-64px", top: "8px", width: "313px", height: "111px", position: "static" }}>
{/* Name */}
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

{/* SGD */}
<div
className="flex items-center"
style={{
gap: "0.5rem",
marginBottom: "0.6rem",
fontSize: "0.8rem",
color: "#8B5E46",
}}
>
{owner.gender && (<span
style={{
background: "#feeede",
padding: "0.2rem 0.7rem",
borderRadius: "999px",
backdropFilter: "blur(4px)",
boxShadow: "0 2px 8px rgba(245,150,98,0.1)",
}}
>
{genderSymbol[owner.gender]}
</span>)}
{owner.age && (<span
style={{
background: "#feeede",
padding: "0.2rem 0.7rem",
borderRadius: "999px",
backdropFilter: "blur(4px)",
boxShadow: "0 2px 8px rgba(245,150,98,0.1)",
}}
>
{owner.age}years old
</span>)}
<span
style={{
background: "#feeede",
padding: "0.2rem 0.7rem",
borderRadius: "999px",
backdropFilter: "blur(4px)",
boxShadow: "0 2px 8px rgba(245,150,98,0.1)",
}}
>
👑
</span>
</div>

{/* Tag */}
{owner.personalityTags.length > 0 && (<div
className="flex flex-wrap"
style={{ gap: "0.5rem" }}
>
{owner.personalityTags.map((tag, i) => (<span
key={i}
style={{
padding: "0.25rem 0.75rem",
borderRadius: "999px",
fontSize: "0.72rem",
fontWeight: 700,
color: i === 3? "#8B5E46": "#fff",
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
</span>))}
</div>)}
</div>
</div>
</div>)}

{/* members - flex:1.8 (60%high) */}
<div
className="relative"
style={{
flex: 1.8,
padding: "1rem 1.5rem",
overflowY: "auto",
background: "#FFF7ED",
}}
>
{/* title */}
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
<span>Householdmembers · Family Members</span>
<div
className="flex-1"
style={{
height: "2px",
background: "linear-gradient(90deg,#feeede,transparent)",
borderRadius: "2px",
}}
/>
</div>

{/* */}
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
Name
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
Age
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
Gender
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
Birthday
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
Pet
</div>
</div>

{/* members */}
{members.map((member) => (<div
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
{/* Left side (hover) */}
<div
className="hover-bar absolute left-0 top-0 bottom-0"
style={{
width: "4px",
background: "linear-gradient(180deg,#f59662,#ffb84d)",
opacity: 0,
transition: "opacity 0.3s ease",
}}
/>

{/* Pet */}
<div
className="flex items-center justify-center rounded-full overflow-hidden"
style={{
width: "36px",
height: "36px",
background: member.avatarUrl? "transparent": "linear-gradient(135deg,#feeede,#fff5eb)",
flexShrink: 0,
border: "2px solid rgba(255,255,255,0.8)",
boxShadow: "0 2px 8px rgba(245,150,98,0.1)",
}}
>
{member.avatarUrl? (<img src={member.avatarUrl} alt={member.nickname} className="w-full h-full object-cover" />): (<span style={{ fontSize: "1.1rem" }}>{member.icon || "🐾"}</span>)}
</div>

{/* Name + Breed */}
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

{/* Age */}
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
Age
</span>
{member.ageText?? "-"}
</div>

{/* Gender */}
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
Gender
</span>
{member.gender? genderSymbol[member.gender]: "-"}
</div>

{/* Birthday */}
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
Birthday
</span>
{member.birthDate || "-"}
</div>

{/* */}
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

</span>
{member.homeDate || "-"}
</div>

{/* Pet */}
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
Pet
</span>
{member.petCode || "-"}
</div>
</div>))}
</div>

{/* CSS */}
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

/* 滚动 美化 */
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

@media (max-width: 640px) {.col-label {
display: inline!important;
color: #9ca3af;
font-size: 0.6rem;
margin-right: 0.3rem;
}
}
`}</style>
</div>
</CssFrame>);
}
