import "./globals.css";
import "leaflet/dist/leaflet.css";

export const metadata = {
  title: "Heart Tech | Monitoramento, Inclusão e Cuidado",
  description: "Heart Tech - Plataforma acessível de apoio e acompanhamento de pessoas no espectro autista (TEA) e neurodivergências.",
  keywords: ["Heart Tech", "autismo", "TEA", "monitoramento", "rotina visual", "inclusão", "acompanhante", "portador", "cerca virtual"],
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>{children}</body>
    </html>
  );
}
