"use client";

import { useState, type MouseEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import Cover from "./cover";
import PageInfo from "./page-info";
import PageGrowth from "./page-growth";
import PageHealth from "./page-health";
import type { ResidentBookData } from "./types";

const TOTAL_PAGES = 4;

// 单页翻转变体：旧页翻走到背面消失，新页从背面翻入渐显
const pageVariants = {
  enter: (dir: number) => ({
    rotateX: dir > 0 ? -180 : 180,
    opacity: 0,
  }),
  center: { rotateX: 0, opacity: 1 },
  exit: (dir: number) => ({
    rotateX: dir > 0 ? 180 : -180,
    opacity: 0,
  }),
};

interface ResidentBookProps {
  data: ResidentBookData;
}

export default function ResidentBook({ data }: ResidentBookProps) {
  const [page, setPage] = useState(0);
  // 翻页方向：1 = 向前翻到下一页，-1 = 向后翻到上一页
  const [direction, setDirection] = useState(0);
  // 动画进行中锁定交互，避免打断 exit 动画
  const [animating, setAnimating] = useState(false);

  const goTo = (target: number) => {
    if (animating) return;
    if (target < 0 || target >= TOTAL_PAGES || target === page) return;
    setDirection(target > page ? 1 : -1);
    setAnimating(true);
    setPage(target);
  };

  // 点击翻页：左半部分上翻，右半部分下翻
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
        return <PageHealth health={data.health} />;
      default:
        return null;
    }
  };

  return (
    <div
      className="relative perspective-[2000px] w-full cursor-pointer select-none"
      style={{ aspectRatio: "16 / 9" }}
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
          <div className="absolute inset-0 bg-white rounded-2xl overflow-hidden">
            {renderPage()}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
