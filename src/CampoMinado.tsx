// CampoMinado · Criado por FlowCore Soluções LTDA · flowcoresolucoes.com.br/codigos · licença MIT
// Campo minado clássico: abra todas as casas sem mina. O primeiro clique é sempre
// seguro e os números contam as minas vizinhas.
// Controles: clique abre · botão direito ou segurar o dedo marca bandeira · clicar
// num número com as bandeiras certas abre as vizinhas · setas movem o cursor ·
// Espaço ou Enter abre · F marca bandeira · P pausa · no celular, use "Modo bandeira".
// Props:
//   tema?: "claro" | "escuro"   tema inicial (padrão "claro"); o botão sol/lua do HUD alterna
//   onTemaChange?: (tema) => void   avisa quando o jogador troca o tema
//   accent?: string            cor de destaque (padrão "#0057FF")
//   variacao?: "Fácil" | "Médio" | "Difícil" | "Caos"   preset inicial
//   linhas?: number            linhas do tabuleiro
//   colunas?: number           colunas do tabuleiro
//   minas?: number             quantidade de minas
// No Difícil em telas estreitas, o tabuleiro gira (16 colunas x 30 linhas).
// O seletor "Variações" troca o preset ao vivo. Recorde (melhor tempo por
// dificuldade) salvo no localStorage.
// Requisitos: React 18+ e Tailwind CSS 3+. Zero dependências.

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

/* ----------------------------- lógica pura ----------------------------- */

export type Celula = { mina: boolean; vizinhas: number; aberta: boolean; bandeira: boolean };

function vizinhosDe(linhas: number, colunas: number, l: number, c: number): [number, number][] {
  const r: [number, number][] = [];
  for (let dl = -1; dl <= 1; dl++)
    for (let dc = -1; dc <= 1; dc++) {
      if (!dl && !dc) continue;
      const nl = l + dl;
      const nc = c + dc;
      if (nl >= 0 && nc >= 0 && nl < linhas && nc < colunas) r.push([nl, nc]);
    }
  return r;
}

/**
 * Gera o tabuleiro já sabendo o primeiro clique: a casa clicada e as 8 vizinhas
 * ficam sem mina quando há espaço (a casa clicada é sempre segura).
 */
export function criarTabuleiro(
  linhas: number,
  colunas: number,
  minas: number,
  primeiro: [number, number],
  rnd: () => number = Math.random,
): Celula[][] {
  const L = Math.max(1, Math.floor(linhas));
  const C = Math.max(1, Math.floor(colunas));
  const [pl, pc] = primeiro;
  const tab: Celula[][] = Array.from({ length: L }, () =>
    Array.from({ length: C }, () => ({ mina: false, vizinhas: 0, aberta: false, bandeira: false })),
  );
  const total = L * C;
  const clicada = pl >= 0 && pc >= 0 && pl < L && pc < C ? pl * C + pc : -1;
  const n = Math.max(0, Math.min(Math.floor(minas), clicada >= 0 ? total - 1 : total));
  const proibidas = new Set<number>();
  if (clicada >= 0) {
    proibidas.add(clicada);
    for (const [vl, vc] of vizinhosDe(L, C, pl, pc)) proibidas.add(vl * C + vc);
  }
  let cand: number[] = [];
  for (let i = 0; i < total; i++) if (!proibidas.has(i)) cand.push(i);
  if (cand.length < n) {
    cand = [];
    for (let i = 0; i < total; i++) if (i !== clicada) cand.push(i);
  }
  for (let i = 0; i < n; i++) {
    const j = i + Math.min(cand.length - 1 - i, Math.floor(rnd() * (cand.length - i)));
    const t = cand[i];
    cand[i] = cand[j];
    cand[j] = t;
    tab[Math.floor(cand[i] / C)][cand[i] % C].mina = true;
  }
  for (let l = 0; l < L; l++)
    for (let c = 0; c < C; c++) tab[l][c].vizinhas = vizinhosDe(L, C, l, c).filter(([a, b]) => tab[a][b].mina).length;
  return tab;
}

/** Abre uma casa e devolve um NOVO tabuleiro. Casas vazias abrem em cascata (BFS). */
export function revelar(tab: Celula[][], l: number, c: number): Celula[][] {
  const novo = tab.map((linha) => linha.map((cel) => ({ ...cel })));
  const L = novo.length;
  const C = L ? novo[0].length : 0;
  if (l < 0 || c < 0 || l >= L || c >= C) return novo;
  const ini = novo[l][c];
  if (ini.aberta || ini.bandeira) return novo;
  ini.aberta = true;
  if (ini.mina || ini.vizinhas > 0) return novo;
  const fila: [number, number][] = [[l, c]];
  while (fila.length) {
    const [al, ac] = fila.shift() as [number, number];
    for (const [vl, vc] of vizinhosDe(L, C, al, ac)) {
      const v = novo[vl][vc];
      if (v.aberta || v.bandeira || v.mina) continue;
      v.aberta = true;
      if (v.vizinhas === 0) fila.push([vl, vc]);
    }
  }
  return novo;
}

