# Algorithm Visualizer

Nền tảng trực quan hóa thuật toán từ chính mã nguồn của bạn: gõ code, bấm Run, xem animation
chạy từng bước và dòng code đang thực thi sáng lên đồng bộ.

Viết lại từ đầu trên Vite + React 19 + TypeScript, dựa trên
[algorithm-visualizer](https://github.com/algorithm-visualizer/algorithm-visualizer) (MIT).

## Chạy

```bash
pnpm install
pnpm dev              # giao diện: http://localhost:5173
```

Chỉ vậy là chạy được JavaScript và TypeScript — chúng thực thi ngay trong Web Worker
của trình duyệt, không cần dịch vụ nào.

### Thêm các ngôn ngữ khác

```bash
docker compose -f deploy/piston/docker-compose.yml up -d
pnpm piston:install   # cài gói ngôn ngữ vào Piston
pnpm dev:gateway      # dịch vụ chạy code: http://127.0.0.1:3001
```

Toàn bộ lệnh dựng, chạy, kiểm tra và tắt: [docs/chay-du-an.md](docs/chay-du-an.md).
Riêng phần Piston: [deploy/piston/README.md](deploy/piston/README.md).

## Trình soạn thảo

Panel bên phải là Monaco (lõi của VS Code). Mở app lên là một file trống — không có bài mẫu,
code bạn gõ được lưu vào `localStorage` nên đóng tab rồi mở lại vẫn còn.

Bấm nút **Phím tắt** ở thanh trên cùng, hoặc `Ctrl+Alt+K` ở bất cứ đâu, để xem bảng phím tắt
đầy đủ ngay trong app. Bảng đó là bản đầy đủ; dưới đây chỉ là phần hay dùng nhất.

| Phím                            | Làm gì                                                                           |
| ------------------------------- | -------------------------------------------------------------------------------- |
| `Ctrl+Alt+K`                    | Mở bảng phím tắt                                                                 |
| `Ctrl+Enter`                    | Chạy code                                                                        |
| `Space`                         | Phát hoặc tạm dừng                                                               |
| `←` / `→`                       | Lùi / tới một bước                                                               |
| `Home` / `End`                  | Về khung đầu / tới khung cuối                                                    |
| `Ctrl+Alt+L` hoặc `Shift+Alt+F` | Định dạng code                                                                   |
| `Ctrl+/`                        | Bật tắt comment dòng, đúng ký hiệu của từng ngôn ngữ                             |
| `Alt+↑` / `Alt+↓`               | Di chuyển cả dòng                                                                |
| `Ctrl+D`                        | Chọn thêm chỗ giống từ đang bôi đen                                              |
| `Ctrl+F`                        | Tìm kiếm trong file                                                              |
| Nút ☀ / ☾                       | Đổi giao diện sáng – tối. Lần đầu theo cài đặt hệ điều hành, sau đó nhớ lựa chọn |
| Nút Hướng dẫn                   | Mở lại tour chỉ dẫn (tự hiện ở lần vào đầu tiên)                                 |
| Ô **Hiệu ứng**                  | Độ biểu cảm của hoạt cảnh: Gọn – Chuyển động – Cánh tay gắp                      |
| `Alt+Click`                     | Thêm con trỏ                                                                     |

Phím của trình phát nghe ở cấp trang, nhưng nhường lại cho ô đang gõ: `Space` khi con trỏ nằm
trong editor vẫn là dấu cách.

### Định dạng code chạy tới đâu

| Mức                                   | Ngôn ngữ                                           |
| ------------------------------------- | -------------------------------------------------- |
| Prettier thật, ngắt dòng theo cú pháp | JavaScript, TypeScript, Java, Markdown, JSON       |
| Chỉ chuẩn hoá thụt lề theo ngoặc nhọn | C++, C#, Dart, Go, Kotlin, PHP, Rust, Scala, Swift |
| Chưa có                               | Python, Ruby, Elixir, Erlang, Racket               |

Java đi qua `prettier-plugin-java` (parser tree-sitter dạng wasm), nạp muộn nên chỉ tải khi bạn
thật sự bấm định dạng. Mức thụt lề không ngắt dòng lại và không đụng vào khoảng trắng giữa dòng —
không có parser thật cho từng ngôn ngữ thì mọi thao tác mạnh tay hơn đều có ngày làm hỏng code.
Nhóm cuối bị bỏ trống có chủ đích: thụt lề của chúng là cú pháp, đoán sai một dòng là đổi luôn ý
nghĩa chương trình; bấm phím định dạng ở đó sẽ báo rõ thay vì im lặng không làm gì.

Đổi dropdown **Ngôn ngữ** sẽ chuyển sang file cùng đuôi nếu đang có; không có thì đổi tên file
đang mở và **giữ nguyên nội dung** — dán code Java vào rồi chọn Java là chạy được ngay.
Muốn viết nhiều ngôn ngữ cùng lúc thì bấm **+** thêm file.

## Tự trực quan hóa

Bật công tắc **Tự trực quan hóa** rồi dán thuật toán bình thường — không cần gọi tracer:

```java
class Solution {
    public int bruteForce(int[] prices) {
        int maxProfit = 0;
        for (int i = 0; i < prices.length; i++) {
            for (int j = i + 1; j < prices.length; j++) {
                int profit = prices[j] - prices[i];
                if (profit > maxProfit) maxProfit = profit;
            }
        }
        return maxProfit;
    }
    public static void main(String[] args) {
        int[] prices = {7, 1, 5, 3, 6, 4};
        System.out.println(new Solution().bruteForce(prices));
    }
}
```

Hệ thống theo dõi biến qua từng dòng và tự suy ra: `prices` là mảng cần vẽ, `i` và `j` là
con trỏ tô sáng, `maxProfit` và `profit` hiện trong panel Biến. Ghi đè bằng comment nếu muốn:

```java
// @viz array prices
// @viz value i
```

### Ngôn ngữ hỗ trợ chế độ này

| Ngôn ngữ               | Cách lấy bước                                | Chạy ở đâu                    |
| ---------------------- | -------------------------------------------- | ----------------------------- |
| JavaScript, TypeScript | Chèn lời gọi vào mã nguồn                    | Web Worker (không cần Docker) |
| Python                 | `sys.settrace` — không đụng vào mã nguồn     | Piston                        |
| Ruby                   | `TracePoint` — không đụng vào mã nguồn       | Piston                        |
| PHP                    | `declare(ticks=1)` — không đụng vào mã nguồn | Piston                        |
| Java                   | Chèn `AvTrace.step(...)` sau mỗi câu lệnh    | Piston                        |
| Go                     | Chèn `AvStep(...)` sau mỗi câu lệnh          | Piston                        |

**Thêm một ngôn ngữ mới vào chế độ này** = một file trong `packages/autoviz/src/adapters/`
cộng một dòng trong `registry.ts`. Không đụng vào gateway, giao diện, hay logic suy vai trò
biến. Với ngôn ngữ dùng ngoặc nhọn thì chỉ cần mô tả vài mẫu regex cho `instrumentBraces` —
phần khó (theo dõi phạm vi theo độ sâu ngoặc) đã viết sẵn một lần dùng chung.

## Trạng thái ngôn ngữ

| Ngôn ngữ               | Chế độ thường (gọi tracer) | Tự trực quan hóa     |
| ---------------------- | -------------------------- | -------------------- |
| JavaScript, TypeScript | ✅ trong trình duyệt       | ✅ trong trình duyệt |
| Python                 | ✅ qua Piston              | ✅ qua Piston        |
| Go                     | ✅ qua Piston              | ✅ qua Piston        |
| Java                   | ✅ qua Piston              | ✅ qua Piston        |
| Ruby                   | ✅ qua Piston              | ✅ qua Piston        |
| PHP                    | ✅ qua Piston              | ✅ qua Piston        |
| C++                    | ✅ qua Piston              | chưa                 |

Bảy ngôn ngữ đầu đã được **bộ tuân thủ kiểm chứng là sinh ra command list giống hệt nhau
từng byte** khi chạy cùng một thuật toán trên Piston thật.

9 ngôn ngữ còn lại (C#, Dart, Elixir, Erlang, Kotlin, Racket, Rust, Scala, Swift) đã khai báo
trong `config/src/languages/` nhưng **chưa có thư viện tracer và chưa có adapter**.
Giao diện tự biết ngôn ngữ nào bấm Run được, và bật được công tắc nào — xem
`GET /api/languages` (trường `runnable`, `inBrowser`, `plainMode`).

## Kiến trúc

Hai đường vào, một engine:

```
CHẾ ĐỘ THƯỜNG                        TỰ TRỰC QUAN HÓA
code có gọi tracer                   code thuần, không gọi gì
  └─> tracers/<ngôn ngữ>/              └─> @av/autoviz: adapter chèn mã / hook lúc chạy
        └─> Web Worker | Piston              └─> Web Worker | Piston
              │                                    └─> chuỗi bước {line, vars}
              │                                          └─> @av/autoviz suy vai trò biến
              └──────────────┬───────────────────────────────────┘
                             ▼
              command list JSON: [{key, method, args}]
                    └─> @av/viz-core: 7 renderer vẽ animation
```

Toàn bộ engine animation không biết gì về ngôn ngữ lập trình — nó chỉ thấy command list.

| Muốn thêm                      | Phải viết                                                                                                               |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Ngôn ngữ mới, chế độ thường    | Thư viện tracer trong `tracers/` + một file trong `config/src/languages/` + một dòng trong bảng `CASES` của bộ tuân thủ |
| Ngôn ngữ mới, tự trực quan hóa | Một adapter trong `packages/autoviz/src/adapters/` + một dòng trong `registry.ts`                                       |

API mà thư viện tracer phải phơi ra: [docs/tracer-api.md](docs/tracer-api.md) — sinh tự động
từ `packages/protocol/src/registry.ts` nên không thể trôi lệch.

`consistency.test.ts` sẽ đỏ nếu `config/src/languages/` và `PLAIN_ADAPTERS` lệch nhau, nên
không thể quên một trong hai chỗ.

| Gói                 | Vai trò                                                       |
| ------------------- | ------------------------------------------------------------- |
| `packages/protocol` | Giao thức lệnh: schema, parser, chunker. Nguồn chân lý        |
| `packages/viz-core` | Tracer model + renderer, TypeScript thuần, không import React |

| `packages/autoviz` | Chế độ tự trực quan hóa: adapter từng ngôn ngữ, suy vai trò biến, sinh lệnh |
| `config` | Mô tả 17 ngôn ngữ, mỗi ngôn ngữ một file |
| `apps/web` | Giao diện. Component viết tay, không dùng thư viện UI — xem [docs/refactor-components.md](docs/refactor-components.md) |
| `apps/gateway` | Ghép tracer + code, gọi Piston, parse kết quả |
| `tracers/*` | Thư viện tracer từng ngôn ngữ |
| `tracers/_conformance` | Chạy cùng thuật toán ở mọi ngôn ngữ, so command list từng byte |

## Kiểm thử

```bash
pnpm test                                              # không cần Docker
pnpm quality                                           # typecheck · lint · format · madge · knip
pnpm bench                                             # đo ngân sách hiệu năng
pnpm e2e                                               # Chromium thật qua Playwright
PISTON_URL=http://localhost:2000/api/v2 pnpm test      # thêm bộ tuân thủ đa ngôn ngữ
```

Kế hoạch chi tiết và 48 hành vi ngầm phải giữ đúng: [PLAN.md](PLAN.md).
API tracer: [docs/tracer-api.md](docs/tracer-api.md).
Ý tưởng nâng cấp hoạt cảnh: [docs/y-tuong-hoat-canh.md](docs/y-tuong-hoat-canh.md).
Tiến độ: [docs/status.md](docs/status.md).

## Giấy phép

MIT. Xem [LICENSE](LICENSE) — giữ nguyên bản quyền của dự án gốc kèm bản quyền của chủ sở hữu mới.
