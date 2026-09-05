// SINH TU DONG boi scripts/gen-barrels.mjs — không sửa tay.
// Chạy lại: pnpm gen:barrels
import { type LanguageConfig } from './types';
import { cpp } from './languages/cpp';
import { csharp } from './languages/csharp';
import { dart } from './languages/dart';
import { elixir } from './languages/elixir';
import { erlang } from './languages/erlang';
import { go } from './languages/go';
import { java } from './languages/java';
import { javascript } from './languages/javascript';
import { kotlin } from './languages/kotlin';
import { php } from './languages/php';
import { python } from './languages/python';
import { racket } from './languages/racket';
import { ruby } from './languages/ruby';
import { rust } from './languages/rust';
import { scala } from './languages/scala';
import { swift } from './languages/swift';
import { typescript } from './languages/typescript';

export const LANGUAGES: readonly LanguageConfig[] = [
  cpp,
  csharp,
  dart,
  elixir,
  erlang,
  go,
  java,
  javascript,
  kotlin,
  php,
  python,
  racket,
  ruby,
  rust,
  scala,
  swift,
  typescript,
];
