"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin() {
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("로그인 실패: " + error.message);
      setLoading(false);
      return;
    }

    alert("로그인 성공");
    router.push("/");
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>GANTZ 로그인</h1>

      <div style={{ display: "grid", gap: 10, maxWidth: 400 }}>
        <input
          placeholder="ID"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: 10 }}
        />
        <input
          type="PW"
          placeholder="PW"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: 10 }}
        />
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            padding: 12,
            background: "black",
            color: "white",
            border: "none",
          }}
        >
          로그인
        </button>
      </div>
    </main>
  );
}
