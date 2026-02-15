"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";


type Photo = {
  id: string;
  image_url: string;
  caption: string;
  created_at: string;
};

type Memo = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

// ✅ 여기만 바꾸면 됨
const YOUTUBE_URL = "https://youtu.be/kuQ8kiBuFd4?si=afx3Gy9G_0rSwl5v";

const LINKS: { label: string; href: string }[] = [
  { label: "푸슝", href: "https://pushoong.com" },
];

function toYouTubeEmbedUrl(url: string) {
  try {
    const u = new URL(url);

    // youtu.be/<id>
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    // youtube.com/watch?v=<id>
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;

      // youtube.com/embed/<id>
      if (u.pathname.startsWith("/embed/")) {
        return `https://www.youtube.com${u.pathname}`;
      }

      // youtube.com/shorts/<id>
      if (u.pathname.startsWith("/shorts/")) {
        const id = u.pathname.split("/shorts/")[1]?.split("/")[0];
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export default function HomePage() {
  const [recentPhotos, setRecentPhotos] = useState<Photo[]>([]);
  const [recentMemos, setRecentMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);

  const embedUrl = useMemo(() => toYouTubeEmbedUrl(YOUTUBE_URL), []);

  useEffect(() => {
    const run = async () => {
      setLoading(true);

      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const photosReq = supabase
        .from("photos")
        .select("id,image_url,caption,created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(30);

      const memosReq = supabase
        .from("memos")
        .select("id,title,body,created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(30);

      const [{ data: pData, error: pErr }, { data: mData, error: mErr }] =
        await Promise.all([photosReq, memosReq]);

      if (pErr) console.error(pErr);
      if (mErr) console.error(mErr);

      setRecentPhotos((pData ?? []) as Photo[]);
      setRecentMemos((mData ?? []) as Memo[]);
      setLoading(false);
    };

    run();
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: "grid", gap: 12 }}>
        <h1 style={{ margin: 0, textAlign: "center" }}>GANTZ</h1>


        {/* 유튜브 */}
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.26)",
            background: "rgba(255,255,255,0.04)",
            borderRadius: 0,
            padding: 12,
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 10 }}>YouTube</div>

          {embedUrl ? (
            <div style={{ width: "100%", aspectRatio: "16/9" }}>
              <iframe
                width="100%"
                height="100%"
                src={embedUrl}
                title="YouTube player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                style={{ border: 0 }}
              />
            </div>
          ) : (
            <div style={{ color: "rgba(255,255,255,0.75)" }}>
              유튜브 링크 형식이 이상해서 임베드가 안 돼. (watch?v=… / youtu.be/… / shorts/… 형태로 넣어줘)
            </div>
          )}

          {/* 외부 링크 */}
          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-block",
                  padding: "10px 12px",
                  borderRadius: 0,
                  border: "1px solid rgba(255,255,255,0.26)",
                  background: "white",
                  color: "black",
                  fontWeight: 900,
                }}
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>

        {/* 최근 7일 */}
        <div style={{ marginTop: 6 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>최근 7일</div>

          {loading ? (
            <div style={{ color: "gray" }}>불러오는 중…</div>
          ) : (
            <div style={{ display: "grid", gap: 18 }}>
              {/* 최근 사진 */}
              <section style={{ display: "grid", gap: 10 }}>
                <div style={{ fontWeight: 800, color: "rgba(255,255,255,0.85)" }}>사진</div>
                {recentPhotos.length === 0 ? (
                  <div style={{ color: "gray" }}>최근 7일 사진이 없어.</div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {recentPhotos.map((p) => (
                      <a key={p.id} href="/photos" style={{ display: "block" }}>
                        <img
                          src={p.image_url}
                          alt=""
                          style={{
                            width: "100%",
                            aspectRatio: "1/1",
                            objectFit: "cover",
                            borderRadius: 0,
                          }}
                        />
                      </a>
                    ))}
                  </div>
                )}
              </section>

              {/* 최근 메모 */}
              <section style={{ display: "grid", gap: 10 }}>
                <div style={{ fontWeight: 800, color: "rgba(255,255,255,0.85)" }}>메모</div>
                {recentMemos.length === 0 ? (
                  <div style={{ color: "gray" }}>최근 7일 메모가 없어.</div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {recentMemos.map((m) => (
                      <a
                        key={m.id}
                        href="/memos"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          textAlign: "center",
                          padding: 12,
                          aspectRatio: "1/1",
                          borderRadius: 0,
                          border: "1px solid rgba(255,255,255,0.26)",
                          background: "rgba(255,255,255,0.04)",
                          color: "inherit",
                          fontWeight: 900,
                        }}
                      >
                        {m.title}
                      </a>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
