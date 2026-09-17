import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand";
import { Card, KeyValue } from "@/components/ui";

export const metadata: Metadata = {
  title: "Trendloom 개인정보처리방침",
  description: "Trendloom의 개인정보 수집, 이용 및 보호에 관한 개인정보처리방침입니다.",
};

const GITHUB_ISSUES_URL = "https://github.com/Parkhyejun0111/Trendloom/issues";

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-relaxed text-muted">{children}</p>;
}

function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-muted">{children}</ul>;
}

export default function PrivacyPage() {
  return (
    <main className="@container relative z-10 w-full px-5 pb-16 pt-8">
      <header className="mb-8">
        <Link href="/" className="inline-flex items-center gap-3">
          <Logo size={30} />
          <span className="text-xl font-extrabold tracking-tight text-paper">Trendloom</span>
        </Link>
      </header>

      <h1 className="text-2xl font-extrabold tracking-tight text-trend-navy">Trendloom 개인정보처리방침</h1>

      <Card className="mt-5">
        <KeyValue k="서비스명" v="Trendloom" />
        <KeyValue k="운영 주체" v="Haejunnn" />
        <KeyValue k="시행일" v="2026년 9월 17일" />
      </Card>

      <div className="mt-5 space-y-4">
        <Card title="1. 개인정보처리방침의 목적">
          <P>
            Trendloom(이하 &ldquo;서비스&rdquo;)은 이용자의 개인정보를 소중하게 다루며, 관련 법령을
            준수하기 위해 노력합니다. 본 방침은 서비스가 실제로 어떤 정보를 처리하는지(또는 처리하지
            않는지) 이용자에게 투명하게 안내하기 위해 작성되었습니다.
          </P>
        </Card>

        <Card title="2. 수집하는 개인정보 항목">
          <P>서비스는 회원가입·로그인·결제 기능이 없습니다. 이에 따라 아래 항목은 현재 해당 정보를 직접 수집하지 않습니다.</P>
          <Ul>
            <li>이름, 이메일, 전화번호, 비밀번호 등 회원 식별 정보 — 수집하지 않음</li>
            <li>결제·카드·계좌 정보 — 수집하지 않음</li>
            <li>광고 식별자, 분석(analytics) SDK를 통한 행동 추적 정보 — 수집하지 않음</li>
          </Ul>
          <p className="mt-3 text-sm leading-relaxed text-muted">실제로 처리되는 정보는 다음과 같습니다.</p>
          <Ul>
            <li>
              이용자가 화면에서 선택하는 성별·연령대·기간 값 — 트렌드 조회 조건으로만 서버 요청에
              사용되며, 이용자 개인과 연결해 저장되지 않습니다.
            </li>
            <li>
              호스팅 인프라(Vercel)가 서비스 운영 과정에서 통상적으로 생성하는 접속 IP, 브라우저
              정보, 접속 시각 등 서버 로그 — 서비스가 별도로 수집·가공하지 않습니다.
            </li>
          </Ul>
        </Card>

        <Card title="3. 개인정보 수집 및 이용 목적">
          <Ul>
            <li>성별·연령대·기간 선택값: 요청한 조건에 맞는 트렌드 조회 결과 제공</li>
            <li>서버 로그: 서비스 운영, 보안 사고 대응, 부정 이용 방지</li>
          </Ul>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            현재 회원 관리, 마케팅, 광고 목적의 개인정보 수집·이용은 하지 않습니다.
          </p>
        </Card>

        <Card title="4. 개인정보의 보유 및 이용 기간">
          <Ul>
            <li>회원 정보 자체가 존재하지 않으므로 별도로 보유하는 개인 식별 정보가 없습니다.</li>
            <li>서버 접속 로그는 호스팅 인프라(Vercel)의 정책에 따라 처리되며, 서비스가 별도 데이터베이스에 수집·저장하지 않습니다.</li>
            <li>
              데이터베이스(Supabase)에 저장되는 정보는 키워드 단위로 집계된 검색 트렌드 지표
              (raw_search_trend, trend_metric 등)이며, 개인을 식별할 수 있는 정보를 포함하지
              않습니다.
            </li>
          </Ul>
        </Card>

        <Card title="5. 개인정보의 제3자 제공">
          <P>서비스는 제공할 개인정보 자체를 보유하고 있지 않으므로 이용자의 개인정보를 제3자에게 제공하지 않습니다.</P>
          <Ul>
            <li>
              트렌드 데이터 조회를 위해 서버에서 NAVER 검색 트렌드 API, NAVER 이미지 검색 API,
              Pinterest Trends API를 호출하지만, 전송되는 값은 서비스가 관리하는 키워드·연령대
              코드·성별 코드 등 조회 조건뿐입니다. 이름, 이메일, 기기 식별자 등 이용자를 특정할 수
              있는 정보는 전송하지 않습니다.
            </li>
            <li>
              트렌드 상세 페이지의 &ldquo;Pinterest에서 보기&rdquo; 링크를 이용자가 직접 클릭하면
              Pinterest 웹사이트로 이동합니다. 이후 Pinterest에서 이루어지는 개인정보 처리는
              Pinterest의 자체 개인정보처리방침을 따르며, 서비스는 이 과정에서 이용자 정보를
              Pinterest로 별도 전송하지 않습니다.
            </li>
          </Ul>
        </Card>

        <Card title="6. 개인정보처리의 위탁">
          <P>서비스는 다음과 같은 외부 인프라를 이용해 운영됩니다.</P>
          <Ul>
            <li>Vercel Inc. — 애플리케이션 호스팅·배포</li>
            <li>Supabase — 트렌드 데이터베이스(집계된 키워드 지표만 저장, 개인정보 미포함)</li>
            <li>
              Anthropic — AI 트렌드 해석(TREND READ) 생성. 전송되는 내용은 집계된 트렌드 수치이며
              개인정보를 포함하지 않습니다.
            </li>
          </Ul>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            위 업체는 서비스 운영을 위한 인프라·처리 도구로만 이용되며, 현재 서비스가 보유한
            이용자 개인 식별 정보 자체가 없어 개인정보 처리위탁 계약의 대상이 되는 개인정보는
            없습니다.
          </p>
        </Card>

        <Card title="7. 이용자의 권리와 행사 방법">
          <P>
            서비스는 회원가입을 요구하지 않으므로 별도로 열람·정정·삭제를 요청할 계정 정보가
            존재하지 않습니다. 개인정보 처리와 관련해 문의하고 싶은 사항이 있다면 아래 11번 문의처를
            통해 언제든지 연락할 수 있으며, 서비스는 관련 법령에 따라 성실히 답변합니다.
          </P>
        </Card>

        <Card title="8. 개인정보의 안전성 확보 조치">
          <Ul>
            <li>민감한 개인정보 자체를 수집하지 않는 최소 수집 원칙으로 설계되어 있습니다.</li>
            <li>모든 통신은 HTTPS(TLS)로 암호화됩니다.</li>
            <li>
              외부 API 키(NAVER, Pinterest, Anthropic, Supabase 등)는 서버 환경변수로만 관리되며
              브라우저(클라이언트)에 노출되지 않습니다.
            </li>
          </Ul>
        </Card>

        <Card title="9. 개인정보의 파기">
          <P>
            서비스가 별도로 수집·보관하는 이용자 개인정보가 없으므로 현재 파기 대상이 되는
            개인정보도 없습니다. 향후 회원 기능 등이 추가되어 개인정보를 수집하게 될 경우, 수집
            목적이 달성된 후 지체 없이 파기하며 본 방침을 사전에 개정해 고지합니다.
          </P>
        </Card>

        <Card title="10. 쿠키 및 유사 기술에 관한 사항">
          <P>
            서비스는 로그인·회원 기능이 없어 세션 유지나 광고 타겟팅을 위한 자체 쿠키를 생성하지
            않습니다. 다만 호스팅 플랫폼(Vercel)의 특성상 서비스 운영에 필요한 최소한의 기술적
            쿠키가 자동으로 생성될 수 있으며, 이는 이용자를 식별하거나 추적하기 위한 목적이
            아닙니다.
          </P>
        </Card>

        <Card title="11. 개인정보 보호책임자 또는 문의 방법">
          <KeyValue k="서비스명" v="Trendloom" />
          <KeyValue k="운영자" v="Haejunnn" />
          <KeyValue
            k="문의처"
            v={
              <a
                href={GITHUB_ISSUES_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="font-semibold text-trend-navy underline underline-offset-2"
              >
                GitHub Issues
              </a>
            }
          />
          <p className="mt-3 text-sm leading-relaxed text-muted">
            서비스 이용 중 발생하는 개인정보 관련 문의나 의견은 위 채널을 통해 접수할 수 있습니다.
          </p>
        </Card>

        <Card title="12. 개인정보처리방침 변경에 관한 사항">
          <P>
            본 방침은 2026년 9월 17일부터 시행됩니다. 법령·정책 또는 서비스 내용 변경에 따라 본
            방침이 개정되는 경우, 개정 내용을 본 페이지에 게시하고 시행일을 갱신합니다.
          </P>
        </Card>
      </div>

      <footer className="mt-10 border-t border-line pt-5 text-xs text-muted">
        <Link href="/" className="font-semibold text-trend-navy">
          ← Trendloom으로 돌아가기
        </Link>
      </footer>
    </main>
  );
}
