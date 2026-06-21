/**
 * Maps file names / extensions to charmed-icons SVGs from src/assets/code/.
 * Import helpers:
 *   getFileIconUrl(name)          – returns an asset URL for a file icon
 *   getFolderIconUrl(name, open)  – returns an asset URL for a folder icon
 */

// ---------------------------------------------------------------------------
// Vite's import.meta.glob pulls every SVG at build-time so we can resolve
// them without any dynamic `require()` hacks.
// ---------------------------------------------------------------------------

const fileIcons = import.meta.glob<{ default: string }>(
  '/src/assets/code/*.svg',
  { eager: true },
);

/** Build a lookup: basename (no path, no ext) -> resolved URL */
function buildMap(
  glob: Record<string, { default: string }>,
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [path, mod] of Object.entries(glob)) {
    // path looks like "/src/assets/code/typescript.svg"
    const basename = path.split('/').pop()!.replace(/\.svg$/, '');
    map[basename] = mod.default;
  }
  return map;
}

const iconMap = buildMap(fileIcons);

// ---------------------------------------------------------------------------
// Folder icon resolution
// ---------------------------------------------------------------------------

/**
 * Well-known folder names → icon key (key used as folder_<key>.svg).
 * Keys are matched case-insensitively against the folder name.
 */
const FOLDER_NAME_MAP: Record<string, string> = {
  // source / code
  src: 'source',
  source: 'source',
  lib: 'lib',
  libs: 'lib',
  'lib-src': 'lib',
  utils: 'util',
  util: 'util',
  helpers: 'util',
  hooks: 'hooks',
  components: 'component',
  component: 'component',
  ui: 'component',
  layouts: 'layout',
  layout: 'layout',
  pages: 'page',
  page: 'page',
  routes: 'routes',
  routing: 'routes',
  middleware: 'middleware',
  middlewares: 'middleware',
  services: 'service',
  service: 'service',
  api: 'server',
  server: 'server',
  backend: 'server',
  client: 'client',
  frontend: 'client',
  providers: 'provider',
  provider: 'provider',
  contexts: 'context',
  context: 'context',
  models: 'model',
  model: 'model',
  schemas: 'model',
  types: 'types',
  type: 'types',
  interfaces: 'types',
  constants: 'constant',
  constant: 'constant',
  config: 'config',
  configs: 'config',
  configuration: 'config',
  scripts: 'script',
  script: 'script',
  tools: 'script',
  functions: 'function',
  function: 'function',
  'cloud-functions': 'function',
  events: 'event',
  event: 'event',
  effects: 'effects',
  // assets
  assets: 'assets',
  static: 'assets',
  public: 'assets',
  images: 'image',
  image: 'image',
  img: 'image',
  imgs: 'image',
  photos: 'image',
  icons: 'image',
  videos: 'video',
  video: 'video',
  media: 'image',
  audio: 'audio',
  fonts: 'fonts',
  font: 'fonts',
  svg: 'svg',
  svgs: 'svg',
  // data
  database: 'database',
  db: 'database',
  databases: 'database',
  json: 'json',
  data: 'json',
  // docs
  docs: 'docs',
  doc: 'docs',
  documentation: 'docs',
  wiki: 'docs',
  // tests
  tests: 'test',
  test: 'test',
  __tests__: 'test',
  spec: 'test',
  specs: 'test',
  e2e: 'test',
  coverage: 'coverage',
  benchmark: 'benchmark',
  benchmarks: 'benchmark',
  // build / dist
  dist: 'dist',
  build: 'dist',
  out: 'dist',
  output: 'dist',
  bin: 'bin',
  target: 'bin',
  release: 'dist',
  // packages / modules
  packages: 'package',
  package: 'package',
  modules: 'module',
  module: 'module',
  'node_modules': 'node',
  // tooling
  '.github': 'github',
  '.vscode': 'vscode',
  '.vscode-test': 'vscode',
  storybook: 'storybook',
  '.storybook': 'storybook',
  // content / templates
  templates: 'template',
  template: 'template',
  content: 'content',
  contents: 'content',
  // marketing
  marketing: 'marketing',
  // auth
  auth: 'auth',
  authentication: 'auth',
  authorization: 'auth',
  security: 'auth',
  // animations
  animations: 'animation',
  animation: 'animation',
  // connection
  connections: 'connection',
  connection: 'connection',
  websocket: 'connection',
  // admin
  admin: 'admin',
  administration: 'admin',
  // builder
  builder: 'builder',
  // camera
  camera: 'camera',
  // changesets
  '.changeset': 'changesets',
  changesets: 'changesets',
  // input
  input: 'input',
  inputs: 'input',
  // javascript
  js: 'javascript',
  javascript: 'javascript',
  // typescript
  ts: 'typescript',
  typescript: 'typescript',
  // luau / lune / roblox
  luau: 'luau',
  lune: 'lune',
  roblox: 'roblox',
  // styles
  styles: 'styles',
  style: 'styles',
  css: 'styles',
  // temp
  tmp: 'temp',
  temp: 'temp',
  temporary: 'temp',
  // web
  web: 'web',
  webapp: 'web',
  // yarn
  '.yarn': 'yarn',
  yarn: 'yarn',
  // errors
  errors: 'error',
  error: 'error',
  exceptions: 'error',
  // nuxt
  nuxt: 'nuxt',
  '.nuxt': 'nuxt',
};