/** Vitória: todas as casas sem mina estão abertas. */
export function venceu(tab: Celula[][]): boolean {
  return tab.every((linha) => linha.every((c) => c.mina || c.aberta));
}

/* ------------------------------ variações ------------------------------ */

type NomeVariacao = "Fácil" | "Médio" | "Difícil" | "Caos";
type Config = { linhas: number; colunas: number; minas: number };

const VARIACOES: Record<NomeVariacao, Config> = {
  Fácil: { linhas: 9, colunas: 9, minas: 10 },
  Médio: { linhas: 16, colunas: 16, minas: 40 },
  Difícil: { linhas: 16, colunas: 30, minas: 99 },
  Caos: { linhas: 12, colunas: 12, minas: 34 },
};

const ROTULO: Record<NomeVariacao, string> = {
  Fácil: "9x9/10",
  Médio: "16x16/40",
  Difícil: "16x30/99",
  Caos: "denso",
};

/* --------------------------------- tema --------------------------------- */

export type Tema = "claro" | "escuro";
// Paleta do tema: vira CSS vars na raiz (classes) e é lida pelo canvas.
const TEMAS: Record<Tema, Record<string, string>> = {
  claro: {
    "--fc-bg": "#F7F8FB", "--fc-surface": "#FFFFFF", "--fc-surface-2": "#F1F4F9",
    "--fc-border": "#E3E8F0", "--fc-border-strong": "#CBD3E1",
    "--fc-text": "#0B1220", "--fc-muted": "#4B5565", "--fc-subtle": "#8A94A6",
    "--fc-pos": "#059669", "--fc-neg": "#E11D48", "--fc-warn": "#D97706",
    "--fc-shadow": "0 1px 2px rgba(16,24,40,.06), 0 12px 32px -16px rgba(16,24,40,.18)",
  },
  escuro: {
    "--fc-bg": "#0B0F17", "--fc-surface": "rgba(255,255,255,0.03)", "--fc-surface-2": "rgba(255,255,255,0.06)",
    "--fc-border": "rgba(255,255,255,0.10)", "--fc-border-strong": "rgba(255,255,255,0.25)",
    "--fc-text": "#FFFFFF", "--fc-muted": "rgba(255,255,255,0.60)", "--fc-subtle": "rgba(255,255,255,0.40)",
    "--fc-pos": "#34D399", "--fc-neg": "#FB7185", "--fc-warn": "#FBBF24",
    "--fc-shadow": "0 24px 48px -24px rgba(0,0,0,.6)",
  },
};

function BotaoTema({ tema, onClick }: { tema: Tema; onClick: () => void }) {
  const escuro = tema === "escuro";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={escuro ? "Ativar modo claro" : "Ativar modo escuro"}
      title={escuro ? "Modo claro" : "Modo escuro"}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--fc-border)] bg-[var(--fc-surface)] text-[var(--fc-muted)] transition-colors hover:border-[var(--fc-border-strong)] hover:text-[var(--fc-text)]"
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        {escuro ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : (
          <path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" />
        )}
      </svg>
    </button>
  );
}

type Props = {
  tema?: Tema;
  onTemaChange?: (tema: Tema) => void;
  accent?: string;
  variacao?: NomeVariacao;
  linhas?: number;
  colunas?: number;
  minas?: number;
};

type Status = "inicio" | "jogando" | "pausado" | "fim";
type Rosto = "normal" | "tenso" | "venceu" | "perdeu";

const CHAVE = "flowcore-campo-minado-recorde";
const LINK = "https://flowcoresolucoes.com.br/codigos";
const GAP = 2;
/** Cores das casas por tema. Escuro = visual original. */
const CORES_CASA = {
  escuro: {
    num: ["", "#4DA3FF", "#34D399", "#FF6B6B", "#A78BFA", "#F59E0B", "#22D3EE", "#F472B6", "#E5E7EB"],
    boom: "#C81E3A", aberta: "#0F1522", fechada: "linear-gradient(160deg, #222C42 0%, #182033 100%)",
    sombraAberta: "inset 0 0 0 1px rgba(255,255,255,0.04)", sombraFechada: "inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -2px 0 rgba(0,0,0,0.35)",
    mina: "#E5E7EB", erro: "#FF4D6D", mastro: "#CBD5E1",
  },
  claro: {
    num: ["", "#1D4ED8", "#047857", "#DC2626", "#6D28D9", "#B45309", "#0E7490", "#BE185D", "#334155"],
    boom: "#E11D48", aberta: "#F7F8FB", fechada: "linear-gradient(160deg, #FFFFFF 0%, #E6EBF3 100%)",
    sombraAberta: "inset 0 0 0 1px #E3E8F0", sombraFechada: "inset 0 1px 0 #FFFFFF, inset 0 -2px 0 rgba(15,23,42,0.14), 0 0 0 1px #D5DCE7",
    mina: "#1E293B", erro: "#E11D48", mastro: "#475569",
  },
} satisfies Record<Tema, Record<string, string | string[]>>;

