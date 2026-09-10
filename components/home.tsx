import { CatSays } from "./brand";
import { IconBoard, IconPlan, IconReview, IconTagger } from "./icons";
import type { ToolId } from "./bottom-nav";

const FEATURES: {
  id: ToolId;
  label: string;
  desc: string;
  Icon: typeof IconBoard;
  card: string;
}[] = [
  {
    id: "board",
    label: "스타일 보드",
    desc: "레퍼런스를 핀터레스트처럼 모아 놓고, 시즌 팔레트와 실루엣을 뽑아내기",
    Icon: IconBoard,
    card: "card-lime",
  },
  {
    id: "plan",
    label: "발주 · 가격",
    desc: "원가와 예상 수요로 발주량과 판매가를 잡고, 판매율·재고·영업이익까지 시뮬레이션",
    Icon: IconPlan,
    card: "card-pink",
  },
  {
    id: "review",
    label: "리뷰 분석",
    desc: "쌓인 리뷰에서 사이즈·소재·불량 이슈를 뽑고 재생산 판단까지",
    Icon: IconReview,
    card: "card-blue",
  },
  {
    id: "tagger",
    label: "상품 태거",
    desc: "이미지 한 장으로 속성 태깅 · 머천다이징 판단 · 커머스 카피",
    Icon: IconTagger,
    card: "card-mint",
  },
];

export function Home({ onNavigate }: { onNavigate: (id: ToolId) => void }) {
  return (
    <div className="fade-up space-y-8">
      <CatSays>
        어떤 작업부터 시작할까요? 시즌 기획, 발주·가격 결정, 리뷰 분석, 상품 태깅까지 —
        아래에서 골라 주세요.
      </CatSays>

      <div className="grid grid-cols-1 gap-4">
        {FEATURES.map(({ id, label, desc, Icon, card }) => (
          <button
            key={id}
            type="button"
            onClick={() => onNavigate(id)}
            className={`glass-bead-soft ${card} group flex flex-col gap-3 rounded-[28px] p-5 text-left`}
          >
            <span className="badge-dark flex size-10 items-center justify-center rounded-full">
              <Icon className="size-5" />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-paper">{label}</span>
            <span className="text-sm leading-relaxed text-paper/70">{desc}</span>
            <span className="glass-bead mt-1 inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold text-paper">
              바로가기 →
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
