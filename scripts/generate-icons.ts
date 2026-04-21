/**
 * Generate favicon and PWA icon set from public/nsclogo.webp.
 * Run: npm run icons
 *
 * The source logo has significant transparent whitespace (flagpole and corners).
 * We call .trim() before resizing so the flag fills the icon frame.
 * For apple-touch-icon we use a solid white background because iOS doesn't
 * handle transparent home-screen icons well.
 *
 * If nsclogo.webp is missing, placeholders (navy squares) are generated so the
 * build never breaks. Re-run after adding the real logo file.
 */

import sharp from "sharp";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

const SRC = join(process.cwd(), "public", "nsclogo.webp");
const OUT = join(process.cwd(), "public");

mkdirSync(OUT, { recursive: true });

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 } as const;
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 } as const;
const NAVY = { r: 10, g: 27, b: 61, alpha: 1 } as const;

async function base(size: number): Promise<Buffer> {
  if (existsSync(SRC)) {
    return sharp(SRC)
      .trim()
      .resize(size, size, { fit: "contain", background: TRANSPARENT })
      .png()
      .toBuffer();
  }
  // Placeholder: navy square
  console.warn(`⚠  ${SRC} not found — generating navy placeholder`);
  return sharp({
    create: { width: size, height: size, channels: 4, background: NAVY },
  })
    .png()
    .toBuffer();
}

async function baseWhiteBg(size: number): Promise<Buffer> {
  if (existsSync(SRC)) {
    return sharp(SRC)
      .trim()
      .resize(size, size, { fit: "contain", background: WHITE })
      .flatten({ background: WHITE })
      .png()
      .toBuffer();
  }
  return sharp({
    create: { width: size, height: size, channels: 4, background: NAVY },
  })
    .png()
    .toBuffer();
}

async function run() {
  console.log("Generating icons…");

  // 192×192 transparent PNG
  const buf192 = await base(192);
  await sharp(buf192).toFile(join(OUT, "icon.png"));
  console.log("✓  public/icon.png (192×192)");

  // 512×512 transparent PNG
  const buf512 = await base(512);
  await sharp(buf512).toFile(join(OUT, "icon-512.png"));
  console.log("✓  public/icon-512.png (512×512)");

  // 180×180 apple-touch-icon (solid white background)
  const bufApple = await baseWhiteBg(180);
  await sharp(bufApple).toFile(join(OUT, "apple-touch-icon.png"));
  console.log("✓  public/apple-touch-icon.png (180×180)");

  // favicon.ico — 32×32
  const buf32 = await base(32);
  await sharp(buf32)
    .resize(32, 32)
    .toFile(join(OUT, "favicon.ico"));
  console.log("✓  public/favicon.ico (32×32)");

  console.log("\nDone. Commit public/icon*.png and public/apple-touch-icon.png.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
