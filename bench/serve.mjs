// 인쇄기 두 대를 한 페이지에 세우는 서버.
//
//   node bench/serve.mjs [--old <커밋>] [--new <커밋>] [--port <번호>]
//
//   /old/  옛 인쇄기. 커밋에서 바로 꺼낸다. 기본은 캔버스 2D로 찍던 마지막 커밋이다
//   /new/  새 인쇄기. 기본은 작업 트리이고, 커밋을 주면 그 커밋에서 꺼낸다
//   /      이 폴더. 벤치 페이지
//
// 옛 트리를 따로 떠 둘 필요가 없도록 git에서 바로 읽는다. 결과는 POST /save로
// bench/results/<실행 이름>/ 아래에 쓴다.

import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify, parseArgs } from "node:util";
import { extname, join, normalize, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

const git = promisify(execFile);
const HERE = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(HERE, "..");

// a051816 — 판형 1080, 망점을 캔버스 2D에서 찍던 마지막 커밋
const { values: args } = parseArgs({
  options: {
    old: { type: "string", default: "a051816" },
    new: { type: "string", default: "" },
    port: { type: "string", default: process.env.PORT || "7401" }
  }
});

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg"
};

const SIDES = { old: args.old, new: args.new };

async function short(rev) {
  const { stdout } = await git("git", ["rev-parse", "--short", rev], { cwd: ROOT });
  return stdout.trim();
}

// 무엇과 무엇을 견주는지. 결과에 함께 적어 두어야 나중에 다시 읽을 수 있다.
async function meta() {
  const out = {};
  for (const [side, rev] of Object.entries(SIDES)) {
    if (rev) {
      const { stdout } = await git("git", ["log", "-1", "--format=%h %s", rev], { cwd: ROOT });
      out[side] = { source: "commit", commit: stdout.trim() };
    } else {
      const head = await short("HEAD");
      const { stdout } = await git("git", ["status", "--porcelain", "--", "src", "index.html", "styles.css"], { cwd: ROOT });
      out[side] = { source: "worktree", commit: `${head}${stdout.trim() ? " + 커밋하지 않은 변경" : ""}` };
    }
  }
  return out;
}

async function source(side, path) {
  const rev = SIDES[side];
  if (!rev) return readFile(join(ROOT, path));
  const { stdout } = await git("git", ["show", `${rev}:${path}`], { cwd: ROOT, encoding: "buffer", maxBuffer: 1 << 26 });
  return stdout;
}

const safeName = (name) => /^[\w.-]+$/.test(name || "") && !name.startsWith(".");

const server = createServer(async (request, response) => {
  const url = new URL(request.url, "http://bench.local");

  try {
    if (request.method === "GET" && url.pathname === "/meta") {
      response.writeHead(200, { "content-type": TYPES[".json"], "cache-control": "no-store" }).end(JSON.stringify(await meta()));
      return;
    }

    if (request.method === "POST" && url.pathname === "/save") {
      const run = url.searchParams.get("run");
      const file = url.searchParams.get("file");
      if (!safeName(run) || !safeName(file)) {
        response.writeHead(400).end("bad name");
        return;
      }
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const folder = join(HERE, "results", run);
      await mkdir(folder, { recursive: true });
      await writeFile(join(folder, file), Buffer.concat(chunks));
      response.writeHead(200).end(`bench/results/${run}/${file}`);
      return;
    }

    const [, head, ...rest] = url.pathname.split("/");
    const side = head in SIDES ? head : null;
    const path = normalize(side ? rest.join("/") : url.pathname === "/" ? "index.html" : url.pathname.slice(1));
    if (path.startsWith("..") || isAbsolute(path)) {
      response.writeHead(403).end("forbidden");
      return;
    }

    let body = side ? await source(side, path) : await readFile(join(HERE, path));
    const type = TYPES[extname(path)] || "application/octet-stream";

    // 페이지를 열 때마다 새 도장을 받아 모듈 전체에 옮겨 찍는다. 한 번 연 페이지 안에서는
    // 같은 모듈이 한 벌만 뜨고, 다시 열면 고친 파일이 옛 모듈 뒤에 숨지 않는다.
    const stamp = url.searchParams.get("v");
    if (stamp && type.startsWith("text/javascript")) {
      body = Buffer.from(body.toString("utf8").replace(/from "(\.\.?\/[^"?]+)"/g, (_, specifier) => `from "${specifier}?v=${stamp}"`));
    }

    response.writeHead(200, { "content-type": type, "cache-control": "no-store" }).end(body);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("not found");
  }
});

server.on("error", (error) => {
  if (error.code !== "EADDRINUSE") throw error;
  console.error(`port ${args.port} is already in use. Take another: node bench/serve.mjs --port ${Number(args.port) + 1}`);
  process.exit(1);
});

server.listen(Number(args.port), async () => {
  const sides = await meta();
  console.log(`press bench — http://localhost:${args.port}`);
  console.log(`  old: ${sides.old.commit}`);
  console.log(`  new: ${sides.new.commit}`);
});
