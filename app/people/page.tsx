"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { getCurrentEmail, isAdmin, logout } from "../../lib/auth";
import { uploadImageToMedia } from "../../lib/upload";

type Person = {
  id: string;
  created_at: string;
  name: string;
  mbti: string | null;
  bio: string | null;
  avatar_url: string | null;
  extra: Record<string, any> | null;
};

type KVRow = { key: string; value: string };

function extraToRows(extra: Record<string, any> | null | undefined): KVRow[] {
  if (!extra) return [];
  return Object.entries(extra).map(([k, v]) => ({ key: k, value: String(v ?? "") }));
}

function rowsToExtra(rows: KVRow[]): Record<string, any> {
  const obj: Record<string, any> = {};
  for (const r of rows) {
    const k = r.key.trim();
    if (!k) continue;
    obj[k] = r.value;
  }
  return obj;
}

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);

  const [admin, setAdmin] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  // ✅ 상세 보기 모달
  const [viewing, setViewing] = useState<Person | null>(null);

  // 관리자 추가 폼
  const [cName, setCName] = useState("");
  const [cMbti, setCMbti] = useState("");
  const [cBio, setCBio] = useState("");
  const [cFile, setCFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

  // 편집 모달
  const [editing, setEditing] = useState<Person | null>(null);
  const [eName, setEName] = useState("");
  const [eMbti, setEMbti] = useState("");
  const [eBio, setEBio] = useState("");
  const [eAvatarUrl, setEAvatarUrl] = useState<string | null>(null);
  const [eFile, setEFile] = useState<File | null>(null);
  const [eRows, setERows] = useState<KVRow[]>([]);
  const [saving, setSaving] = useState(false);

  async function refreshAuth() {
    const e = await getCurrentEmail();
    setEmail(e);
    setAdmin(await isAdmin());
  }

  async function loadPeople() {
    setLoading(true);
    const { data, error } = await supabase
      .from("people")
      .select("id,created_at,name,mbti,bio,avatar_url,extra")
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      alert(`불러오기 실패: ${error.message}`);
      setLoading(false);
      return;
    }

    setPeople((data ?? []) as Person[]);
    setLoading(false);
  }

  async function createPerson() {
    if (!admin) return alert("간츠만 가능");
    const name = cName.trim();
    if (!name) return alert("이름은 꼭 넣어 주세용.");

    setCreating(true);
    try {
      let avatar_url: string | null = null;
      if (cFile) avatar_url = await uploadImageToMedia(cFile);

      const { error } = await supabase.from("people").insert({
        name,
        mbti: cMbti.trim() ? cMbti.trim() : null,
        bio: cBio.trim() ? cBio.trim() : null,
        avatar_url,
        extra: {},
      });

      if (error) throw error;

      setCName("");
      setCMbti("");
      setCBio("");
      setCFile(null);
      setCreating(false);
      await loadPeople();
    } catch (e: any) {
      console.error(e);
      alert(`추가 실패: ${e?.message ?? e}`);
      setCreating(false);
    }
  }

  function openEdit(p: Person) {
    setEditing(p);
    setEName(p.name ?? "");
    setEMbti(p.mbti ?? "");
    setEBio(p.bio ?? "");
    setEAvatarUrl(p.avatar_url ?? null);
    setEFile(null);
    setERows(extraToRows(p.extra));
  }

  async function saveEdit() {
    if (!admin) return alert("간츠만 가능");
    if (!editing) return;

    const name = eName.trim();
    if (!name) return alert("이름은 꼭 넣어 주세용.");

    setSaving(true);
    try {
      let avatar_url = eAvatarUrl;

      if (eFile) {
        avatar_url = await uploadImageToMedia(eFile);
      }

      const extra = rowsToExtra(eRows);

      const { error } = await supabase
        .from("people")
        .update({
          name,
          mbti: eMbti.trim() ? eMbti.trim() : null,
          bio: eBio.trim() ? eBio.trim() : null,
          avatar_url: avatar_url ?? null,
          extra,
        })
        .eq("id", editing.id);

      if (error) throw error;

      setSaving(false);
      setEditing(null);
      await loadPeople();

      // 상세 모달 열려있던 사람도 갱신해주기(있으면)
      setViewing((prev) => (prev?.id === editing.id ? { ...prev, name, mbti: eMbti || null, bio: eBio || null, avatar_url: avatar_url ?? null, extra } : prev));
    } catch (e: any) {
      console.error(e);
      alert(`저장 실패: ${e?.message ?? e}`);
      setSaving(false);
    }
  }

  async function deletePerson(id: string) {
    if (!admin) return alert("간츠만 가능");
    if (!confirm("삭제하시겠습니까?")) return;

    const { error } = await supabase.from("people").delete().eq("id", id);
    if (error) {
      console.error(error);
      alert(`삭제 실패: ${error.message}`);
      return;
    }

    setPeople((prev) => prev.filter((p) => p.id !== id));
    if (editing?.id === id) setEditing(null);
    if (viewing?.id === id) setViewing(null);
  }

  function addRow() {
    setERows((prev) => [...prev, { key: "", value: "" }]);
  }

  function removeRow(index: number) {
    setERows((prev) => prev.filter((_, i) => i !== index));
  }

  function updateRow(index: number, patch: Partial<KVRow>) {
    setERows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  useEffect(() => {
    refreshAuth();
    loadPeople();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refreshAuth();
    });

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
        <h1 style={{ margin: 0 }}>기본 정보</h1>
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

      {/* 관리자 추가 패널 */}
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
          <div style={{ fontWeight: 800 }}>카드 추가</div>

          <input
            value={cName}
            onChange={(e) => setCName(e.target.value)}
            placeholder="이름(필수)"
            style={{
              padding: 10,
              borderRadius: 0,
              border: "1px solid rgba(255,255,255,0.26)",
              background: "transparent",
              color: "inherit",
            }}
          />
          <input
            value={cMbti}
            onChange={(e) => setCMbti(e.target.value)}
            placeholder="MBTI(선택)"
            style={{
              padding: 10,
              borderRadius: 0,
              border: "1px solid rgba(255,255,255,0.26)",
              background: "transparent",
              color: "inherit",
            }}
          />
          <textarea
            value={cBio}
            onChange={(e) => setCBio(e.target.value)}
            placeholder="소개(선택)"
            rows={3}
            style={{
              padding: 10,
              borderRadius: 0,
              border: "1px solid rgba(255,255,255,0.26)",
              background: "transparent",
              color: "inherit",
              resize: "vertical",
            }}
          />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setCFile(e.target.files?.[0] ?? null)}
            style={{
              padding: 10,
              borderRadius: 0,
              border: "1px solid rgba(255,255,255,0.26)",
              background: "transparent",
              color: "inherit",
            }}
          />
          <button
            onClick={createPerson}
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

      {loading && <p style={{ color: "gray" }}>불러오는 중…</p>}

      {/* 3개 한 줄 + 왼쪽 정사각형 사진 + 오른쪽 이름/MBTI */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
        }}
      >
        {people.map((p) => (
          <div key={p.id} style={{ position: "relative" }}>
            <div
              style={{
                display: "flex",
                gap: 12,
                border: "1px solid rgba(255,255,255,0.26)",
                background: "white",
                color: "#0b0c10",
                borderRadius: 0,
                padding: 14,
                alignItems: "center",
                cursor: "pointer",
              }}
              onClick={() => setViewing(p)} // ✅ 누구나 상세 보기
            >
              <div style={{ width: 80, aspectRatio: "1/1", flexShrink: 0 }}>
                <img
                  src={p.avatar_url ?? "https://via.placeholder.com/120"}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: 0,
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                <div style={{ fontWeight: 900, fontSize: 16, lineHeight: 1.2, wordBreak: "break-word" }}>
                  {p.name}
                </div>
                {p.mbti && <div style={{ fontSize: 13 }}>{p.mbti}</div>}
              </div>
            </div>

            {admin && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deletePerson(p.id);
                }}
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  background: "#0b0c10",
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

      {/* ✅ 상세 보기 모달 */}
      {viewing && (
        <div
          onClick={() => setViewing(null)}
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
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 96, aspectRatio: "1/1", flexShrink: 0 }}>
                <img
                  src={viewing.avatar_url ?? "https://via.placeholder.com/160"}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 0 }}
                />
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontWeight: 900, fontSize: 18 }}>{viewing.name}</div>
                {viewing.mbti && <div style={{ fontSize: 13 }}>{viewing.mbti}</div>}
              </div>

              <div style={{ flex: 1 }} />
            </div>

            {viewing.bio && (
              <div style={{ marginTop: 12, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                {viewing.bio}
              </div>
            )}

            {viewing.extra && Object.keys(viewing.extra).length > 0 && (
              <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
                {Object.entries(viewing.extra).map(([k, v]) => (
                  <div key={k}>
                    <span style={{ fontWeight: 800 }}>{k}</span>{" "}
                    <span>{String(v ?? "")}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button
                onClick={() => setViewing(null)}
                style={{
                  padding: 12,
                  borderRadius: 0,
                  border: "1px solid rgba(0,0,0,0.2)",
                  background: "white",
                  cursor: "pointer",
                  fontWeight: 800,
                }}
              >
                닫기
              </button>

              {admin && (
                <>
                  <button
                    onClick={() => {
                      const p = viewing;
                      setViewing(null);
                      openEdit(p);
                    }}
                    style={{
                      padding: 12,
                      borderRadius: 0,
                      border: "1px solid rgba(0,0,0,0.2)",
                      background: "#0b0c10",
                      color: "white",
                      cursor: "pointer",
                      fontWeight: 800,
                    }}
                  >
                    편집
                  </button>
                  <button
                    onClick={() => deletePerson(viewing.id)}
                    style={{
                      padding: 12,
                      borderRadius: 0,
                      border: "1px solid rgba(0,0,0,0.2)",
                      background: "white",
                      cursor: "pointer",
                      fontWeight: 800,
                    }}
                  >
                    삭제
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 편집 모달 */}
      {editing && (
        <div
          onClick={() => setEditing(null)}
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
            <h2 style={{ marginTop: 0 }}>사람 편집</h2>

            <div style={{ display: "grid", gap: 10 }}>
              <input
                value={eName}
                onChange={(e) => setEName(e.target.value)}
                placeholder="이름(필수)"
                style={{
                  padding: 12,
                  borderRadius: 0,
                  border: "1px solid rgba(0,0,0,0.2)",
                }}
              />
              <input
                value={eMbti}
                onChange={(e) => setEMbti(e.target.value)}
                placeholder="MBTI(선택)"
                style={{
                  padding: 12,
                  borderRadius: 0,
                  border: "1px solid rgba(0,0,0,0.2)",
                }}
              />
              <textarea
                value={eBio}
                onChange={(e) => setEBio(e.target.value)}
                placeholder="소개(선택)"
                rows={3}
                style={{
                  padding: 12,
                  borderRadius: 0,
                  border: "1px solid rgba(0,0,0,0.2)",
                  resize: "vertical",
                }}
              />

              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontWeight: 800 }}>사진</div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <img
                    src={eAvatarUrl ?? "https://via.placeholder.com/80"}
                    alt=""
                    style={{ width: 56, height: 56, borderRadius: 0, objectFit: "cover" }}
                  />
                  <input type="file" accept="image/*" onChange={(e) => setEFile(e.target.files?.[0] ?? null)} />
                  {eAvatarUrl && (
                    <button
                      onClick={() => setEAvatarUrl(null)}
                      style={{
                        border: "1px solid rgba(0,0,0,0.2)",
                        background: "white",
                        borderRadius: 0,
                        padding: "10px 12px",
                        cursor: "pointer",
                        fontWeight: 800,
                      }}
                    >
                      사진 제거
                    </button>
                  )}
                </div>
              </div>

              <hr style={{ margin: "8px 0", border: "none", borderTop: "1px solid rgba(0,0,0,0.15)" }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontWeight: 800 }}>추가 정보</div>
                <button
                  onClick={addRow}
                  style={{
                    border: "1px solid rgba(0,0,0,0.2)",
                    background: "white",
                    borderRadius: 0,
                    padding: "10px 12px",
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                >
                  + 항목 추가
                </button>
              </div>

              {eRows.length === 0 ? (
                <div style={{ color: "gray" }}>추가 정보 없음.</div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {eRows.map((r, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 2fr auto",
                        gap: 8,
                        alignItems: "center",
                      }}
                    >
                      <input
                        value={r.key}
                        onChange={(e) => updateRow(idx, { key: e.target.value })}
                        placeholder=" "
                        style={{
                          padding: 12,
                          borderRadius: 0,
                          border: "1px solid rgba(0,0,0,0.2)",
                        }}
                      />
                      <input
                        value={r.value}
                        onChange={(e) => updateRow(idx, { value: e.target.value })}
                        placeholder=" "
                        style={{
                          padding: 12,
                          borderRadius: 0,
                          border: "1px solid rgba(0,0,0,0.2)",
                        }}
                      />
                      <button
                        onClick={() => removeRow(idx)}
                        style={{
                          border: "1px solid rgba(0,0,0,0.2)",
                          background: "white",
                          borderRadius: 0,
                          padding: "10px 12px",
                          cursor: "pointer",
                          fontWeight: 800,
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button
                  onClick={() => setEditing(null)}
                  style={{
                    padding: 12,
                    borderRadius: 0,
                    border: "1px solid rgba(0,0,0,0.2)",
                    background: "white",
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                >
                  닫기
                </button>
                <button
                  onClick={saveEdit}
                  disabled={saving || !admin}
                  style={{
                    padding: 12,
                    borderRadius: 0,
                    border: "1px solid rgba(0,0,0,0.2)",
                    background: "#0b0c10",
                    color: "white",
                    cursor: "pointer",
                    opacity: saving || !admin ? 0.6 : 1,
                    fontWeight: 800,
                  }}
                >
                  {saving ? "저장 중…" : "저장"}
                </button>
              </div>

              {!admin && <div style={{ color: "crimson" }}>관리자만 저장 가능</div>}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
