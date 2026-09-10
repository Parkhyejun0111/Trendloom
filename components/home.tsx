"use client";

import { useRef, useState } from "react";
import { IconBoard, IconPlan, IconTagger } from "./icons";
import type { ToolId } from "./bottom-nav";

const FEATURES: {
  id: ToolId;
  label: string;
  desc: string;
  Icon: typeof IconBoard;
  card: string;
  /** card-lime(이제 네이비)처럼 어두운 카드는 글자를 흰색으로 바꿔야 읽힌다 */
  dark?: boolean;
}[] = [
  {
    id: "board",
    label: "스타일 보드",
    desc: "레퍼런스를 모아 놓고 시즌 팔레트와 실루엣을 뽑아내기",
    Icon: IconBoard,
    card: "card-lime",
    dark: true,
  },
  {
    id: "plan",
    label: "발주 · 가격",
    desc: "발주량과 판매가를 잡고 판매율·재고·영업이익까지 시뮬레이션",
    Icon: IconPlan,
    card: "card-pink",
  },
  {
    id: "tagger",
    label: "상품 태거",
    desc: "이미지 한 장으로 속성 태깅 · 커머스 카피",
    Icon: IconTagger,
    card: "card-mint",
  },
];

/** 스택 깊이별 사선 오프셋 — 뒤로 갈수록 오른쪽 위로 살짝씩 어긋나며 부채처럼 펼쳐진다.
    y 는 헤드라인 텍스트를 가리지 않도록 전체적으로 아래쪽에 기준을 둔다 */
const STACK_STYLE = [
  { x: 0, y: 30, rotate: -4 },
  { x: 20, y: 18, rotate: 6 },
  { x: 40, y: 6, rotate: 15 },
];

const SWIPE_THRESHOLD = 90;
const EXIT_MS = 280;

export function Home({ onNavigate }: { onNavigate: (id: ToolId) => void }) {
  const [order, setOrder] = useState([0, 1, 2]);
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const [exitingId, setExitingId] = useState<ToolId | null>(null);
  const dragState = useRef<{ startX: number; startY: number; dragging: boolean } | null>(null);

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    dragState.current = { startX: e.clientX, startY: e.clientY, dragging: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const s = dragState.current;
    if (!s) return;
    const x = e.clientX - s.startX;
    const y = e.clientY - s.startY;
    if (Math.abs(x) > 4 || Math.abs(y) > 4) s.dragging = true;
    setDrag({ x, y, active: true });
  }

  function onPointerUp(id: ToolId) {
    return () => {
      const s = dragState.current;
      dragState.current = null;
      const wasDragging = s?.dragging;
      const dist = Math.hypot(drag.x, drag.y);

      if (!wasDragging) {
        setDrag({ x: 0, y: 0, active: false });
        onNavigate(id);
        return;
      }

      if (dist > SWIPE_THRESHOLD) {
        // 드래그를 놓자마자 왼쪽 밖으로 완전히 날려 보낸 뒤, 다 나가면 맨 뒤로 재배치한다
        setDrag({ x: 0, y: 0, active: false });
        setExitingId(id);
        setTimeout(() => {
          setOrder((prev) => [...prev.slice(1), prev[0]]);
          setExitingId(null);
        }, EXIT_MS);
      } else {
        setDrag({ x: 0, y: 0, active: false });
      }
    };
  }

  return (
    <div className="hero-gradient fade-up -mx-5 flex min-h-[560px] flex-col justify-center px-5 py-10">
      <div className="relative mx-auto" style={{ width: "82%", height: 350 }}>
        {order.map((featureIndex, depth) => {
          const f = FEATURES[featureIndex];
          const pos = STACK_STYLE[depth];
          const isFront = depth === 0;
          const isExiting = exitingId === f.id;
          const isDraggingThis = isFront && drag.active && !isExiting;

          let tx = pos.x;
          let ty = pos.y;
          let rot = pos.rotate;
          if (isDraggingThis) {
            tx += drag.x;
            ty += drag.y;
            rot += drag.x / 12;
          } else if (isExiting) {
            tx = -520;
            ty = pos.y + 30;
            rot = -26;
          }
          const animate = !isDraggingThis;

          return (
            <button
              key={f.id}
              type="button"
              onPointerDown={isFront && !isExiting ? onPointerDown : undefined}
              onPointerMove={isFront && !isExiting ? onPointerMove : undefined}
              onPointerUp={isFront && !isExiting ? onPointerUp(f.id) : undefined}
              onClick={!isFront ? () => onNavigate(f.id) : undefined}
              className={`glass-bead-soft ${f.card} absolute inset-0 flex touch-none select-none flex-col justify-between rounded-[32px] p-6 text-left ${
                isFront && !isExiting ? "cursor-grab active:cursor-grabbing" : ""
              } ${animate ? "transition-transform duration-300 ease-out" : ""}`}
              style={{
                transform: `translate(${tx}px, ${ty}px) rotate(${rot}deg)`,
                zIndex: isExiting ? 40 : 30 - depth * 10,
                transitionDuration: isExiting ? `${EXIT_MS}ms` : undefined,
              }}
            >
              <span className="badge-dark flex size-12 items-center justify-center rounded-full">
                <f.Icon className="size-6" />
              </span>
              <span>
                <span
                  className={`block text-2xl font-extrabold tracking-tight ${f.dark ? "text-white" : "text-trend-navy"}`}
                >
                  {f.label}
                </span>
                <span className={`mt-2 block text-sm leading-relaxed ${f.dark ? "text-white/70" : "text-trend-navy/70"}`}>
                  {f.desc}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
