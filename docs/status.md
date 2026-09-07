# Sổ trạng thái

> Do `integrator` sở hữu độc quyền — PLAN.md §5.10. Cập nhật sau **mỗi** lần merge.
> Không agent nào khác được sửa file này.

**Sóng đang mở:** Phase 3 xong · 7 ngôn ngữ chạy chế độ thường · 7 ngôn ngữ chạy tự trực quan hóa
**Hợp đồng đã đóng băng:** `@av/protocol`, `@av/config`, `@av/viz-core`, `PlainAdapter` của `@av/autoviz`
**Kiểm chứng:** 352 test (có Piston) · 17 E2E trên Chromium thật · quality xanh · 6/6 ngân sách hiệu năng · 3/3 ngân sách kích thước gói

---

## Phase 0 — Nền móng

| Step  | Trạng thái   | Agent | Nhánh     | Phụ lục A | Ghi chú                                                                                       |
| ----- | ------------ | ----- | --------- | --------- | --------------------------------------------------------------------------------------------- |
| 0.1.1 | xong         | —     | trực tiếp | —         | pnpm workspace theo cây §6.5                                                                  |
| 0.1.2 | xong         | —     | trực tiếp | —         | `.nvmrc` 22.15.0, `engines.node >=22`                                                         |
| 0.1.3 | xong         | —     | trực tiếp | —         | `tsconfig.base.json` đủ 5 cờ bắt buộc                                                         |
| 0.1.4 | xong         | —     | trực tiếp | —         | ESLint flat, đã kiểm chứng chặn thật 7 vi phạm §5.9                                           |
| 0.1.5 | xong         | —     | trực tiếp | —         | Prettier + `.editorconfig`, LF                                                                |
| 0.1.6 | xong         | —     | trực tiếp | —         | Vitest workspace, ngưỡng theo glob §3.2                                                       |
| 0.1.7 | xong         | —     | trực tiếp | —         | `.husky/pre-commit`, `pre-push`. Kích hoạt sau `git init`                                     |
| 0.1.8 | xong         | —     | trực tiếp | —         | `.gitattributes` ép LF theo §3.5 quy tắc 5                                                    |
| 0.2.1 | xong         | —     | trực tiếp | —         | CI job `quality`                                                                              |
| 0.2.2 | xong         | —     | trực tiếp | —         | CI job `test`, đẩy coverage vào summary                                                       |
| 0.2.3 | xong         | —     | trực tiếp | —         | CI job `security`: pnpm audit + gitleaks                                                      |
| 0.2.4 | xong         | —     | trực tiếp | —         | CI job `bench` + `scripts/check-bench.mjs`, đã chạy thật                                      |
| 0.2.5 | xong         | —     | trực tiếp | —         | Cache pnpm qua `actions/setup-node`                                                           |
| 0.3.1 | xong         | —     | trực tiếp | —         | Schema lệnh bằng Zod                                                                          |
| 0.3.2 | xong         | —     | trực tiếp | —         | `registry.ts`: 7 tracer + 2 layout + 2 lệnh toàn cục, đủ arity                                |
| 0.3.3 | xong         | —     | trực tiếp | —         | Parser có số dòng, dòng hỏng không làm đứt trace                                              |
| 0.3.4 | xong         | —     | trực tiếp | —         | Chunker, có test đối chứng trực tiếp với thuật toán bản cũ                                    |
| 0.3.5 | xong         | —     | trực tiếp | —         | 8 fixture + `syntheticTrace` cho benchmark                                                    |
| 0.3.6 | **bỏ qua**   | —     | —         | —         | Không lấy được trace thật từ site đang chạy; thay bằng test đối chứng thuật toán chunk bản cũ |
| 0.3.7 | xong         | —     | trực tiếp | —         | `docs/tracer-api.md` **sinh tự động** từ `registry.ts`, có test chống trôi lệch               |
| 0.3.8 | xong         | —     | trực tiếp | —         | parse 100k lệnh **139ms** / ngân sách 250ms                                                   |
| 0.4.1 | xong         | —     | trực tiếp | —         | Kiểu `LanguageConfig`                                                                         |
| 0.4.2 | xong         | —     | trực tiếp | —         | 17 ngôn ngữ, mỗi ngôn ngữ một file theo §5.6                                                  |
| 0.4.3 | xong         | —     | trực tiếp | —         | Test ext/id duy nhất, khai báo đầy đủ                                                         |
| 0.4.4 | xong         | —     | trực tiếp | —         | **17/17 gói khớp runtime thật của Piston**                                                    |
| 0.5.x | chưa bắt đầu | —     | —         | —         | Bộ sinh mã tracer. 0.3.7 đã xong nên hết vướng                                                |
| 0.6.x | chưa bắt đầu | —     | —         | —         | Bộ nhận diện mới                                                                              |

