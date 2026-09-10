"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useObject } from "@ai-sdk/react";
import { taggingSchema } from "@/lib/schemas";
import { Card, KeyValue, Pill, Skeleton } from "./ui";

export function ProductTagger() {
  const [preview, setPreview] = useState<string | null>(null);
  const [payload, setPayload] = useState<{ image: string; mediaType: string } | null>(
    null,
  );
  const [hint, setHint] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    object: tag,
    submit,
    isLoading,
    error,
  } = useObject({ api: "/api/tag", schema: taggingSchema });

  async function onFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    const buf = await file.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    const b64 = btoa(binary);
    setPreview(`data:${file.type};base64,${b64}`);
    setPayload({ image: b64, mediaType: file.type });
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1400);
  }

  const attrs = tag?.attributes;
  const mds = tag?.merchandising;
  const copyBlock = tag?.copy;

  return (
    <div className="grid gap-6 @lg:grid-cols-[380px_1fr]">
      {/* ── 업로드 ─────────────────────────────────────────── */}
      <div className="space-y-4">
        <Card title="상품 이미지" hint="사입 후보, 샘플 촬영본, 경쟁사 상품 어떤 것이든">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) onFile(f);
            }}
            onClick={() => fileRef.current?.click()}
            className="flex aspect-[3/4] cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-line-2 bg-ink backdrop-blur-sm transition hover:border-accent"
          >
            {preview ? (
              <Image
                src={preview}
                alt="업로드한 상품 이미지"
                width={480}
                height={640}
                unoptimized
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="px-6 text-center">
                <p className="text-sm text-paper/70">이미지를 드래그하거나 클릭</p>
                <p className="mt-1 text-xs text-muted">JPG · PNG · WEBP</p>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />

          <textarea
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="MD 메모 (선택) — 예: 24FW 여성 라인, 목표 판매가 79,000원, 원가 21,000원"
            rows={3}
            className="mt-4 w-full resize-none rounded-lg border border-line-2 bg-ink px-3 py-2.5 text-sm outline-none backdrop-blur-sm placeholder:text-muted focus:border-muted"
          />

          <button
            onClick={() => payload && submit({ ...payload, hint })}
            disabled={!payload || isLoading}
            className="mt-3 w-full rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLoading ? "분석 중…" : "속성 태깅 + 카피 생성"}
          </button>
        </Card>

        {mds && (
          <Card title="머천다이징 판단" className="fade-up">
            <dl>
              <KeyValue k="타겟" v={mds.targetCustomer ?? "—"} />
              <KeyValue k="가격 밴드" v={mds.priceBand ?? "—"} />
              <KeyValue k="포지셔닝" v={mds.positioning ?? "—"} />
            </dl>
            {!!mds.stylingTips?.length && (
              <ul className="mt-3 space-y-2">
                {mds.stylingTips.map((t, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-paper/85">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                    {t}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>

      {/* ── 결과 ──────────────────────────────────────────── */}
      <div className="space-y-6">
        {!tag && !isLoading && (
          <Card>
            <div className="py-16 text-center">
              <p className="text-sm text-paper/70">
                이미지를 올리면 카테고리 · 실루엣 · 소재 · 무드까지 표준 속성으로 태깅하고,
              </p>
              <p className="mt-1 text-sm text-paper/70">
                바로 업로드 가능한 상품명 · 상세 카피 · 검색 키워드를 함께 만들어 드립니다.
              </p>
            </div>
          </Card>
        )}

        {(isLoading || attrs) && (
          <Card title="상품 속성" hint="커머스 필터/검색에 그대로 매핑되는 표준 속성값">
            {attrs ? (
              <div className="grid gap-x-8 gap-y-0 @sm:grid-cols-2">
                <KeyValue k="카테고리" v={attrs.category ?? "—"} />
                <KeyValue k="아이템" v={attrs.subCategory ?? "—"} />
                <KeyValue k="실루엣" v={attrs.silhouette ?? "—"} />
                <KeyValue k="기장" v={attrs.length ?? "—"} />
                <KeyValue k="넥라인" v={attrs.neckline ?? "—"} />
                <KeyValue k="소매" v={attrs.sleeve ?? "—"} />
                <KeyValue k="패턴" v={attrs.pattern ?? "—"} />
                <KeyValue k="컬러" v={<TagRow items={attrs.colors} />} />
                <KeyValue k="소재" v={<TagRow items={attrs.material} />} />
                <KeyValue k="디테일" v={<TagRow items={attrs.detail} />} />
                <KeyValue k="무드" v={<TagRow items={attrs.mood} accent />} />
                <KeyValue k="시즌" v={<TagRow items={attrs.season} />} />
                <KeyValue k="TPO" v={<TagRow items={attrs.tpo} />} />
              </div>
            ) : (
              <Skeleton lines={6} />
            )}
          </Card>
        )}

        {(isLoading || copyBlock) && (
          <Card
            title="커머스 카피"
            hint="복사해서 바로 상품 등록에 사용하세요"
            right={
              copyBlock?.productName?.[0] ? (
                <button
                  onClick={() =>
                    copy(
                      [
                        `[상품명] ${copyBlock.productName?.[0]}`,
                        `[헤드라인] ${copyBlock.headline}`,
                        ``,
                        copyBlock.description,
                        ``,
                        ...(copyBlock.bullets ?? []).map((b) => `· ${b}`),
                        ``,
                        `키워드: ${(copyBlock.searchKeywords ?? []).join(", ")}`,
                        `해시태그: ${(copyBlock.hashtags ?? []).join(" ")}`,
                      ].join("\n"),
                      "all",
                    )
                  }
                  className="rounded-md border border-line-2 px-2.5 py-1 text-xs text-paper/70 hover:border-accent hover:text-accent"
                >
                  {copied === "all" ? "복사됨" : "전체 복사"}
                </button>
              ) : null
            }
          >
            {copyBlock ? (
              <div className="space-y-5">
                <div>
                  <p className="mb-2 text-[11px] uppercase tracking-wider text-muted">
                    상품명 3안
                  </p>
                  <div className="space-y-2">
                    {(copyBlock.productName ?? []).map((n, i) => (
                      <button
                        key={i}
                        onClick={() => n && copy(n, `n${i}`)}
                        className="flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-ink px-3 py-2.5 text-left text-sm transition hover:border-accent"
                      >
                        <span>{n}</span>
                        <span className="shrink-0 text-xs text-muted">
                          {copied === `n${i}` ? "복사됨" : `${n?.length ?? 0}자`}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {copyBlock.headline && (
                  <p className="border-l-2 border-accent pl-4 text-lg leading-snug font-medium">
                    {copyBlock.headline}
                  </p>
                )}

                {copyBlock.description && (
                  <p className="text-sm leading-relaxed text-paper/80">
                    {copyBlock.description}
                  </p>
                )}

                {!!copyBlock.bullets?.length && (
                  <ul className="grid gap-2 @sm:grid-cols-2">
                    {copyBlock.bullets.map((b, i) => (
                      <li
                        key={i}
                        className="rounded-lg border border-line bg-ink px-3 py-2 text-sm text-paper/85"
                      >
                        {b}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="grid gap-4 @sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-[11px] uppercase tracking-wider text-muted">
                      검색 키워드
                    </p>
                    <TagRow items={copyBlock.searchKeywords} />
                  </div>
                  <div>
                    <p className="mb-2 text-[11px] uppercase tracking-wider text-muted">
                      해시태그
                    </p>
                    <TagRow items={copyBlock.hashtags} accent />
                  </div>
                </div>
              </div>
            ) : (
              <Skeleton lines={5} />
            )}
          </Card>
        )}

        {error && (
          <p className="rounded-lg border border-accent-2/40 bg-accent-2/10 px-4 py-3 text-sm text-accent-2">
            분석 실패: {error.message}. ANTHROPIC_API_KEY 가 설정되어 있는지 확인하세요.
          </p>
        )}
      </div>
    </div>
  );
}

function TagRow({
  items,
  accent = false,
}: {
  items?: (string | undefined)[];
  accent?: boolean;
}) {
  if (!items?.length) return <span className="text-muted">—</span>;
  return (
    <span className="flex flex-wrap gap-1.5">
      {items.filter(Boolean).map((t, i) => (
        <Pill key={i} tone={accent ? "accent" : "default"}>
          {t}
        </Pill>
      ))}
    </span>
  );
}