function lerRecordes(): Record<string, number> {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE) || "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

function salvarRecordes(v: Record<string, number>) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(v));
  } catch {
    /* localStorage indisponível (modo privado, iframe sandbox) */
  }
}

function dimensoes(cfg: Config, nome: NomeVariacao, estreito: boolean): Config {
  const linhas = Math.max(4, Math.min(40, Math.round(cfg.linhas)));
  const colunas = Math.max(4, Math.min(40, Math.round(cfg.colunas)));
  const minas = Math.max(1, Math.min(linhas * colunas - 1, Math.round(cfg.minas)));
  if (nome === "Difícil" && estreito && colunas > linhas) return { linhas: colunas, colunas: linhas, minas };
  return { linhas, colunas, minas };
}

function vazio(d: Config): Celula[][] {
  return Array.from({ length: d.linhas }, () =>
    Array.from({ length: d.colunas }, () => ({ mina: false, vizinhas: 0, aberta: false, bandeira: false })),
  );
}

/* ------------------------------ componente ----------------------------- */

/* ------------------------------ como jogar ------------------------------ */

// Teclas mostradas na tela inicial e na pausa ("ou" vira separador).
const TECLAS: [string[], string][] = [
  [["Clique"], "abrir a casa (num número, abre as vizinhas)"],
  [["Botão direito", "ou", "F"], "marcar bandeira"],
  [["←", "↑", "↓", "→"], "mover o cursor"],
  [["Espaço", "ou", "Enter"], "abrir com o cursor"],
  [["P"], "pausar"],
];
// Versão de toque, mostrada no celular (abaixo do jogo, onde sempre cabe).
const TOQUE = [
  "Toque abre a casa",
  "Segure o dedo para marcar bandeira",
  "ou ligue o Modo bandeira abaixo do jogo",
];
const RESUMO_TECLADO = "Clique abre · botão direito ou F marca bandeira · setas e Espaço pelo teclado · P pausa";
const RESUMO_TOQUE = "Toque abre · segure o dedo para marcar bandeira";

function ComoJogar({ className = "" }: { className?: string }) {
  return (
    <div className={`w-fit max-w-full text-xs text-[var(--fc-muted)] ${className}`}>
      <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--fc-subtle)]">Como jogar</p>
      <div className="hidden grid-cols-[auto_auto] items-center gap-x-3 gap-y-1.5 sm:grid">
        {TECLAS.map(([teclas, acao]) => (
          <div key={acao} className="contents">
            <span className="flex flex-wrap items-center justify-end gap-1">
              {teclas.map((t, i) =>
                t === "ou" ? (
                  <span key={i} className="text-[10px] text-[var(--fc-subtle)]">
                    ou
                  </span>
                ) : (
                  <kbd key={i} className="rounded-md border border-[var(--fc-border)] bg-[var(--fc-surface-2)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--fc-text)]">
                    {t}
                  </kbd>
                ),
              )}
            </span>
            <span className="text-left">{acao}</span>
          </div>
        ))}
      </div>
      <ul className="space-y-1 text-center sm:hidden">
        {TOQUE.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  );
}