---

## Phase 1 — viz-core

| Step        | Trạng thái | Agent | Nhánh     | Phụ lục A      | Ghi chú                                            |
| ----------- | ---------- | ----- | --------- | -------------- | -------------------------------------------------- |
| 1.1.1–1.1.9 | xong       | —     | trực tiếp | 34, 35, 38, 47 | 7 tracer + 2 layout, không import React            |
| 1.2.1–1.2.4 | xong       | —     | trực tiếp | 36, 37, 39     | `layoutRandom` có trần vòng lặp, PRNG có hạt giống |
| 1.2.5       | xong       | —     | trực tiếp | —              | Benchmark bố cục                                   |
| 1.3.1–1.3.6 | xong       | —     | trực tiếp | 46, 48         | `buildScene` trả mô tả hình học, 8 snapshot        |
| 1.4.1–1.4.6 | xong       | —     | trực tiếp | 10, 14, 15, 42 | Keyframe thật, tua ngược O(khoảng cách keyframe)   |

**Ngân sách §4 đo được:**

| Chỉ số                 | Đo              | Ngân sách     |
| ---------------------- | --------------- | ------------- |
| Áp dụng lệnh           | 18,6 triệu/giây | ≥500.000/giây |
| Tua ngược chunk bất kỳ | p99 2,64ms      | ≤120ms p95    |
| layoutTree 10.000 node | 11,06ms         | ≤40ms         |
| layoutRandom 500 node  | 8,12ms          | ≤25ms         |
| parse 100k lệnh        | 136,59ms        | ≤250ms        |

