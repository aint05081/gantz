"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { isAdmin, logout, getCurrentEmail } from "../../lib/auth";
import { uploadImageToMedia } from "../../lib/upload";

type Photo = {
  id: string;
  image_url: string;
  caption: string;
  taken_at: string | null;
  created_at: string;
};

export default function PhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selected, setSelected] = useState<Photo | null>(null);

  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [admin, setAdmin] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  // 관리자 업로드
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newCaption, setNewCaption] = useState("");
  const [creating, setCreating] = useState(false);

  // 관리자 편집(캡션)
  const [editCaption, setEditCaption] = useState("");
  const [savingCaption, setSavingCaption] = useState(false);

  const pageSize = 24;
  const pageRef = useRef(0);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const ioRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef(false);

  async function refreshAuth() {
    const e = await getCurrentEmail();
    setEmail(e);
    setAdmin(await isAdmin());
  }

  async function loadMore(reset = false) {
    if (loadingRef.current) return;
    if (!hasMore && !reset) return;

    loadingRef.current = true;
    setLoading(true);

    const page = reset ? 0 : pageRef.current;
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from("photos")
      .select("id,image_url,caption,taken_at,created_at")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error(error);
      alert(`불러오기 실패: ${error.message}`);
      setLoading(false);
      loadingRef.current = false;
      return;
    }

    const batch = (data ?? []) as Photo[];

    if (reset) {
      setPhotos(batch);
      pageRef.current = 1;
      setHasMore(batch.length === pageSize);
    } else {
      setPhotos((prev) => [...prev, ...batch]);
      pageRef.current += 1;
      if (batch.length < pageSize) setHasMore(false);
    }

    setLoading(false);
    loadingRef.current = false;
  }

  async function createPhoto() {
    if (!admin) return alert("간츠만 가능");
    if (!newFile) return alert("사진을 업로드!");

    setCreating(true);
    try {
      const image_url = await uploadImageToMedia(newFile);
      const caption = newCaption.trim();

      const { error } = await supabase.from("photos").insert({
        image_url,
        caption: caption || "",
      });

      if (error) throw error;

      setNewFile(null);
      setNewCaption("");
      setCreating(false);

      setHasMore(true);
      await loadMore(true);
    } catch (e: any) {
      console.error(e);
      alert(`추가 실패: ${e?.message ?? e}`);
      setCreating(false);
    }
  }

  async function deletePhoto(id: string) {
    if (!admin) return alert("간츠만 가능");
    if (!confirm("삭제하시겠습니까?")) return;

    const { error } = await supabase.from("photos").delete().eq("id", id);
    if (error) {
      console.error(error);
      alert(`삭제 실패: ${error.message}`);
      return;
    }

    setPhotos((prev) => prev.filter((p) => p.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  async function saveCaption() {
    if (!admin) return alert("간츠만 가능");
    if (!selected) return;

    setSavingCaption(true);

    const { error } = await supabase
      .from("photos")
      .update({ caption: editCaption })
      .eq("id", selected.id);

    if (error) {
      console.error(error);
      alert(`저장 실패: ${error.message}`);
      setSavingCaption(false);
      return;
    }

    // 화면 반영
    setPhotos((prev) =>
      prev.map((p) => (p.id === selected.id ? { ...p, caption: editCaption } : p))
    );
    setSelected((prev) => (prev ? { ...prev, caption: editCaption } : prev));

    setSavingCaption(false);
  }

  useEffect(() => {
    refreshAuth();
    loadMore(true);

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refreshAuth();
    });

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    ioRef.current?.disconnect();
    ioRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { root: null, rootMargin: "300px", threshold: 0 }
    );

    ioRef.current.observe(el);
    return () => {
      ioRef.current?.disconnect();
      ioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore]);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "baseline",
        }}
      >
        <h1 style={{ margin: 0 }}>PHOTOS</h1>
        <div style={{ color: "gray", fontSize: 13 }}>
          {email ? (
            <>
              {email} {admin ? "(간츠)" : ""}
              <button
                onClick={async () => {
                  await logout();
                  alert("로그아웃 완료");
                }}
                style={{
                  marginLeft: 10,
                  border: "1px solid #ddd",
                  background: "white",
                  borderRadius: 8,
                  padding: "6px 10px",
                  cursor: "pointer",
                }}
              >
                로그아웃
              </button>
            </>
          ) : (
            <span>로그인 안 됨</span>
          )}
        </div>
      </div>

      {/* 관리자 업로드 */}
      {admin && (
        <div
          style={{
            marginTop: 14,
            padding: 12,
            border: "1px solid rgba(255,255,255,0.26)",
            borderRadius: 0,
            background: "rgba(255,255,255,0.04)",
            display: "grid",
            gap: 8,
          }}
        >
          <div style={{ fontWeight: 800 }}>업로드!</div>

          <input
            type="file"
            accept="image/*"
            onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
            style={{
              padding: 10,
              borderRadius: 0,
              border: "1px solid rgba(255,255,255,0.26)",
              background: "transparent",
              color: "inherit",
            }}
          />
          <input
            value={newCaption}
            onChange={(e) => setNewCaption(e.target.value)}
            placeholder="할 말 있어용?"
            style={{
              padding: 10,
              borderRadius: 0,
              border: "1px solid rgba(255,255,255,0.26)",
              background: "transparent",
              color: "inherit",
            }}
          />
          <button
            onClick={createPhoto}
            disabled={creating}
            style={{
              padding: 12,
              borderRadius: 0,
              border: "1px solid rgba(255,255,255,0.26)",
              background: "white",
              color: "black",
              cursor: "pointer",
              opacity: creating ? 0.6 : 1,
              fontWeight: 800,
            }}
          >
            {creating ? "추가 중…" : "추가"}
          </button>
        </div>
      )}

      <div style={{ height: 14 }} />

      {/* 그리드 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {photos.map((p) => (
          <div key={p.id} style={{ position: "relative" }}>
            <img
              src={p.image_url}
              alt=""
              style={{
                width: "100%",
                aspectRatio: "1/1",
                objectFit: "cover",
                cursor: "pointer",
                borderRadius: 0, // ✅ 각지게
              }}
              onClick={() => {
                setSelected(p);
                setEditCaption(p.caption ?? "");
              }}
            />
            {admin && (
              <button
                onClick={() => deletePhoto(p.id)}
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  background: "rgba(0,0,0,0.75)",
                  color: "white",
                  border: "none",
                  borderRadius: 0,
                  padding: "6px 8px",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                삭제
              </button>
            )}
          </div>
        ))}
      </div>

      <div ref={sentinelRef} style={{ height: 1 }} />

      {loading && <p style={{ marginTop: 16, color: "gray" }}>불러오는 중…</p>}
      {!hasMore && <p style={{ marginTop: 16, color: "gray" }}>간츠의 이야기는 여기까지!</p>}

      {/* 모달 */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              color: "#0b0c10", // ✅ 모달 글씨 블랙
              padding: 16,
              maxWidth: 520,
              width: "100%",
              borderRadius: 0, // ✅ 각지게
            }}
          >
            <img
              src={selected.image_url}
              alt=""
              style={{
                width: "100%",
                marginBottom: 12,
                borderRadius: 0, // ✅ 각지게
              }}
            />

            {/* ✅ 시간 표시 삭제 */}

            {admin ? (
              <div style={{ display: "grid", gap: 10 }}>
                <textarea
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  rows={3}
                  placeholder="캡션"
                  style={{
                    width: "100%",
                    padding: 12,
                    borderRadius: 0,
                    border: "1px solid rgba(0,0,0,0.2)",
                    background: "white",
                    color: "#0b0c10",
                    resize: "vertical",
                  }}
                />
                <button
                  onClick={saveCaption}
                  disabled={savingCaption}
                  style={{
                    padding: 12,
                    borderRadius: 0,
                    border: "1px solid rgba(0,0,0,0.2)",
                    background: "#0b0c10",
                    color: "white",
                    cursor: "pointer",
                    opacity: savingCaption ? 0.6 : 1,
                    fontWeight: 800,
                  }}
                >
                  {savingCaption ? "저장 중…" : "캡션 저장"}
                </button>

                <button
                  onClick={() => deletePhoto(selected.id)}
                  style={{
                    padding: 12,
                    borderRadius: 0,
                    border: "1px solid rgba(0,0,0,0.2)",
                    background: "white",
                    color: "#0b0c10",
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                >
                  이 사진 삭제
                </button>
              </div>
            ) : (
              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{selected.caption}</p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