export default function CampoMinado({ accent = "#0057FF", tema = "claro", onTemaChange, variacao = "Fácil", linhas, colunas, minas }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [temaAtual, setTemaAtual] = useState<Tema>(tema);
  useEffect(() => setTemaAtual(tema), [tema]);
  const temaRef = useRef<Tema>(tema);
  temaRef.current = temaAtual;
  const alternarTema = () => {
    const novo: Tema = temaAtual === "claro" ? "escuro" : "claro";
    setTemaAtual(novo);
    onTemaChange?.(novo);
    rootRef.current?.focus();
  };
  const areaRef = useRef<HTMLDivElement>(null);

  const inicial: Config = {
    ...VARIACOES[variacao],
    ...(linhas !== undefined && { linhas }),
    ...(colunas !== undefined && { colunas }),
    ...(minas !== undefined && { minas }),
  };

  const [nomeVar, setNomeVar] = useState<NomeVariacao>(variacao);
  const [cfg, setCfg] = useState<Config>(inicial);
  const [largura, setLargura] = useState(720);
  const estreito = largura < 640;
  const [dim, setDim] = useState<Config>(() => dimensoes(inicial, variacao, false));
  const [tab, setTabState] = useState<Celula[][]>(() => vazio(dimensoes(inicial, variacao, false)));
  const [gerado, setGerado] = useState(false);
  const [status, setStatus] = useState<Status>("inicio");
  const [ganhou, setGanhou] = useState(false);
  const [explodida, setExplodida] = useState<[number, number] | null>(null);
  const [tempo, setTempo] = useState(0);
  const [recordes, setRecordes] = useState<Record<string, number>>({});
  const [cursor, setCursor] = useState<[number, number]>([0, 0]);
  const [teclado, setTeclado] = useState(false);
  const [modoBandeira, setModoBandeira] = useState(false);
  const [tenso, setTenso] = useState(false);

  const statusRef = useRef<Status>("inicio");
  const tabRef = useRef(tab);
  const geradoRef = useRef(false);
  const dimRef = useRef(dim);
  const tempoRef = useRef(0);
  const visivelRef = useRef(true);
  const pressRef = useRef<{ timer: number; disparou: boolean; tipo: string }>({ timer: 0, disparou: false, tipo: "mouse" });

  dimRef.current = dim;

  const setTab = useCallback((t: Celula[][]) => {
    tabRef.current = t;
    setTabState(t);
  }, []);

  useEffect(() => setRecordes(lerRecordes()), []);

  const mudarStatus = useCallback((s: Status) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setLargura(w);
    });
    ro.observe(el);
    if (el.clientWidth) setLargura(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => {
      visivelRef.current = e.isIntersecting;
      if (!e.isIntersecting && statusRef.current === "jogando" && geradoRef.current) mudarStatus("pausado");
    });
    io.observe(el);
    return () => io.disconnect();
  }, [mudarStatus]);

  useEffect(() => () => window.clearTimeout(pressRef.current.timer), []);

  const resetar = useCallback(
    (c: Config, nome: NomeVariacao, st: Status) => {
      const d = dimensoes(c, nome, estreito);
      setDim(d);
      dimRef.current = d;
      setTab(vazio(d));
      geradoRef.current = false;
      setGerado(false);
      setGanhou(false);
      setExplodida(null);
      tempoRef.current = 0;
      setTempo(0);
      setCursor([Math.floor(d.linhas / 2), Math.floor(d.colunas / 2)]);
      mudarStatus(st);
    },
    [estreito, mudarStatus, setTab],
  );

  // Gira o Difícil quando a largura muda antes da partida começar.
  useEffect(() => {
    if (geradoRef.current) return;
    const d = dimensoes(cfg, nomeVar, estreito);
    if (d.linhas !== dimRef.current.linhas || d.colunas !== dimRef.current.colunas) {
      setDim(d);
      dimRef.current = d;
      setTab(vazio(d));
    }
  }, [estreito, cfg, nomeVar, setTab]);

  // Cronômetro
  useEffect(() => {
    if (status !== "jogando" || !gerado) return;
    let ultimo = performance.now();
    const id = window.setInterval(() => {
      const agora = performance.now();
      const dt = Math.min(1, (agora - ultimo) / 1000);
      ultimo = agora;
      if (!visivelRef.current || statusRef.current !== "jogando") return;
      tempoRef.current = Math.min(999, tempoRef.current + dt);
      const s = Math.floor(tempoRef.current);
      setTempo((t) => (t !== s ? s : t));
    }, 200);
    return () => window.clearInterval(id);
  }, [status, gerado]);

  const iniciar = useCallback(() => {
    if (statusRef.current === "fim") resetar(cfg, nomeVar, "jogando");
    else mudarStatus("jogando");
    rootRef.current?.focus();
  }, [cfg, nomeVar, mudarStatus, resetar]);

  const finalizar = useCallback(
    (t: Celula[][], venceuJogo: boolean, onde: [number, number] | null) => {
      setGanhou(venceuJogo);
      setExplodida(onde);
      if (venceuJogo) {
        setTab(t.map((linha) => linha.map((c) => (c.mina ? { ...c, bandeira: true } : c))));
        const s = Math.max(1, Math.round(tempoRef.current));
        setTempo(s);
        setRecordes((r) => {
          if (r[nomeVar] && r[nomeVar] <= s) return r;
          const n = { ...r, [nomeVar]: s };
          salvarRecordes(n);
          return n;
        });
      } else setTab(t);
      mudarStatus("fim");
    },
    [mudarStatus, nomeVar, setTab],
  );

  const abrir = useCallback(
    (l: number, c: number) => {
      if (statusRef.current !== "jogando") return;
      let t = tabRef.current;
      if (!geradoRef.current) {
        const d = dimRef.current;
        t = criarTabuleiro(d.linhas, d.colunas, d.minas, [l, c]);
        geradoRef.current = true;
        setGerado(true);
      }
      const cel = t[l]?.[c];
      if (!cel || cel.bandeira) return;
      if (cel.aberta) {
        // Acorde: número com bandeiras suficientes abre as vizinhas.
        if (!cel.vizinhas) return;
        const viz = vizinhosDe(t.length, t[0].length, l, c);
        const bandeiras = viz.filter(([a, b]) => t[a][b].bandeira).length;
        if (bandeiras !== cel.vizinhas) return;
        let novo = t;
        let boom: [number, number] | null = null;
        for (const [a, b] of viz) {
          const v = novo[a][b];
          if (v.aberta || v.bandeira) continue;
          novo = revelar(novo, a, b);
          if (v.mina && !boom) boom = [a, b];
        }
        if (boom) finalizar(novo, false, boom);
        else if (venceu(novo)) finalizar(novo, true, null);
        else setTab(novo);
        return;
      }
      const novo = revelar(t, l, c);
      if (cel.mina) finalizar(novo, false, [l, c]);
      else if (venceu(novo)) finalizar(novo, true, null);
      else setTab(novo);
    },
    [finalizar, setTab],
  );

  const marcar = useCallback(
    (l: number, c: number) => {
      if (statusRef.current !== "jogando" || !geradoRef.current) return;
      const t = tabRef.current;
      const cel = t[l]?.[c];
      if (!cel || cel.aberta) return;
      const novo = t.map((linha) => linha.slice());
      novo[l][c] = { ...cel, bandeira: !cel.bandeira };
      setTab(novo);
    },
    [setTab],
  );

  const acionar = (l: number, c: number) => {
    if (modoBandeira && !tabRef.current[l]?.[c]?.aberta) marcar(l, c);
    else abrir(l, c);
  };

  const trocarVariacao = (n: NomeVariacao) => {
    setNomeVar(n);
    setCfg(VARIACOES[n]);
    resetar(VARIACOES[n], n, "inicio");
    rootRef.current?.focus();
  };

  // Tamanho da casa: cabe na largura, mínimo 26px (rola na horizontal se precisar).
  const celula = Math.max(
    26,
    Math.min(40, Math.floor((largura - GAP * (dim.colunas - 1)) / dim.colunas), Math.floor(560 / dim.linhas)),
  );
  const boardW = dim.colunas * celula + GAP * (dim.colunas - 1);
  const boardH = dim.linhas * celula + GAP * (dim.linhas - 1);
  const rola = boardW > largura;

  const bandeiras = tab.reduce((s, linha) => s + linha.filter((c) => c.bandeira).length, 0);
  const restantes = dim.minas - bandeiras;
  const rosto: Rosto = status === "fim" ? (ganhou ? "venceu" : "perdeu") : tenso ? "tenso" : "normal";
  const recordeAtual = recordes[nomeVar];

  const onKeyDown = (ev: KeyboardEvent<HTMLDivElement>) => {
    const k = ev.key;
    if (k.startsWith("Arrow") || k === " ") ev.preventDefault();
    const s = statusRef.current;
    if (k === "p" || k === "P") {
      if (s === "jogando" && geradoRef.current) mudarStatus("pausado");
      else if (s === "pausado") mudarStatus("jogando");
      return;
    }
    if (s === "inicio" || s === "fim") {
      if (k === " " || k === "Enter") iniciar();
      return;
    }
    if (s === "pausado") {
      if (k === " " || k === "Enter") mudarStatus("jogando");
      return;
    }
    const d: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    const v = d[k];
    if (v) {
      setTeclado(true);
      setCursor(([l, c]) => [(l + v[0] + dim.linhas) % dim.linhas, (c + v[1] + dim.colunas) % dim.colunas]);
      return;
    }
    if (k === " " || k === "Enter") {
      setTeclado(true);
      abrir(cursor[0], cursor[1]);
    } else if (k === "f" || k === "F") {
      setTeclado(true);
      marcar(cursor[0], cursor[1]);
    }
  };

  const onBlur = (ev: FocusEvent<HTMLDivElement>) => {
    if (rootRef.current?.contains(ev.relatedTarget as Node)) return;
    if (statusRef.current === "jogando" && geradoRef.current) mudarStatus("pausado");
  };

  const onCelDown = (ev: PointerEvent, l: number, c: number) => {
    const p = pressRef.current;
    window.clearTimeout(p.timer);
    p.disparou = false;
    p.tipo = ev.pointerType;
    if (ev.button !== 0 || statusRef.current !== "jogando") return;
    setTenso(true);
    if (ev.pointerType === "mouse") return;
    p.timer = window.setTimeout(() => {
      p.disparou = true;
      setTenso(false);
      if (tabRef.current[l]?.[c]?.aberta) return;
      marcar(l, c);
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(15);
    }, 400);
  };

  const onCelUp = () => {
    window.clearTimeout(pressRef.current.timer);
    setTenso(false);
  };

  const clicar = (l: number, c: number) => {
    setTeclado(false);
    setCursor([l, c]);
    if (pressRef.current.disparou) {
      pressRef.current.disparou = false;
      return;
    }
    acionar(l, c);
  };

  const fimPerdeu = status === "fim" && !ganhou;

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      style={{ ...TEMAS[temaAtual], "--accent": accent } as CSSProperties}
      className="relative mx-auto w-full max-w-5xl select-none overflow-hidden rounded-3xl border border-[var(--fc-border)] bg-[var(--fc-bg)] p-3 shadow-[var(--fc-shadow)] text-[var(--fc-text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:p-5"
    >
      {/* HUD */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)] shadow-[0_0_12px_var(--accent)]" />
          <span className="text-sm font-semibold tracking-tight">Campo Minado</span>
          <BotaoTema tema={temaAtual} onClick={alternarTema} />
        </div>
        <div className="flex gap-4 text-xs text-[var(--fc-muted)]">
          <span>
            Pontos <b className="ml-1 font-semibold tabular-nums text-[var(--fc-text)]">{tempo}</b>
          </span>
          <span>
            Recorde <b className="ml-1 font-semibold tabular-nums text-[var(--fc-text)]">{recordeAtual ? `${recordeAtual}s` : "--"}</b>
          </span>
          <span>
            Nível <b className="ml-1 font-semibold tabular-nums text-[var(--fc-text)]">{nomeVar}</b>
          </span>
        </div>
      </div>

      {/* Variações */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[11px] uppercase tracking-wider text-[var(--fc-subtle)]">Variações</span>
        {(Object.keys(VARIACOES) as NomeVariacao[]).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => trocarVariacao(n)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              nomeVar === n
                ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                : "border-[var(--fc-border)] bg-[var(--fc-surface)] text-[var(--fc-muted)] hover:border-[var(--fc-border-strong)] hover:text-[var(--fc-text)]"
            }`}
          >
            {n} <span className="opacity-60">{ROTULO[n]}</span>
          </button>
        ))}
      </div>

      {/* Painel: minas, rosto, tempo, modo bandeira */}
      <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-[var(--fc-border)] bg-[var(--fc-surface)] px-3 py-2">
        <div className="flex items-center gap-2 text-xs text-[var(--fc-muted)]">
          <IconeMina className="h-4 w-4 text-[var(--fc-muted)]" />
          <b className="font-mono text-sm font-semibold tabular-nums text-[var(--fc-text)]">{String(Math.max(-99, restantes)).padStart(3, "0")}</b>
        </div>
        <button
          type="button"
          aria-label="Reiniciar"
          onClick={() => {
            resetar(cfg, nomeVar, "jogando");
            rootRef.current?.focus();
          }}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--fc-border)] bg-[var(--fc-surface-2)] transition hover:bg-[var(--fc-surface-2)]"
        >
          <IconeRosto tipo={rosto} cor={accent} />
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-pressed={modoBandeira}
            onClick={() => {
              setModoBandeira((m) => !m);
              rootRef.current?.focus();
            }}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
              modoBandeira ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--fc-border)] bg-[var(--fc-surface)] text-[var(--fc-muted)] hover:text-[var(--fc-text)]"
            }`}
          >
            <IconeBandeira className="h-3.5 w-3.5" cor="currentColor" mastro="currentColor" />
            <span className="hidden min-[400px]:inline">Modo bandeira</span>
          </button>
          <b className="font-mono text-sm font-semibold tabular-nums text-[var(--fc-text)]">{String(tempo).padStart(3, "0")}</b>
        </div>
      </div>

      {/* Tabuleiro */}
      <div ref={areaRef} className="relative w-full">
        <div className={`relative w-full ${rola ? "overflow-x-auto" : "flex justify-center"}`}>
          <div className="relative" style={{ width: boardW, height: boardH }}>
            <div
              className="grid"
              style={{ gridTemplateColumns: `repeat(${dim.colunas}, ${celula}px)`, gap: GAP }}
              onPointerUp={onCelUp}
              onPointerLeave={onCelUp}
            >
              {tab.map((linha, l) =>
                linha.map((cel, c) => {
                  const foco = teclado && status === "jogando" && cursor[0] === l && cursor[1] === c;
                  const boom = explodida && explodida[0] === l && explodida[1] === c;
                  const mostrarMina = cel.mina && (cel.aberta || (fimPerdeu && !cel.bandeira));
                  const bandeiraErrada = fimPerdeu && cel.bandeira && !cel.mina;
                  const aberta = cel.aberta || mostrarMina;
                  const fs = Math.round(celula * 0.5);
                  const cc = CORES_CASA[temaAtual];
                  return (
                    <button
                      key={`${l}-${c}`}
                      type="button"
                      tabIndex={-1}
                      aria-label={`Linha ${l + 1}, coluna ${c + 1}`}
                      onPointerDown={(ev) => onCelDown(ev, l, c)}
                      onClick={() => clicar(l, c)}
                      onContextMenu={(ev) => {
                        ev.preventDefault();
                        if (pressRef.current.tipo !== "mouse" && pressRef.current.tipo !== "pen") return;
                        marcar(l, c);
                      }}
                      className={`relative flex touch-manipulation items-center justify-center rounded-[5px] font-bold tabular-nums transition-colors ${
                        aberta ? "" : temaAtual === "claro" ? "hover:brightness-95 active:brightness-90" : "hover:brightness-125 active:brightness-90"
                      }`}
                      style={{
                        width: celula,
                        height: celula,
                        fontSize: fs,
                        lineHeight: 1,
                        color: cc.num[cel.vizinhas],
                        background: boom ? cc.boom : aberta ? cc.aberta : cc.fechada,
                        boxShadow: foco
                          ? `0 0 0 2px ${accent}, 0 0 14px -2px ${accent}`
                          : aberta
                            ? cc.sombraAberta
                            : cc.sombraFechada,
                      }}
                    >
                      {mostrarMina ? (
                        <IconeMina className="h-[60%] w-[60%]" style={{ color: boom ? "#fff" : cc.mina }} />
                      ) : cel.bandeira ? (
                        <>
                          <IconeBandeira className="h-[58%] w-[58%]" cor={accent} mastro={cc.mastro} />
                          {bandeiraErrada && (
                            <svg viewBox="0 0 24 24" className="absolute h-[70%] w-[70%]" aria-hidden>
                              <path d="M5 5l14 14M19 5L5 19" stroke={cc.erro} strokeWidth={2.4} strokeLinecap="round" />
                            </svg>
                          )}
                        </>
                      ) : cel.aberta && cel.vizinhas > 0 ? (
                        cel.vizinhas
                      ) : null}
                    </button>
                  );
                }),
              )}
            </div>
          </div>
        </div>

        {status !== "jogando" && (
          <div
            className={`absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl text-center ${
              status === "fim" ? "bg-[color-mix(in_srgb,var(--fc-bg)_55%,transparent)]" : "bg-[color-mix(in_srgb,var(--fc-bg)_90%,transparent)] backdrop-blur-[2px]"
            }`}
          >
            <div className={`flex flex-col items-center gap-3 ${status === "fim" ? "rounded-2xl border border-[var(--fc-border)] bg-[color-mix(in_srgb,var(--fc-bg)_90%,transparent)] px-6 py-5 shadow-2xl" : ""}`}>
              {status === "fim" && (
                <>
                  <IconeRosto tipo={ganhou ? "venceu" : "perdeu"} cor={accent} grande />
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--fc-subtle)]">{ganhou ? "Campo limpo!" : "Boom! Fim de jogo"}</p>
                  {ganhou && <p className="text-4xl font-semibold tabular-nums">{tempo}s</p>}
                  <p className="text-xs text-[var(--fc-muted)]">
                    Recorde ({nomeVar}) <span className="tabular-nums text-[var(--fc-text)]">{recordes[nomeVar] ? `${recordes[nomeVar]}s` : "--"}</span>
                  </p>
                </>
              )}
              {status === "pausado" && <p className="text-lg font-semibold">Pausado</p>}
              {status === "inicio" && (
                <>
                  <p className="text-lg font-semibold">Campo Minado</p>
                  <p className="max-w-[17rem] text-xs text-[var(--fc-muted)]">
                    {dim.colunas}x{dim.linhas} com {dim.minas} minas. O primeiro clique é sempre seguro.
                  </p>
                </>
              )}
              <button
                type="button"
                onClick={() => (status === "pausado" ? (mudarStatus("jogando"), rootRef.current?.focus()) : iniciar())}
                className="rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_8px_32px_-8px_var(--accent)] transition hover:brightness-110"
              >
                {status === "fim" ? "Jogar de novo" : status === "pausado" ? "Continuar" : "Clique para jogar"}
              </button>
              {status === "inicio" || status === "pausado" ? (
                <ComoJogar className="hidden sm:block" />
              ) : (
                <p className="hidden text-[11px] text-[var(--fc-subtle)] sm:block">Clique ou aperte Espaço · P pausa</p>
              )}
              <p className="text-[11px] text-[var(--fc-muted)] sm:hidden">{RESUMO_TOQUE}</p>
              <a href={LINK} target="_blank" rel="noopener" className="text-[10px] text-[var(--fc-subtle)] hover:text-[var(--fc-muted)]">
                Criado por FlowCore Soluções LTDA
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Controles de toque */}
      <div className="mt-4 flex justify-center gap-2 sm:hidden">
        <button
          type="button"
          aria-pressed={modoBandeira}
          onPointerDown={(ev) => {
            ev.preventDefault();
            setModoBandeira((m) => !m);
          }}
          className={`flex h-12 flex-1 touch-none items-center justify-center gap-2 rounded-2xl border text-xs ${
            modoBandeira ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--fc-border)] bg-[var(--fc-surface-2)] text-[var(--fc-muted)]"
          }`}
        >
          <IconeBandeira className="h-4 w-4" cor="currentColor" mastro="currentColor" />
          {modoBandeira ? "Bandeira ligada" : "Modo bandeira"}
        </button>
        <button
          type="button"
          aria-label="Pausar"
          onPointerDown={(ev) => {
            ev.preventDefault();
            const s = statusRef.current;
            if (s === "jogando" && geradoRef.current) mudarStatus("pausado");
            else if (s === "pausado") mudarStatus("jogando");
            else if (s !== "jogando") iniciar();
          }}
          className="flex h-12 w-12 touch-none items-center justify-center rounded-2xl border border-[var(--fc-border)] bg-[var(--fc-surface)] text-[var(--fc-muted)]"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
            <path d={status === "jogando" ? "M7 5h3v14H7zM14 5h3v14h-3z" : "M8 5l11 7-11 7z"} />
          </svg>
        </button>
      </div>

      {/* Como jogar no celular: fica fora do canvas, que é pequeno na tela estreita */}
      {status !== "jogando" && <ComoJogar className="mx-auto mt-4 rounded-2xl border border-[var(--fc-border)] bg-[var(--fc-surface)] px-4 py-3 sm:hidden" />}

      {/* Rodapé com assinatura */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-[var(--fc-border)] pt-3 text-center sm:justify-between sm:text-left">
        <span className="hidden text-[11px] text-[var(--fc-muted)] sm:inline">{RESUMO_TECLADO}</span>
        <span className="text-[11px] text-[var(--fc-muted)] sm:hidden">{RESUMO_TOQUE}</span>
        <a href={LINK} target="_blank" rel="noopener" className="text-[11px] text-[var(--fc-subtle)] transition-colors hover:text-[var(--fc-muted)]">
          Criado por FlowCore Soluções LTDA
        </a>
      </div>
    </div>
  );
}

