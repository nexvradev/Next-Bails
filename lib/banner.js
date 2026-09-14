// lib/banner.js — Startup banner for Next-Bails WhatsApp Engine

const gradients = [
  { c1: [140, 90, 255], c2: [90, 200, 255] },  // purple -> electric cyan
  { c1: [0, 210, 255],  c2: [120, 255, 200] }, // cyan -> emerald
  { c1: [255, 80, 150], c2: [255, 180, 100] }, // rose -> peach
  { c1: [255, 180, 0],  c2: [255, 240, 120] }, // amber -> yellow
];

export function printBanner() {
  if (global.__NEXT_BAILS_BANNER_PRINTED__) return;
  global.__NEXT_BAILS_BANNER_PRINTED__ = true;

  const g = gradients[Math.floor(Math.random() * gradients.length)];
  const colorize = (text) =>
    text
      .split('\n')
      .map((line, lIdx, lines) => {
        const lF = lIdx / (lines.length - 1 || 1);
        return line
          .split('')
          .map((ch, cIdx, chars) => {
            const cF = cIdx / (chars.length - 1 || 1);
            const t = (lF + cF) / 2;
            const r = Math.round(g.c1[0] + (g.c2[0] - g.c1[0]) * t);
            const gg = Math.round(g.c1[1] + (g.c2[1] - g.c1[1]) * t);
            const b = Math.round(g.c1[2] + (g.c2[2] - g.c1[2]) * t);
            return `\x1b[38;2;${r};${gg};${b}m${ch}`;
          })
          .join('') + '\x1b[0m';
      })
      .join('\n');

  const bannerText = [
    '  _  _ _____  _______     ___   ___ _    ___ ',
    ' | \\| | __\\ \\/ / _ \\ \\   / /_\\ | _ ) |  / __|',
    ' | .` | _| >  <|   /\\ \\ / / _ \\| _ \\ |__\\__ \\',
    ' |_|\\_|___/_/\\_\\_|_\\ \\_/ /_/ \\_\\___/____|___/',
    '',
    '   </> Selamat datang di Next-Bails WhatsApp Engine </>' ,
    '',
    '   • Library  : Next-Bails (Custom Dual-Core Edition)',
    '   • Version  : 1.0.1 (Interactive Flow + RichResponse)',
    '   • Creator  : Nexvra Dev & Sadako21',
    '   • Build    : Dual ESM / CJS Production',
  ].join('\n');

  console.log('\n' + colorize(bannerText) + '\n');
}
