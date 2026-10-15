"use client";

import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.pageWrapper}>
      {/* TOP HEADER INSTITUCIONAL */}
      <div className={styles.topBar}>
        <div className={styles.topBarContainer}>
          <div className={styles.topBarItem}>
            <span>❤️</span>
            <span>Heart Tech • Apoio e Difusão do Conhecimento sobre o Transtorno do Espectro Autista (TEA)</span>
          </div>
          <div className={styles.topBarItem}>
            <span>contato@hearttech.com.br</span>
          </div>
        </div>
      </div>

      {/* NAVBAR */}
      <nav className={styles.navbar}>
        <div className={styles.navContainer}>
          <Link href="/" className={styles.navBrand}>
            <div className={styles.brandLogoBox}>
              <div className={styles.puzzleSquare} style={{ background: "#0066c0" }}></div>
              <div className={styles.puzzleSquare} style={{ background: "#f39200" }}></div>
              <div className={styles.puzzleSquare} style={{ background: "#2bb673" }}></div>
              <div className={styles.puzzleSquare} style={{ background: "#e53935" }}></div>
            </div>
            <div className={styles.navBrandTitle}>
              <span className={styles.brandMainText}>Heart Tech</span>
              <span className={styles.brandSubText}>Acompanhamento & Cuidado</span>
            </div>
          </Link>

          <div className={styles.navActions}>
            <Link href="/auth?mode=login" className={styles.loginBtn}>
              Entrar
            </Link>
            <Link href="/auth?mode=cadastro" className={styles.registerBtn}>
              Cadastrar
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO MINIMALISTA & ACOLHEDOR */}
      <main className={styles.heroSection}>
        <div className={styles.heroBadge}>
          <span>💙</span>
          <span>Conhecimento, Acolhimento e Tecnologia Inclusiva</span>
        </div>

        <h1 className={styles.heroTitle}>
          Cuidado e monitoramento para pessoas no{" "}
          <span className={styles.heroTitleHighlight}>Espectro Autista</span>
        </h1>

        <p className={styles.heroSubtitle}>
          Uma plataforma simples e acessível para organizar rotinas diárias com suportes visuais, acompanhar a regulação emocional e aproximar portadores e acompanhantes.
        </p>

        <div className={styles.heroActions}>
          <Link href="/auth?mode=login" className="btn-primary" style={{ padding: "14px 28px" }}>
            <span>Acessar Minha Área</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </Link>

          <Link href="/auth?mode=cadastro" className="btn-accent-yellow" style={{ padding: "14px 28px" }}>
            <span>Fazer Cadastro Gratuito</span>
          </Link>
        </div>
      </main>

      {/* 3 CARDS COM AS CORES CLÁSSICAS DO AUTISMO E REALIDADE */}
      <section className={styles.section}>
        <div className={styles.featuresGrid}>
          {/* Card 1: Azul */}
          <div className={styles.featureCard}>
            <div className={styles.topAccentBlue}></div>
            <div className={`${styles.featureIconBox} ${styles.iconBlue}`}>💙</div>
            <h3>Área do Portador</h3>
            <p>
              Interface com botões grandes, rotina visual interativa com pictogramas, seletor de sentimentos e botão de pausa sensorial.
            </p>
          </div>

          {/* Card 2: Amarelo */}
          <div className={styles.featureCard}>
            <div className={styles.topAccentYellow}></div>
            <div className={`${styles.featureIconBox} ${styles.iconYellow}`}>📋</div>
            <h3>Área do Acompanhante</h3>
            <p>
              Gestão de rotinas e metas, cerca virtual de segurança com mapa em tempo real e canal de emergência para autoridades.
            </p>
          </div>

          {/* Card 3: Verde */}
          <div className={styles.featureCard}>
            <div className={styles.topAccentGreen}></div>
            <div className={`${styles.featureIconBox} ${styles.iconGreen}`}>🤝</div>
            <h3>Inclusão & Segurança</h3>
            <p>
              Landing pages personalizadas e exclusivas para cada perfil de usuário com total proteção e privacidade de dados.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <div>
            ❤️ <strong>Heart Tech</strong> • Tecnologia, acolhimento e difusão de conhecimento para famílias e cuidadores.
          </div>
          <ul className={styles.footerLinks}>
            <li>
              <Link href="/auth?mode=login">Entrar</Link>
            </li>
            <li>
              <Link href="/auth?mode=cadastro">Cadastrar</Link>
            </li>
          </ul>
        </div>
      </footer>
    </div>
  );
}