/* -------------------------------- ícones -------------------------------- */

function IconeMina({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden>
      <path
        d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4M5.3 5.3l2.8 2.8M15.9 15.9l2.8 2.8M5.3 18.7l2.8-2.8M15.9 8.1l2.8-2.8"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="6" fill="currentColor" />
      <circle cx="10" cy="10" r="1.6" fill="#0B0F17" opacity={0.55} />
    </svg>
  );
}

function IconeBandeira({ className, cor, mastro = "#CBD5E1" }: { className?: string; cor: string; mastro?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M7 3v18" stroke={mastro} strokeWidth={2} strokeLinecap="round" />
      <path d="M8 4h10l-3 4 3 4H8z" fill={cor} />
      <path d="M4.5 21h7" stroke={mastro} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

function IconeRosto({ tipo, cor, grande }: { tipo: Rosto; cor: string; grande?: boolean }) {
  const tam = grande ? "h-12 w-12" : "h-7 w-7";
  return (
    <svg viewBox="0 0 32 32" className={tam} aria-hidden>
      <circle cx="16" cy="16" r="13" fill={cor} />
      <circle cx="16" cy="16" r="13" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={1.2} />
      {tipo === "perdeu" ? (
        <path d="M9.5 10.5l4 4M13.5 10.5l-4 4M18.5 10.5l4 4M22.5 10.5l-4 4" stroke="#0B0F17" strokeWidth={2} strokeLinecap="round" />
      ) : tipo === "venceu" ? (
        <path d="M7 11.5h18v1.5l-2 3h-4l-2-2.5h-2l-2 2.5H9l-2-3z" fill="#0B0F17" />
      ) : (
        <>
          <circle cx="11.5" cy="12.5" r="1.8" fill="#0B0F17" />
          <circle cx="20.5" cy="12.5" r="1.8" fill="#0B0F17" />
        </>
      )}
      {tipo === "tenso" ? (
        <circle cx="16" cy="21.5" r="2.6" fill="#0B0F17" />
      ) : tipo === "perdeu" ? (
        <path d="M11 23c2.8-3 7.2-3 10 0" stroke="#0B0F17" strokeWidth={2} fill="none" strokeLinecap="round" />
      ) : (
        <path d="M10.5 19.5c3 3.5 8 3.5 11 0" stroke="#0B0F17" strokeWidth={2} fill="none" strokeLinecap="round" />
      )}
    </svg>
  );
}
