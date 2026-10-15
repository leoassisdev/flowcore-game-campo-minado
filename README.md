# Campo Minado

> O campo minado clássico com primeiro clique sempre seguro, bandeiras por clique direito ou toque longo e três dificuldades. Passatempo certeiro pra telas de espera.

**Ver ao vivo, com preview e manual:** https://flowcoresolucoes.com.br/codigos/game-campo-minado

Criado por **FlowCore Soluções LTDA**.

## Como jogar

- `clique` abrir casa
- `botão direito` `F` marcar bandeira
- `setas` mover o cursor
- `Espaço` `Enter` abrir a casa do cursor
- **No celular:** Toque abre; segure o dedo ou use “Modo bandeira” para marcar.

## Arquivos

- [`src/CampoMinado.tsx`](src/CampoMinado.tsx)

## Como instalar

1. **Tenha um projeto React com Tailwind** Já tem (Vite, Next.js, Remix)? Pule este passo. Se não, crie um em 1 minuto e adicione ./src/**/*.{ts,tsx} ao content do tailwind.config.

   ```bash
   npm create vite@latest minha-app -- --template react-ts
   cd minha-app
   npm install -D tailwindcss@3 postcss autoprefixer
   npx tailwindcss init -p
   ```

2. **Crie o arquivo src/components/CampoMinado.tsx** Copie o conteúdo de `src/CampoMinado.tsx` deste repositório. Ele é um arquivo só, sem dependência além de React.
3. **Use na sua página**

   ```tsx
   import CampoMinado from "./components/CampoMinado";
   
   <CampoMinado accent="#0057FF" variacao="Médio" />
   ```

4. **Personalize** Textos, dados e a cor de destaque (prop accent) são props com valor padrão. Troque pelos da sua marca ou ligue na sua API.

## Tema e cor

Abre em tema claro. Use `tema="escuro"` para o escuro e `accent` para a cor de destaque:

```tsx
<CampoMinado accent="#0057FF" variacao="Médio" />
```

## Licença

MIT. Pode usar em projeto pessoal ou comercial, de graça. A única condição é manter a linha **“Criado por FlowCore Soluções LTDA”** (ou o crédito de adaptação) onde ela está.

---

Precisa disso integrado no seu sistema? A [FlowCore](https://flowcoresolucoes.com.br) desenvolve sob medida.
