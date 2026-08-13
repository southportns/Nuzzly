"use client";

import CssFrame from "./css-frame";

interface CoverProps {
residentId: string;
}

export default function Cover({ residentId }: CoverProps) {
return (<CssFrame>
<div className="w-full h-full relative overflow-hidden">
<img
src="/resident-book/cover.png"
alt="Nuzzly Town Cover"
className="absolute inset-0 h-full w-full object-contain"
style={{ padding: "2px" }}
/>
{/* */}
<div className="absolute bottom-[calc(6%+20px)] left-1/2" style={{ transform: "translateX(-50%)" }}>
<div
className="flex items-center gap-2"
style={{
border: "none",
borderRadius: "9999px",
background: "rgba(245, 150, 98, 0.5)",
backdropFilter: "blur(8px)",
WebkitBackdropFilter: "blur(8px)",
padding: "4px 12px",
width: "auto",
minWidth: "460px",
maxWidth: "90%",
height: "35px",
boxSizing: "border-box",
}}
>
<img
src="/resident-book/paw.png"
alt=""
className="w-5 h-5 object-contain shrink-0"
/>
<span
className="text-sm sm:text-base font-bold tracking-wider shrink-0"
style={{ color: "#8B5E46", fontFamily: "'Fredoka','Noto Sans SC', sans-serif" }}
>:
</span>
<span
className="text-sm sm:text-base font-bold tracking-wider flex-1 flex items-center gap-1"
style={{
color: "#8B5E46",
fontFamily: "'Quicksand','Varela Round', sans-serif",
border: "none",
borderRadius: "9999px",
background: "#feeede",
padding: "2px 12px",
marginRight: "-12px",
}}
>
<span className="flex-1 text-center">{residentId}</span>
<img
src="/resident-book/paw.png"
alt=""
className="w-5 h-5 object-contain shrink-0"
/>
</span>
</div>
</div>
</div>
</CssFrame>);
}
