"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./auth.module.css";

export default function AuthPage({ initialTab = "login" }) {
  const router = useRouter();
  const [tab, setTab]           = useState(initialTab);
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'error'|'success', msg }

  const [loginData, setLoginData] = useState({ name: "", password: "" });
  const [regData, setRegData]     = useState({
    name: "", birthDate: "", role: "acompanhante",
    email: "", confirmEmail: "", phone: "", password: "",
  });

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("mode") === "cadastro") {
      setTab("register");
    }

    const validarSessao = async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        if (!res.ok) return;

        const data = await res.json();
        if (data.authenticated && data.user) {
          localStorage.setItem("nc_user", JSON.stringify(data.user));
          router.replace("/landing");
        }
      } catch (error) {
        console.warn("Não foi possível validar a sessão:", error);
      }
    };

    validarSessao();
  }, [router]);

  /* ============================================================ */
  /* LOGIN                                                        */
  /* ============================================================ */
  const handleLogin = async (e) => {
    e.preventDefault();
    setFeedback(null);

    if (!loginData.name.trim() || !loginData.password.trim()) {
      setFeedback({ type: "error", msg: "Preencha nome/e-mail e senha." });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      });

      const data = await res.json();

      if (!res.ok || !data.success || !data.user) {
        setFeedback({
          type: "error",
          msg: data.error || "Nome/e-mail ou senha incorretos.",
        });
        return;
      }

      localStorage.setItem("nc_user", JSON.stringify(data.user));
      localStorage.removeItem("nc_auth");

      setFeedback({
        type: "success",
        msg: `Bem-vindo(a), ${data.user.name}! Redirecionando...`,
      });

      setTimeout(() => router.push("/landing"), 500);
    } catch (error) {
      console.error("Erro ao realizar login:", error);
      setFeedback({
        type: "error",
        msg: "Não foi possível conectar ao servidor. Verifique o banco de dados e tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  /* ============================================================ */
  /* CADASTRO                                                     */
  /* ============================================================ */
  const handleRegister = async (e) => {
    e.preventDefault();
    setFeedback(null);

    if (!regData.name.trim() || !regData.birthDate || !regData.phone.trim()) {
      setFeedback({ type: "error", msg: "Preencha todos os campos obrigatórios." });
      return;
    }

    if (regData.email.trim().toLowerCase() !== regData.confirmEmail.trim().toLowerCase()) {
      setFeedback({ type: "error", msg: "Os e-mails informados não coincidem." });
      return;
    }

    if (regData.password.length < 6) {
      setFeedback({ type: "error", msg: "A senha deve ter no mínimo 6 caracteres." });
      return;
    }

    setLoading(true);

    const payload = {
      name: regData.name.trim(),
      birthDate: regData.birthDate,
      role: regData.role,
      email: regData.email.trim().toLowerCase(),
      phone: regData.phone.trim(),
      password: regData.password,
    };

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success || !data.user) {
        setFeedback({
          type: "error",
          msg: data.error || "Erro ao cadastrar usuário.",
        });
        return;
      }

      localStorage.setItem("nc_user", JSON.stringify(data.user));
      localStorage.removeItem("nc_auth");

      setFeedback({
        type: "success",
        msg: `Cadastro criado com sucesso! Entrando como ${data.user.role}...`,
      });

      setTimeout(() => router.push("/landing"), 600);
    } catch (error) {
      console.error("Erro ao realizar cadastro:", error);
      setFeedback({
        type: "error",
        msg: "Não foi possível conectar ao servidor. Verifique o banco de dados e tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.authContainer}>
      <Link href="/" className={styles.backHomeFloating}>
        ← Voltar ao Início
      </Link>

      <div className={styles.authCard}>
        {/* BANNER LATERAL */}
        <section className={styles.sideBanner}>
          <div className={styles.brandHeader}>
            <div className={styles.brandLogo}>
              <span className={styles.logoIcon}>❤️</span>
              <span>Heart Tech</span>
            </div>
            <h1 className={styles.bannerTitle}>
              Sua área personalizada por perfil
            </h1>
            <p className={styles.bannerSubtitle}>
              O sistema identifica automaticamente se você é <strong>Portador</strong>, <strong>Acompanhante</strong> ou <strong>Administrador</strong> e abre a tela correspondente.
            </p>
          </div>

          <div className={styles.featuresList}>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>💙</div>
              <div><h4>Portador</h4><p>Rotina visual, seleção de humor e pausa sensorial com respiração guiada.</p></div>
            </div>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>📋</div>
              <div><h4>Acompanhante</h4><p>Monitoramento, metas, mapa em tempo real e central de emergência.</p></div>
            </div>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>⚙️</div>
              <div><h4>Administrador</h4><p>Métricas gerais, gestão de usuários e relatórios da plataforma.</p></div>
            </div>
          </div>
        </section>

        {/* FORMULÁRIOS */}
        <section className={styles.formContainer}>
          {/* TABS */}
          <div className={styles.tabSwitcher}>
            <button type="button"
              className={`${styles.tabButton} ${tab === "login" ? styles.active : ""}`}
              onClick={() => { setTab("login"); setFeedback(null); }}
            >Entrar (Login)</button>
            <button type="button"
              className={`${styles.tabButton} ${tab === "register" ? styles.active : ""}`}
              onClick={() => { setTab("register"); setFeedback(null); }}
            >Criar Cadastro</button>
          </div>

          {/* FEEDBACK */}
          {feedback && (
            <div className={`${styles.feedbackAlert} ${feedback.type === "error" ? styles.alertError : styles.alertSuccess}`}>
              <span>{feedback.type === "error" ? "⚠️" : "✅"}</span>
              <span>{feedback.msg}</span>
            </div>
          )}

          {/* LOGIN */}
          {tab === "login" && (
            <div>
              <div className={styles.formHeader}>
                <h2>Acessar minha conta</h2>
                <p>Informe o nome cadastrado e sua senha para entrar.</p>
              </div>

              <form onSubmit={handleLogin}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Nome de Usuário</label>
                  <div className={styles.inputWrapper}>
                    <span className={styles.inputIcon}>👤</span>
                    <input type="text" required placeholder="Digite seu nome cadastrado"
                      className={styles.textInput}
                      value={loginData.name}
                      onChange={(e) => setLoginData({ ...loginData, name: e.target.value })}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Senha</label>
                  <div className={styles.inputWrapper}>
                    <span className={styles.inputIcon}>🔒</span>
                    <input type={showPwd ? "text" : "password"} required placeholder="••••••••"
                      className={styles.textInput}
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    />
                    <button type="button" className={styles.togglePassBtn} onClick={() => setShowPwd(!showPwd)}>
                      {showPwd ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
                </div>

                <button type="submit" className={styles.submitBtn} disabled={loading} style={{ marginTop: 16 }}>
                  {loading ? "Entrando..." : "Entrar no Sistema →"}
                </button>
              </form>
            </div>
          )}

          {/* CADASTRO */}
          {tab === "register" && (
            <div>
              <div className={styles.formHeader}>
                <h2>Criar nova conta</h2>
                <p>Preencha todos os campos para acessar sua área personalizada.</p>
              </div>

              <form onSubmit={handleRegister}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Nome Completo</label>
                  <div className={styles.inputWrapper}>
                    <span className={styles.inputIcon}>👤</span>
                    <input type="text" required placeholder="Seu nome completo"
                      className={styles.textInput} value={regData.name}
                      onChange={(e) => setRegData({ ...regData, name: e.target.value })} />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Data de Nascimento</label>
                  <div className={styles.inputWrapper}>
                    <span className={styles.inputIcon}>📅</span>
                    <input type="date" required className={styles.textInput} value={regData.birthDate}
                      onChange={(e) => setRegData({ ...regData, birthDate: e.target.value })} />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Perfil / Trabalho</label>
                  <div className={styles.inputWrapper}>
                    <span className={styles.inputIcon}>💼</span>
                    <select className={styles.selectInput} value={regData.role}
                      onChange={(e) => setRegData({ ...regData, role: e.target.value })}>
                      <option value="acompanhante">Acompanhante (Familiar / Cuidador / Terapeuta)</option>
                      <option value="portador">Portador (Pessoa com Deficiência / Neurodivergente)</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>E-mail</label>
                  <div className={styles.inputWrapper}>
                    <span className={styles.inputIcon}>✉️</span>
                    <input type="email" required placeholder="seuemail@exemplo.com"
                      className={styles.textInput} value={regData.email}
                      onChange={(e) => setRegData({ ...regData, email: e.target.value })} />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Confirmação de E-mail</label>
                  <div className={styles.inputWrapper}>
                    <span className={styles.inputIcon}>✉️</span>
                    <input type="email" required placeholder="Repita o e-mail acima"
                      className={styles.textInput} value={regData.confirmEmail}
                      onChange={(e) => setRegData({ ...regData, confirmEmail: e.target.value })} />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Telefone / WhatsApp</label>
                  <div className={styles.inputWrapper}>
                    <span className={styles.inputIcon}>📞</span>
                    <input type="tel" required placeholder="(11) 98765-4321"
                      className={styles.textInput} value={regData.phone}
                      onChange={(e) => setRegData({ ...regData, phone: e.target.value })} />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Senha (mín. 6 caracteres)</label>
                  <div className={styles.inputWrapper}>
                    <span className={styles.inputIcon}>🔒</span>
                    <input type={showPwd ? "text" : "password"} required minLength={6} placeholder="Crie uma senha segura"
                      className={styles.textInput} value={regData.password}
                      onChange={(e) => setRegData({ ...regData, password: e.target.value })} />
                    <button type="button" className={styles.togglePassBtn} onClick={() => setShowPwd(!showPwd)}>
                      {showPwd ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
                </div>

                <button type="submit" className={styles.submitBtn} disabled={loading} style={{ marginTop: 12 }}>
                  {loading ? "Criando conta..." : "Finalizar Cadastro →"}
                </button>
              </form>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
