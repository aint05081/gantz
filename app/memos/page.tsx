"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { getCurrentEmail, isAdmin, logout } from "../../lib/auth";

type Memo = {
  id: string;
  created_at: string;
  title: string;
  body: string;
};

type Comment = {
  id: string;
  created_at: string;
  memo_id: string;
  nickname: string | null;
  body: string;
};

export default function MemosPage() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [selected, setSelected] = useState<Memo | null>(null);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [nickname, setNickname] = useState("");

  const [loadingMemos, setLoadingMemos] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [posting, setPosting] = useState(false);

  // auth
  const [admin, setAdmin] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  // 관리자 메모 작성
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [creating, setCreating] = useState(false);

  async function refreshAuth() {
    const e = await getCurrentEmail();
    setEmail(e);
    setAdmin(await isAdmin());
  }

  async function loadMemos() {
    setLoadingMemos(true);
    const { data, error } = await supabase
      .from("memos")
      .select("id,created_at,title,body")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      alert(`메모 불러오기 실패: ${error.message}`);
      setLoadingMemos(false);
      return;
    }

    setMemos((data ?? []) as Memo[]);
    setLoadingMemos(false);
  }

  async function loadComments(memoId: string) {
    setLoadingComments(true);
    const { data, error } = await supabase
      .from("memo_comments")
      .select("id,created_at,memo_id,nickname,body")
      .eq("memo_id", memoId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      alert(`댓글 불러오기 실패: ${error.message}`);
      setLoadingComments(false);
      return;
    }

    setComments((data ?? []) as Comment[]);
    setLoadingComments(false);
  }

  async function openMemo(m: Memo) {
    setSelected(m);
    setComments([]);
    setCommentBody("");
    await loadComments(m.id);
  }

  async function postComment() {
    if (!selected) return;
    const body = commentBody.trim();
    if (!body) return alert("간츠에게 하고 싶은 말이 있나요?");

    setPosting(true);

    const { error } = await supabase.from("memo_comments").insert({
      memo_id: selected.id,
      nickname: nickname.trim() ? nickname.trim() : null,
      body,
    });

    if (error) {
      console.error(error);
      alert(`댓글 등록 실패: ${error.message}`);
      setPosting(false);
      return;
    }

    setCommentBody("");
    await loadComments(selected.id);
    setPosting(false);
  }

  async function createMemo() {
    if (!admin) return alert("간츠만 가능");
    const title = newTitle.trim();
    const body = newBody.trim();
    if (!title || !body) return alert("내용까지 다 입력해 주세요.");

    setCreating(true);
    const { error } = await supabase.from("memos").insert({ title, body });

    if (error) {
      console.error(error);
      alert(`메모 작성 실패: ${error.message}`);
      setCreating(false);
      return;
    }

    setNewTitle("");
    setNewBody("");
    setCreating(false);
    await loadMemos();
  }

  async function deleteMemo(id: string) {
    if (!admin) return alert("간츠만 가능");
    if (!confirm("삭제하시겠습니까?")) return;

    const { error } = await supabase.from("memos").delete().eq("id", id);
    if (error) {
      console.error(error);
      alert(`삭제 실패: ${error.message}`);
      return;
    }

    if (selected?.id === id) setSelected(null);
    await loadMemos();
  }

  async function deleteComment(commentId: string) {
    if (!admin) return alert("간츠만 가능");
    if (!confirm("삭제하시겠습니까?")) return;

    const { error } = await supabase.from("memo_comments").delete().eq("id", commentId);
    if (error) {
      console.error(error);
      alert(`댓글 삭제 실패: ${error.message}`);
      return;
    }

    if (selected) await loadComments(selected.id);
  }

  useEffect(() => {
    refreshAuth();
    loadMemos();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refreshAuth();
    });

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
        <h1 style={{ margin: 0 }}>메모</h1>
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

      {/* 관리자 작성 패널 (사진 페이지 느낌) */}
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
          <div style={{ fontWeight: 800 }}>글 작성</div>

          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="제목"
            style={{
              padding: 10,
              borderRadius: 0,
              border: "1px solid rgba(255,255,255,0.26)",
              background: "transparent",
              color: "inherit",
            }}
          />

          <textarea
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder="내용"
            rows={4}
            style={{
              padding: 10,
              borderRadius: 0,
              border: "1px solid rgba(255,255,255,0.26)",
              background: "transparent",
              color: "inherit",
              resize: "vertical",
            }}
          />

          <button
            onClick={createMemo}
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
            {creating ? "작성 중…" : "작성"}
          </button>
        </div>
      )}

      <div style={{ height: 14 }} />

      {loadingMemos && <p style={{ color: "gray" }}>불러오는 중…</p>}

      {/* 메모 리스트 */}
      <div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 8,
  }}
