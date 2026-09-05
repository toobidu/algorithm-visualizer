import { describe, expect, it } from 'vitest';
import {
  extensionOf,
  LANGUAGES,
  languageByExt,
  languageById,
  languageOfFile,
  runsInBrowser,
  SUPPORTED_EXTENSIONS,
} from './index';

describe('danh muc ngon ngu — Task 0.4.3', () => {
  it('co du 17 ngon ngu', () => {
    expect(LANGUAGES).toHaveLength(17);
  });

  it('moi ext la duy nhat', () => {
    const exts = LANGUAGES.map((l) => l.ext);
    expect(new Set(exts).size).toBe(exts.length);
  });

  it('moi id la duy nhat', () => {
    const ids = LANGUAGES.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(LANGUAGES.map((l) => [l.id, l] as const))('%s khai bao day du', (_id, language) => {
    expect(language.pistonPackage).not.toBe('');
    expect(language.pistonRuntime).not.toBe('');
    expect(language.commentPrefix).not.toBe('');
    expect(language.tracerFileName).not.toBe('');
    expect(language.mainFileName).toContain('.');
    expect(language.compileTimeoutMs).toBeGreaterThan(0);
    expect(language.runTimeoutMs).toBeGreaterThan(0);
  });
});

describe('tên gói khác tên runtime — bẫy khi cài Piston', () => {
  it.each([
    ['cpp', 'gcc', 'c++'],
    ['javascript', 'node', 'javascript'],
    ['csharp', 'dotnet', 'csharp'],
  ])('%s cài bằng gói %s nhưng chạy bằng runtime %s', (id, pkg, runtime) => {
    expect(languageById(id)?.pistonPackage).toBe(pkg);
    expect(languageById(id)?.pistonRuntime).toBe(runtime);
  });

  it('có ít nhất một ngôn ngữ mà hai tên khác nhau', () => {
    const differing = LANGUAGES.filter((l) => l.pistonPackage !== l.pistonRuntime);
    expect(differing.length).toBeGreaterThan(0);
  });
});

describe('timeout theo PLAN.md §4.6', () => {
  it('Kotlin va Scala duoc nang len 45s vi vuot mac dinh 10s cua Piston', () => {
    expect(languageById('kotlin')?.compileTimeoutMs).toBe(45_000);
    expect(languageById('scala')?.compileTimeoutMs).toBe(45_000);
  });

  it('cac ngon ngu con lai dung 15s', () => {
    const others = LANGUAGES.filter((l) => l.id !== 'kotlin' && l.id !== 'scala');
    for (const language of others) {
      expect(language.compileTimeoutMs).toBe(15_000);
    }
  });
});

describe('commentPrefix — sua loi ngam #17', () => {
  it.each([
    ['python', '#'],
    ['ruby', '#'],
    ['elixir', '#'],
    ['erlang', '%'],
    ['racket', ';'],
    ['cpp', '//'],
  ])('%s dung ky hieu %s', (id, prefix) => {
    expect(languageById(id)?.commentPrefix).toBe(prefix);
  });

  it('khong phai moi ngon ngu deu dung //', () => {
    const prefixes = new Set(LANGUAGES.map((l) => l.commentPrefix));
    expect(prefixes.size).toBeGreaterThan(1);
  });
});

describe('tra cuu', () => {
  it('extensionOf lay dung duoi file', () => {
    expect(extensionOf('code.py')).toBe('py');
    expect(extensionOf('a.b.tar.gz')).toBe('gz');
    expect(extensionOf('khongcoduoi')).toBeUndefined();
  });

  it('languageOfFile nhan dien qua ten file', () => {
    expect(languageOfFile('Main.java')?.id).toBe('java');
    expect(languageOfFile('README.md')).toBeUndefined();
  });

  it('languageByExt xu ly dau vao undefined', () => {
    expect(languageByExt(undefined)).toBeUndefined();
    expect(languageByExt('rs')?.name).toBe('Rust');
  });

  it('languageById tra undefined khi khong co', () => {
    expect(languageById('cobol')).toBeUndefined();
  });

  it('SUPPORTED_EXTENSIONS khop so luong ngon ngu', () => {
    expect(SUPPORTED_EXTENSIONS).toHaveLength(LANGUAGES.length);
  });
});

describe('runsInBrowser — §4.5', () => {
  it('chi JavaScript va TypeScript chay trong Worker', () => {
    const inBrowser = LANGUAGES.filter(runsInBrowser).map((l) => l.id);
    expect(inBrowser).toEqual(['javascript', 'typescript']);
  });
});

describe('tracerPlacement — ba cách ghép, mỗi cách một ràng buộc thật', () => {
  it('chỉ ngôn ngữ ghép kiểu inline mới cần dòng khai báo thư viện', () => {
    for (const language of LANGUAGES) {
      if (language.tracerPlacement === 'inline') {
        expect(language.tracerIncludeLine).toBeDefined();
      } else {
        expect(language.tracerIncludeLine).toBeUndefined();
      }
    }
  });

  it('C++ phải nhúng thẳng: Piston nối đuôi .cpp vào mọi file gửi kèm', () => {
    expect(languageById('cpp')?.tracerPlacement).toBe('inline');
  });

  it('Java phải nối xuống cuối: Piston chạy class đầu tiên trong file', () => {
    expect(languageById('java')?.tracerPlacement).toBe('append');
  });

  it('các ngôn ngữ còn lại gửi kèm file riêng', () => {
    const others = LANGUAGES.filter((l) => l.id !== 'cpp' && l.id !== 'java');
    for (const language of others) {
      expect(language.tracerPlacement).toBe('separate-file');
    }
  });
});

describe('che do dan code thuan — Phase 5', () => {
  it('đúng 7 ngôn ngữ hỗ trợ tự trực quan hóa', () => {
    const full = LANGUAGES.filter((l) => l.plainMode === 'full').map((l) => l.id);
    expect(full.sort()).toEqual([
      'go',
      'java',
      'javascript',
      'php',
      'python',
      'ruby',
      'typescript',
    ]);
  });

  it('không còn ngôn ngữ nào ở trạng thái hỗ trợ một phần', () => {
    expect(LANGUAGES.filter((l) => l.plainMode === 'partial')).toEqual([]);
  });
});
