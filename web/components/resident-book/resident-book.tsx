"use client";

import { useState, type MouseEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import Cover from "./cover";
import PageInfo from "./page-info";
import PageGrowth from "./page-growth";
import PageHealth from "./page-health";
import type { ResidentBookData } from "./types";

const TOTAL_PAGES = 4;

// 单页翻转变体:旧页翻走to 背面消失,new 页from 背面翻 渐显
const pageVariants = {
enter: (dir: number) => ({
rotateX: dir > 0? -180: 180,
opacity: 0,
}),
center: { rotateX: 0, opacity: 1 },
exit: (dir: number) => ({
rotateX: dir > 0? 180: -180,
opacity: 0,
}),
};

interface ResidentBookProps {
data: ResidentBookData;
}

export default function ResidentBook({ data }: ResidentBookProps) {
const [page, setPage] = useState(0);
// 翻页方to:1 = to 翻to Next,-1 = to after 翻to Previous
const [direction, setDirection] = useState(0);
// 动画Ongoing锁定交互,避免打断 exit 动画
const [animating, setAnimating] = useState(false);
// many 宠Select
const [selectedPetId, setSelectedPetId] = useState<string | undefined>(data.pets?.[0]?.id);
// 翻转Notice:仅 封面页显示,User翻页 after 永久隐藏
const [showHint, setShowHint] = useState(true);

const goTo = (target: number) => {
if (animating) return;
if (target < 0 || target >= TOTAL_PAGES || target === page) return;
setDirection(target > page? 1: -1);
setAnimating(true);
setPage(target);
// Success翻页 after 隐藏翻转Notice
setShowHint(false);
};

// Click to翻页:左半some 翻,右半some 翻
const handleClick = (e: MouseEvent<HTMLDivElement>) => {
if (animating) return;
const rect = e.currentTarget.getBoundingClientRect();
const x = e.clientX - rect.left;
if (x < rect.width / 2) {
goTo(page - 1);
} else {
goTo(page + 1);
}
};

const renderPage = () => {
switch (page) {
case 0:
return <Cover residentId={data.residentId} />;
case 1:
return <PageInfo info={data.info} residentId={data.residentId} family={data.family} />;
case 2:
return <PageGrowth growth={data.growth} />;
case 3:
return (<PageHealth
health={data.health}
pets={data.pets}
selectedPetId={selectedPetId}
onPetSelect={setSelectedPetId}
/>);
default:
return null;
}
};

return (<div
className="relative perspective-[2000px] w-full cursor-pointer select-none"
style={{ aspectRatio: "16 / 9", transform: "scale(0.972)", transformOrigin: "top right" }}
onClick={handleClick}
>
<AnimatePresence
mode="sync"
custom={direction}
onExitComplete={() => setAnimating(false)}
initial={false}
>
<motion.div
key={page}
custom={direction}
variants={pageVariants}
initial="enter"
animate="center"
exit="exit"
transition={{ duration: 0.8, ease: [0.65, 0, 0.35, 1] }}
style={{
transformOrigin: "center center",
position: "absolute",
inset: 0,
zIndex: 10,
}}
>
<div className="absolute inset-0 rounded-2xl overflow-hidden" style={{ background: "#FFF7ED" }}>
{renderPage()}
</div>
</motion.div>
</AnimatePresence>

{/* Notice ——, after Now */}
{showHint && page === 0 && (<motion.div
key="hint-left"
initial={{ opacity: 0 }}
animate={{ opacity: [0, 0.85, 0] }}
transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.3 }}
style={{ zIndex: 50 }}
className="pointer-events-none absolute left-0 top-0 flex h-full w-1/2 items-center justify-center"
>
<div className="flex flex-col items-center gap-3">
<svg width="56" height="56" viewBox="0 0 24 24" fill="none" style={{ transform: "rotate(-90deg)" }}>
<path d="M9 6l6 6-6 6" stroke="rgba(255,122,89,0.8)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
</svg>
<span className="rounded-full bg-black/50 px-5 py-2 text-[20px] font-semibold text-white backdrop-blur-sm">
Click to
</span>
</div>
</motion.div>)}
{showHint && page === 0 && (<motion.div
key="hint-right"
initial={{ opacity: 0 }}
animate={{ opacity: [0, 0.85, 0] }}
transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.3, delay: 0.4 }}
style={{ zIndex: 50 }}
className="pointer-events-none absolute right-0 top-0 flex h-full w-1/2 items-center justify-center"
>
<div className="flex flex-col items-center gap-3">
<svg width="56" height="56" viewBox="0 0 24 24" fill="none" style={{ transform: "rotate(90deg)" }}>
<path d="M9 6l6 6-6 6" stroke="rgba(255,122,89,0.8)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
</svg>
<span className="rounded-full bg-black/50 px-5 py-2 text-[20px] font-semibold text-white backdrop-blur-sm">
Click to
</span>
</div>
</motion.div>)}
</div>);
}