**Sửa hiệu năng đáng kể:** `layoutTree` ban đầu đo 7.903ms so với ngân sách 40ms. Nguyên nhân:
`addNode`/`addEdge` gọi bố cục mỗi lần (ngầm #37) và `findLinkedNodeIds` quét toàn bộ cạnh cho từng
node, thành O(V·E) nhân 20.000 lần. Sửa bằng ba việc: hoãn tính bố cục tới khi có ai đọc vị trí,
dựng chỉ mục kề một lần, và thêm chỉ mục tra cứu O(1) cho node và cạnh. Kết quả nhanh **714 lần**.

**Ba hành vi ngầm mới phát hiện trong Phase 1** (đã thêm vào Phụ lục A):
#46 quy đổi vô cực và làm tròn 3 chữ số, #47 lỗ hổng XSS trong `LogRenderer` bản cũ,
#48 `ScatterRenderer` dùng `Math.random()`.

**Đã làm ngoài kế hoạch trong lúc chạy 0.1:**

| Việc                                      | Lý do                                                                                                                 |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `packages/protocol/src/framing.ts` + test | Cần một module thật để kiểm chứng cổng chất lượng thay vì file giữ chỗ. Đây là §3.5 quy tắc 1, thuộc phạm vi Task 0.3 |
| Chuyển source cũ vào `legacy/`            | Xem mục dưới                                                                                                          |

---

## Phase 2 — Web app

| Step           | Trạng thái | Ghi chú                                                                                    |
| -------------- | ---------- | ------------------------------------------------------------------------------------------ |
| 2.1.1–2.1.5    | xong       | Vite + React 19 + Redux Toolkit + React Router 7, token màu, SCSS Modules                  |
| 2.2.1–2.2.4    | xong       | `ResizableSplit` đệ quy, kéo bằng chuột và bàn phím (ngầm 30–32)                           |
| 2.3.1–2.3.8    | xong       | Monaco nạp chọn lọc, tự gấp theo `commentPrefix` (ngầm 17–18), vạch dòng (15–16), tab (21) |
| 2.4.1–2.4.7    | xong       | Run/Play/Pause/bước/tua/tốc độ, lặp vòng (12), nhảy chunk 1 sau build (13)                 |
| 2.5.1–2.5.4    | xong       | `shouldBuild` chỉ bật với `.md` khi sửa nội dung (ngầm 05–06)                              |
| 2.6.1–2.6.4    | xong       | `saved` so sánh snapshot (01), chặn rời trang (02), tiêu đề tab (45)                       |
| 2.7.1–2.7.4    | xong       | Tìm kiếm fuzzy theo đầu từ hoặc viết tắt (40–41)                                           |
| 2.8.1–2.8.4    | xong       | Web Worker chạy JS/TS, trần 10s và 2 triệu lệnh                                            |
| 2.9.1–2.9.5    | xong       | Chọn tab mặc định (19), cookie `ext` (20), toast                                           |
| 2.4.8          | một phần   | E2E chạy trên Chromium thật; FPS/heap/Lighthouse vẫn chưa đo                               |
| E2E Playwright | xong       | 8 test trên Chromium thật, `pnpm e2e`                                                      |

**Ngân sách §4.1 đo được:**

| Chỉ số                     | Đo        | Ngân sách |
| -------------------------- | --------- | --------- |
| JS ban đầu (gzip)          | 130,42 KB | ≤180 KB   |
| CSS (gzip)                 | 23,54 KB  | ≤40 KB    |
| Monaco (chunk riêng, gzip) | 869,91 KB | ≤900 KB   |

**Sửa kích thước gói:** Monaco ban đầu 994 KB gzip, vượt ngân sách 10%. Nguyên nhân là
`import 'monaco-editor'` kéo theo cả trình biên dịch TypeScript và ~80 ngôn ngữ. Chuyển sang
`edcore.main` cộng đúng 17 ngôn ngữ cần dùng, còn **869,91 KB**.

**Kiểm chứng đường chạy không cần trình duyệt:** `pipeline.test.ts` chạy đúng đoạn mã mà worker
chạy, nhưng trên Node. Nó khẳng định bubble sort thật sự sắp xếp `[5,2,9,1,7,3,8,4]` thành
`[1,2,3,4,5,7,8,9]`, và tua ngược về chunk 1 trả lại đúng mảng gốc.

---

## Phase 3 — Gateway sang Piston

Docker có sẵn trên máy nên phần này **kiểm chứng được thật**, không phải viết chay.

| Step                 | Trạng thái | Ghi chú                                                                                         |
| -------------------- | ---------- | ----------------------------------------------------------------------------------------------- |
| 3.1.1–3.1.4          | xong       | `deploy/piston/`, script `piston:install` / `piston:check`, README                              |
| 3.2.1–3.2.9          | xong       | `apps/gateway`: gọi Piston, áp timeout theo ngôn ngữ, phân biệt 4 loại hỏng, cắt theo trần §4.6 |
| 3.3.1 Python         | xong       | `tracers/python/` — đạt tuân thủ                                                                |
| 3.3.2 C++            | xong       | `tracers/cpp/` header-only — đạt tuân thủ                                                       |
| 3.3.3 Go             | xong       | `tracers/go/` — đạt tuân thủ                                                                    |
| 3.3.4 Ruby           | xong       | `tracers/ruby/` — đạt tuân thủ                                                                  |
| 3.3.5 PHP            | xong       | `tracers/php/` — đạt tuân thủ                                                                   |
| 3.3.6 Java           | xong       | `tracers/java/` — đạt tuân thủ, phải nối vào cuối file                                          |
| 3.3.7                | xong       | Bộ tuân thủ chạy với Piston thật, bảng dữ liệu thay cho khối chép tay                           |
| 3.4.x HTTP + nối web | xong       | Fastify: `/api/run`, `/api/languages`, `/api/health`; Vite proxy; web tự định tuyến             |
| 3.2.10 tải k6        | chưa       | Cần k6                                                                                          |

**Kết quả tuân thủ (Piston thật, `PISTON_URL=http://localhost:2000/api/v2`):**

- Python, C++, Go, Ruby, PHP và Java sinh command list **giống hệt JavaScript từng byte**
  cho bubble sort. Có thêm một phép kiểm bắt mọi ngôn ngữ khớp **lẫn nhau**, không chỉ khớp
  bản vàng — sáu bản cùng sai theo một kiểu thì phép kiểm cũ vẫn xanh.
- `print` của người dùng tách sạch khỏi luồng lệnh.
- Số nguyên vượt 2^53 bị chặn ngay trong thư viện tracer.
- Vòng lặp vô hạn bị dừng trong 3 giây, không treo.

**Ba phát hiện chỉ lộ ra khi chạy Piston thật:**

1. **Tên gói khác tên runtime.** Cài bằng `gcc` nhưng chạy bằng `c++`; `node` → `javascript`;
   `dotnet` → `csharp`. Khai báo một tên là cài trượt mà không hiểu vì sao.
   Đã tách `pistonPackage` khỏi `pistonRuntime` trong `LanguageConfig`.
2. **Piston nối đuôi mở rộng vào MỌI file gửi lên.** `algorithm-visualizer.h` biến thành
   `algorithm-visualizer.h.cpp` nên `#include` không thấy. C++ phải **nhúng thẳng** thư viện
   vào file chính — đó là lý do có `tracerIncludeLine` và `prepareJob`/`rebaseLineNumbers`.
   Go thì **không** cần: Piston biên dịch mọi file `.go` gửi lên nên gửi kèm được.
3. **Nhớ tạm thư viện tracer vĩnh viễn là cái bẫy im lặng.** Sửa `tracers/cpp/*.h` xong mà
   gateway vẫn dùng bản cũ trong bộ nhớ, không có dấu hiệu gì. Đã đổi sang đối chiếu `mtime`.

**Số dòng code trong lệnh `delay` — ba cơ chế khác nhau:**

| Ngôn ngữ   | Lấy số dòng bằng                   | Cách ghép thư viện              |
| ---------- | ---------------------------------- | ------------------------------- |
| JavaScript | Chuỗi ngăn xếp lỗi                 | Chèn phía trên, phải bù offset  |
| Python     | `inspect.currentframe`             | File riêng, không lệch          |
| Ruby       | `caller_locations`                 | File riêng, không lệch          |
| PHP        | `debug_backtrace`                  | File riêng, không lệch          |
| Go         | `runtime.Caller(1)`                | File riêng, không lệch          |
| C++        | Macro `AV_DELAY()` dùng `__LINE__` | Nhúng thẳng, phải bù offset     |
| Java       | `StackWalker`                      | Nối xuống CUỐI file, không lệch |

`tracerPlacement` trong `LanguageConfig` là chỗ khai báo cách ghép, và `prepareJob` chỉ có
đúng ba nhánh tương ứng. Ba giá trị này không phải cho đẹp — mỗi cái sinh ra từ một ràng
buộc thật của Piston đã đâm phải khi chạy.

---

## Chế độ tự trực quan hóa (Phase 5 — Task 5.1)

Người dùng dán thuật toán bình thường, **không gọi tracer nào**, bật công tắc rồi bấm Run.

**Kiến trúc — điểm mấu chốt để về sau còn mở rộng được:** mỗi ngôn ngữ chỉ phải phát ra chuỗi
_bước_ `{line, vars}`. Toàn bộ phần suy ra "vẽ gì" nằm ở `packages/autoviz`, viết một lần bằng
TypeScript. Nhờ vậy 7 ngôn ngữ cho ra cách vẽ giống hệt nhau, không có chuyện mỗi ngôn ngữ
một kiểu, và sửa logic suy vai trò một chỗ là cả 7 ngôn ngữ cùng đổi.

**Hợp đồng mở rộng** (`packages/autoviz/src/adapter.ts`):

```ts
interface PlainAdapter {
  languageId: string;
  strategy: 'runtime-hook' | 'source-instrumentation';
  runtimeFile: string | undefined;
  build(userCode: string, runtime: string): PlainProgram;
}
```

Thêm ngôn ngữ thứ tám = **một file adapter + một dòng trong `registry.ts`**. Không đụng
gateway (`plainMode.ts` chỉ gọi `findAdapter`), không đụng giao diện, không đụng
`inferRoles`/`stepsToCommands`.

| Ngôn ngữ   | Chiến lược               | Cách lấy bước                                 | Lệch số dòng          |
| ---------- | ------------------------ | --------------------------------------------- | --------------------- |
| Python     | `runtime-hook`           | `sys.settrace` — không sửa mã người dùng      | 3 (bọc `try/finally`) |
| Ruby       | `runtime-hook`           | `TracePoint`                                  | số dòng runtime + 2   |
| PHP        | `runtime-hook`           | `declare(ticks=1)` + `register_tick_function` | số dòng runtime       |
| Java       | `source-instrumentation` | Chèn `AvTrace.step(...)` sau mỗi câu lệnh     | 0                     |
| Go         | `source-instrumentation` | Chèn `AvStep(...)`, runtime là file riêng     | 0                     |
| JavaScript | `source-instrumentation` | Chèn `__avStep(...)`, chạy thẳng trong Worker | 0                     |
| TypeScript | `source-instrumentation` | Dùng chung bộ chèn với JavaScript             | 0                     |

**Dùng lại thay vì chép:** Java, Go và JavaScript khác nhau ở cú pháp khai báo biến và cách
viết lời gọi, nhưng giống nhau ở phần khó — theo dõi phạm vi bằng độ sâu ngoặc và nhận ra dòng
nào là câu lệnh thật. Phần đó nằm trong `instrumentBraces.ts`; mỗi ngôn ngữ chỉ mô tả một
`BraceDialect` gồm vài mẫu regex. Ngôn ngữ ngoặc nhọn thứ tư (C++, C#, Rust) sẽ chỉ tốn
đúng phần mô tả đó.

**Suy đoán vai trò biến:** mảng số → panel mảng; mảng hai chiều → lưới; số nguyên nằm trong
khoảng chỉ số của một mảng → con trỏ tô sáng; còn lại → hiện trong panel "Biến".
Người dùng ghi đè được bằng comment `// @viz array prices` — không cần thư viện gì.

**Ba rào cản của Java, chỉ lộ ra khi chạy thật:**

1. **Phạm vi biến.** Truyền `i`, `j` ở dòng `return` ngoài vòng lặp thì Java không biên dịch.
   Phải theo dõi phạm vi bằng độ sâu ngoặc nhọn.
2. **Java chạy class ĐẦU TIÊN trong file.** Đặt runtime lên trước thì nó chạy nhầm `AvTrace`.
   Đặt sau lại vướng: Java bắt mọi `import` phải đứng trước mọi class — nên runtime được
   viết không dùng một câu `import` nào.
3. **Piston chỉ biên dịch file đầu tiên với Java** (chế độ single-file), nên bắt buộc ghép chung.

Runtime Java và Go đều không chứa **một dấu gạch chéo ngược literal nào** — mọi ký tự escape
dựng từ mã số. Escape trong chuỗi đi qua công cụ sinh mã rất dễ sai một lớp mà không ai thấy.

**Chống trôi lệch:** `consistency.test.ts` đối chiếu `plainMode` trong `config/src/languages/`
với `PLAIN_ADAPTERS`. Thêm adapter mà quên khai báo config (hoặc ngược lại) là test đỏ ngay,
nên hai nguồn không thể lệch nhau âm thầm.

**Đã chạy thật qua Piston:** Java 41 khung hình (panel `prices`), Python 36 (panel `arr`),
Ruby 25, PHP 24, Go 19; JavaScript 57 khung hình chạy thẳng trong trình duyệt.
Code Java gốc của người dùng — không sửa một chữ — vẫn in ra `Ket qua: 5 / Trang thai: PASS`
trong khi animation chạy.

---

## Bốn phát hiện của vòng bổ sung Ruby / PHP / Java

1. **Piston thỉnh thoảng giết job bằng SIGKILL dù code không hề chạy quá giờ.** Nó tái dùng
   UID giữa các job và dọn dẹp bằng cách giết mọi tiến trình của UID đó, nên tiến trình còn
   sót của job trước kéo theo job sau; JVM thoát chậm nên Java dính nhiều nhất. Đo 12 lần
   chạy liên tiếp: 1 lần bị SIGKILL mà stdout **đủ y hệt** 11 lần thành công, hết 0,87 giây
   trên ngân sách 10 giây. Gateway đang quy mọi SIGKILL thành "chạy quá giờ" — vừa báo sai
   nguyên nhân, vừa vứt bỏ một trace hoàn chỉnh.

   Thước đo đúng là **thời gian đã trôi**, không phải tín hiệu. Ba nhánh:
   - hết gần ngân sách → quá giờ thật, báo timeout, không chạy lại (chạy lại một vòng lặp
     vô hạn là phí đúng hai lần ngân sách);
   - bị giết sớm mà chưa in gì → chạy lại đúng một lần, vẫn trắng thì nói đúng nguyên nhân;
   - bị giết sớm nhưng đã in xong → nhận kết quả, không chạy lại (chạy lại là in trùng).

   Bộ tuân thủ so từng byte chính là lưới an toàn cho nhánh thứ ba: nhận nhầm một trace cụt
   là đỏ ngay. Đã chạy toàn bộ test 5 lần liên tiếp, 352/352 cả 5 lần.

2. **Java không gửi kèm thư viện được, mà cũng không nhúng lên đầu được.** Piston chạy
   class ĐẦU TIÊN trong file, nên thư viện phải nối xuống CUỐI — và vì Java bắt mọi
   `import` đứng trước mọi class, thư viện không được có một câu `import` nào. Đây là lý do
   `LanguageConfig` có thêm `tracerPlacement` với ba giá trị thay vì một cờ bật/tắt.
3. **Không ngôn ngữ nào dùng được thư viện JSON có sẵn.** `json` của Ruby in số thực nguyên
   là `1.0`, `json_encode` của PHP escape dấu gạch chéo. Khác một ký tự là bộ tuân thủ đỏ,
   nên cả ba đều tự tuần tự hóa.
4. **Danh sách gói Piston cố ý không đủ 17 ngôn ngữ.** `deploy/piston/packages.json` chỉ bật
   những ngôn ngữ đã có thư viện tracer; cài cả 17 tốn hàng GB cho runtime chưa ai dùng
   được. Test đối chiếu Piston trước đây đòi đủ 17 nên đỏ oan — đã sửa để chỉ đòi phần
   `enabled`, và thêm phép kiểm bắt mọi ngôn ngữ trong config phải nằm ở `enabled` hoặc
   `planned` để không ngôn ngữ nào bị bỏ quên.

---

## E2E trên trình duyệt thật

`pnpm e2e` — 17 test trên Chromium qua Playwright (14 hành vi + 3 phép đo). Đây là thứ duy nhất bắt được lỗi CSS và
lỗi tương tác chuột: test jsdom vẫn xanh trong khi thanh chia bị `overflow: hidden` cắt mất.

**Ba lỗi chỉ lộ ra khi nhìn trình duyệt thật:**

1. **Tự gấp khối không hoạt động** (ngầm #17). Ba nguyên nhân chồng nhau, phải bóc từng lớp:
   dấu `{` nằm trong comment nên Monaco không coi là ngoặc để gấp → phải đăng ký
   `FoldingRangeProvider` riêng; vòng lặp đăng ký provider chưa từng được chèn vào file;
   và lệnh gấp chạy trước khi provider tính xong vùng.
2. **Tiếng Việt trong code mẫu mất dấu.** Chuỗi trong template literal không được pass thêm dấu.
3. **`aria-label` nút Play là "Phat".** Chỉ lộ ra khi Playwright tìm nút theo tên.

**Lỗi `Canceled` trong console:** chỉ có ở chế độ dev. Monaco huỷ tác vụ nội bộ khi
StrictMode dựng rồi huỷ editor. Đã kiểm chứng bản production sạch hoàn toàn, nên E2E bỏ qua
đúng chuỗi này thay vì nới lỏng cả phép kiểm tra.

---

## Thư mục `legacy/`

Chứa toàn bộ ứng dụng cũ: `src/`, `public/`, `package.json`, `jsconfig.json`,
`README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `.gitpod.yml`.

**Vì sao giữ:** Phụ lục A ghi lại 45 hành vi, nhưng **không** ghi hình học chi tiết của renderer —
`nodeRadius`, `arrowGap`, `nodeWeightGap`, khoảng đệm, công thức đặt nhãn. Agent Phase 1 cần đối
chiếu `legacy/src/core/renderers/` để bản mới trông đúng như cũ.

**Ràng buộc:**

- Không import bất cứ thứ gì từ `legacy/` vào code mới. Chỉ đọc để tham chiếu.
- Đã loại khỏi ESLint, Prettier, knip, typecheck.
- **Xóa ở Phase 5**, sau khi Task 5.3.5 đo lại toàn bộ §4 xong.

---

## Đã xóa khỏi repo

| Đã xóa                                | Lý do                                       |
| ------------------------------------- | ------------------------------------------- |
| `.git/`                               | Chủ sở hữu tự khởi tạo repo mới             |
| `branding/`                           | Nhận diện thương hiệu của dự án gốc — §12.2 |
| `public/favicon.png`, `public/icons/` | Dẫn xuất từ bộ branding trên                |
| `.github/FUNDING.yml`                 | Chứa link PayPal thật trỏ về tác giả gốc    |