>
  {memos.map((m) => (
    <div key={m.id} style={{ position: "relative" }}>
      <div
        onClick={() => openMemo(m)}
        style={{
          width: "100%",
          aspectRatio: "16/9",
          border: "1px solid rgba(255,255,255,0.26)",
          background: "rgba(255,255,255,0.04)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: 12,
          borderRadius: 0,
          fontWeight: 900,
          fontSize: 16,
        }}
      >
        {m.title}
      </div>

      {admin && (
        <button
          onClick={() => deleteMemo(m.id)}
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
            fontWeight: 800,
          }}
        >
          삭제
        </button>
      )}
    </div>
  ))}
</div>


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
              color: "#0b0c10",
              padding: 16,
              maxWidth: 720,
              width: "100%",
              borderRadius: 0,
              maxHeight: "85vh",
              overflow: "auto",
            }}
          >
            {/* ✅ 시간 표시 제거 */}
            <h2 style={{ marginTop: 0, marginBottom: 10 }}>{selected.title}</h2>
            <p style={{ marginTop: 0, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{selected.body}</p>

            {admin && (
              <button
                onClick={() => deleteMemo(selected.id)}
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 0,
                  border: "1px solid rgba(0,0,0,0.2)",
                  background: "white",
                  color: "#0b0c10",
                  cursor: "pointer",
                  fontWeight: 800,
                }}
              >
                이 메모 삭제
              </button>
            )}

            <hr style={{ margin: "16px 0", border: "none", borderTop: "1px solid rgba(0,0,0,0.15)" }} />

            <h3 style={{ margin: "0 0 10px 0" }}>댓글</h3>

            {loadingComments ? (
              <p style={{ color: "gray" }}>댓글 불러오는 중…</p>
            ) : comments.length === 0 ? (
              <p style={{ color: "gray" }}>아직 댓글이 없어요.</p>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {comments.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      padding: 12,
                      border: "1px solid rgba(0,0,0,0.18)",
                      borderRadius: 0,
                      background: "white",
                      position: "relative",
                    }}
                  >
                    <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 6 }}>
                      <div style={{ fontWeight: 800 }}>{c.nickname ?? "익명"}</div>
                      {/* ✅ 시간 표시 제거 */}
                    </div>
                    <div style={{ whiteSpace: "pre-wrap" }}>{c.body}</div>

                    {admin && (
                      <button
                        onClick={() => deleteComment(c.id)}
                        style={{
                          position: "absolute",
                          top: 10,
                          right: 10,
                          background: "#0b0c10",
                          color: "white",
                          border: "1px solid rgba(0,0,0,0.2)",
                          borderRadius: 0,
                          padding: "6px 8px",
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        삭제
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="닉네임(선택)"
                style={{
                  padding: 12,
                  borderRadius: 0,
                  border: "1px solid rgba(0,0,0,0.2)",
                }}
              />
              <textarea
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder="간츠에게 하고 싶은 말이 있나요?"
                rows={3}
                style={{
                  padding: 12,
                  borderRadius: 0,
                  border: "1px solid rgba(0,0,0,0.2)",
                  resize: "vertical",
                }}
              />
              <button
                onClick={postComment}
                disabled={posting}
                style={{
                  padding: 12,
                  borderRadius: 0,
                  border: "1px solid rgba(0,0,0,0.2)",
                  background: "#0b0c10",
                  color: "white",
                  cursor: "pointer",
                  opacity: posting ? 0.6 : 1,
                  fontWeight: 800,
                }}
              >
                {posting ? "등록 중…" : "댓글 등록"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