/** Resolve a folder icon URL. Falls back to a plain folder SVG. */
export function getFolderIconUrl(folderName: string, isOpen: boolean): string {
  const lower = folderName.toLowerCase();
  const key = FOLDER_NAME_MAP[lower];
  if (key) {
    const variant = isOpen ? `folder_${key}_open` : `folder_${key}`;
    if (iconMap[variant]) return iconMap[variant];
  }
  // Default folder icons
  return isOpen
    ? (iconMap['_folder_open'] ?? '')
    : (iconMap['_folder'] ?? '');
}

// ---------------------------------------------------------------------------
// File icon resolution
// ---------------------------------------------------------------------------

/** Exact filename matches (checked first, case-insensitive). */
const FILE_NAME_MAP: Record<string, string> = {
  // git
  '.gitignore': 'git',
  '.gitattributes': 'git',
  '.gitmodules': 'git',
  // docker
  dockerfile: 'docker',
  'docker-compose.yml': 'docker',
  'docker-compose.yaml': 'docker',
  'docker-compose.dev.yml': 'docker',
  'docker-compose.prod.yml': 'docker',
  // node / npm / yarn / bun
  'package.json': 'npm',
  'package-lock.json': 'npm-lock',
  '.npmrc': 'npm',
  '.nvmrc': 'node',
  '.node-version': 'node',
  'yarn.lock': 'yarn-lock',
  '.yarnrc': 'yarn',
  '.yarnrc.yml': 'yarn',
  'bun.lockb': 'bun-lock',
  'bunfig.toml': 'bun',
  // config files
  '.env': 'config',
  '.env.local': 'config',
  '.env.development': 'config',
  '.env.production': 'config',
  '.env.test': 'config',
  '.editorconfig': 'config',
  '.eslintrc': 'eslint',
  '.eslintrc.js': 'eslint',
  '.eslintrc.cjs': 'eslint',
  '.eslintrc.json': 'eslint',
  '.eslintrc.yml': 'eslint',
  '.eslintignore': 'eslint',
  // tailwind
  'tailwind.config.js': 'tailwind',
  'tailwind.config.ts': 'tailwind',
  'tailwind.config.cjs': 'tailwind',
  // vite
  'vite.config.js': 'vite',
  'vite.config.ts': 'vite',
  // next
  'next.config.js': 'next',
  'next.config.ts': 'next',
  'next.config.mjs': 'next',
  // tsconfig
  'tsconfig.json': 'typescript-config',
  'tsconfig.base.json': 'typescript-config',
  'tsconfig.build.json': 'typescript-config',
  // rust / cargo
  'cargo.toml': 'rust-config',
  'cargo.lock': 'rust-config',
  // go
  'go.mod': 'go-mod',
  'go.sum': 'go-mod',
  // license
  license: 'license',
  'license.md': 'license',
  'license.txt': 'license',
  copying: 'license',
  // readme
  'readme.md': 'readme',
  readme: 'readme',
  'readme.txt': 'readme',
  // changelog
  'changelog.md': 'changelog',
  changelog: 'changelog',
  'changes.md': 'changelog',
  // security
  'security.md': 'security',
  security: 'security',
  // code of conduct
  'code_of_conduct.md': 'code-of-conduct',
  'code-of-conduct.md': 'code-of-conduct',
  // codeowners
  codeowners: 'codeowners',
  '.codeowners': 'codeowners',
  // todo
  'todo.md': 'todo',
  todo: 'todo',
  // makefile
  makefile: 'makefile',
  gnumakefile: 'makefile',
  // just
  justfile: 'just',
  '.justfile': 'just',
  // drizzle
  'drizzle.config.ts': 'drizzle-orm',
  'drizzle.config.js': 'drizzle-orm',
  // astro config
  'astro.config.mjs': 'astro-config',
  'astro.config.ts': 'astro-config',
  // lua / luau config
  '.luaurc': 'luau-config',
  '.luarc.json': 'lua-config',
  // roblox
  'default.project.json': 'roblox-config',
  'wally.toml': 'wally',
  'wally.lock': 'wally-lock',
  // visual studio
  '.vscodeignore': 'vscode',
  // storybook
  '.storybook/main.js': 'storybook',
  '.storybook/main.ts': 'storybook',
};

/** Extension → icon key. */
const EXT_MAP: Record<string, string> = {
  // web
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'scss',
  less: 'css',
  pcss: 'pcss',
  // javascript
  js: 'javascript',
  jsx: 'react',
  mjs: 'javascript',
  cjs: 'javascript',
  // typescript
  ts: 'typescript',
  tsx: 'react-typescript',
  mts: 'typescript',
  cts: 'typescript',
  // type definitions
  'd.ts': 'typescript-def',
  'd.mts': 'typescript-def',
  // javascript config
  'config.js': 'javascript-config',
  'config.ts': 'typescript-config',
  // react
  // already covered by jsx/tsx above
  // svelte / vue / astro / nuxt
  svelte: 'svelte',
  vue: 'vue',
  astro: 'astro',
  // rust
  rs: 'rust',
  // c / cpp
  c: 'c',
  h: 'c-header',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp-header',
  hh: 'cpp-header',
  hxx: 'cpp-header',
  // c#
  cs: 'cs',
  // go
  go: 'go',
  // python
  py: 'python',
  pyw: 'python',
  // ruby
  rb: 'ruby',
  // java / kotlin
  java: 'java',
  kt: 'kotlin',
  kts: 'kotlin',
  // swift
  swift: 'swift',
  // php
  php: 'php',
  // dart
  dart: 'dart',
  // scala
  scala: 'scala',
  // lua / luau
  lua: 'lua',
  luau: 'luau',
  // shell
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  fish: 'shell',
  ps1: 'powershell',
  psm1: 'powershell',
  // haskell (falls back to generic)
  // zig
  zig: 'zig',
  // gleam
  gleam: 'gleam',
  // odin
  odin: 'odin',
  // nim
  nim: 'nim',
  // julia
  jl: 'julia',
  // perl
  pl: 'perl',
  pm: 'perl',
  // hcl / terraform
  tf: 'terraform',
  hcl: 'hcl',
  // nix
  nix: 'nix',
  // data / config
  json: 'json',
  jsonc: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  ini: 'config',
  cfg: 'config',
  conf: 'config',
  xml: 'xml',
  csv: 'csv',
  sql: 'database',
  db: 'database',
  // markdown / text / docs
  md: 'markdown',
  mdx: 'markdownx',
  markdown: 'markdown',
  txt: 'text',
  tex: 'latex',
  // images
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  bmp: 'image',
  ico: 'image',
  svg: 'svg',
  avif: 'image',
  tiff: 'image',
  tif: 'image',
  heic: 'image',
  heif: 'image',
  // video
  mp4: 'video',
  webm: 'video',
  mov: 'video',
  mkv: 'video',
  avi: 'video',
  // audio
  mp3: 'audio',
  wav: 'audio',
  ogg: 'audio',
  flac: 'audio',
  aac: 'audio',
  // fonts
  ttf: 'font',
  otf: 'font',
  woff: 'font',
  woff2: 'font',
  // archives / binary
  zip: 'zip',
  tar: 'zip',
  gz: 'zip',
  rar: 'zip',
  '7z': 'zip',
  // pdf
  pdf: 'pdf',
  // key / cert
  pem: 'key',
  crt: 'key',
  cer: 'key',
  key: 'key',
  // lock
  lock: 'lock',
  // workflow / CI
  // (yaml handled above; this is for .yml in .github/workflows)
  // godot
  gd: 'godot',
  tres: 'godot-assets',
  tscn: 'godot-assets',
  // assembly
  asm: 'assembly',
  s: 'assembly',
  // wasm
  wasm: 'web-assembly',
  wat: 'web-assembly',
  // fortran
  f: 'fortran',
  f90: 'fortran',
  f95: 'fortran',
  f03: 'fortran',
  for: 'fortran-fixed',
  f77: 'fortran-fixed',
};

/** Resolve a file icon URL given the file name. */
export function getFileIconUrl(fileName: string): string {
  const lower = fileName.toLowerCase();

  // 1. Exact filename match
  if (FILE_NAME_MAP[lower] && iconMap[FILE_NAME_MAP[lower]]) {
    return iconMap[FILE_NAME_MAP[lower]];
  }

  // 2. Check compound extension (e.g. "d.ts", "config.ts")
  const dotParts = lower.split('.');
  if (dotParts.length >= 3) {
    const compound = dotParts.slice(-2).join('.');
    if (EXT_MAP[compound] && iconMap[EXT_MAP[compound]]) {
      return iconMap[EXT_MAP[compound]];
    }
  }

  // 3. Extension match
  const ext = dotParts.pop();
  if (ext && EXT_MAP[ext] && iconMap[EXT_MAP[ext]]) {
    return iconMap[EXT_MAP[ext]];
  }

  // 4. Fallback
  return iconMap['_file'] ?? '';
}
