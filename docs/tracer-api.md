<!-- SINH TỰ ĐỘNG từ packages/protocol/src/registry.ts — đừng sửa tay. -->
<!-- Sinh lại bằng: pnpm test (packages/protocol/src/docs.test.ts). -->

# API tracer

Danh mục đầy đủ lớp và method của giao thức lệnh. Thư viện tracer của MỌI ngôn ngữ phải
phơi ra đúng bộ này, và sinh ra command list giống hệt nhau từng byte — bộ tuân thủ ở
`tracers/_conformance/` kiểm chứng điều đó bằng cách chạy thật trên Piston.

## Giao thức

Mỗi lời gọi tracer in ra stdout đúng một dòng:

```
U+001E @AV| {"key":<khóa|null>,"method":<tên>,"args":[...]}
```

Tiền tố `U+001E @AV|` tách kênh lệnh khỏi `print` của người dùng. Thứ tự khóa trong JSON
là cố định: `key`, `method`, `args`. Xem thêm PLAN.md §3.5 về chuẩn hóa số.

## Lệnh khởi tạo

- Tracer: `method` là tên lớp, 0–1 tham số (tiêu đề hiển thị).
- Layout: `method` là tên lớp, 1 tham số (mảng khóa con).

## Lệnh toàn cục (`key` là `null`)

| Method | Số tham số | Ý nghĩa |
|---|---|---|
| `setRoot` | 1 | Đặt object gốc của khung hình |
| `delay` | 1 | Cắt một khung hình, kèm số dòng đang chạy |

## Lớp tracer

### Array1DTracer

| Method | Số tham số |
|---|---|
| `chart` | 1 |
| `depatch` | 1 |
| `deselect` | 1–2 |
| `destroy` | 0 |
| `patch` | 1–2 |
| `reset` | 0 |
| `select` | 1–2 |
| `set` | 0–1 |

### Array2DTracer

| Method | Số tham số |
|---|---|
| `depatch` | 2 |
| `deselect` | 2–4 |
| `deselectCol` | 3 |
| `deselectRow` | 3 |
| `destroy` | 0 |
| `patch` | 2–3 |
| `reset` | 0 |
| `select` | 2–4 |
| `selectCol` | 3 |
| `selectRow` | 3 |
| `set` | 0–1 |

### ChartTracer

| Method | Số tham số |
|---|---|
| `chart` | 1 |
| `depatch` | 1 |
| `deselect` | 1–2 |
| `destroy` | 0 |
| `patch` | 1–2 |
| `reset` | 0 |
| `select` | 1–2 |
| `set` | 0–1 |

### GraphTracer

| Method | Số tham số |
|---|---|
| `addEdge` | 2–5 |
| `addNode` | 1–6 |
| `deselect` | 1–2 |
| `destroy` | 0 |
| `directed` | 0–1 |
| `layoutCircle` | 0 |
| `layoutRandom` | 0 |
| `layoutTree` | 0–2 |
| `leave` | 1–3 |
| `log` | 1 |
| `removeEdge` | 2 |
| `removeNode` | 1 |
| `reset` | 0 |
| `select` | 1–2 |
| `set` | 0–1 |
| `updateEdge` | 2–5 |
| `updateNode` | 1–6 |
| `visit` | 1–3 |
| `weighted` | 0–1 |

### LogTracer

| Method | Số tham số |
|---|---|
| `destroy` | 0 |
| `print` | 1 |
| `printf` | 1+ |
| `println` | 1 |
| `reset` | 0 |
| `set` | 0–1 |

### MarkdownTracer

| Method | Số tham số |
|---|---|
| `destroy` | 0 |
| `reset` | 0 |
| `set` | 0–1 |

### ScatterTracer

| Method | Số tham số |
|---|---|
| `depatch` | 2 |
| `deselect` | 2–4 |
| `deselectCol` | 3 |
| `deselectRow` | 3 |
| `destroy` | 0 |
| `patch` | 2–3 |
| `reset` | 0 |
| `select` | 2–4 |
| `selectCol` | 3 |
| `selectRow` | 3 |
| `set` | 0–1 |

## Lớp layout

### HorizontalLayout

| Method | Số tham số |
|---|---|
| `add` | 1–2 |
| `destroy` | 0 |
| `remove` | 1 |
| `removeAll` | 0 |
| `reset` | 0 |

### VerticalLayout

| Method | Số tham số |
|---|---|
| `add` | 1–2 |
| `destroy` | 0 |
| `remove` | 1 |
| `removeAll` | 0 |
| `reset` | 0 |

## Viết thư viện cho ngôn ngữ mới

1. Tạo `tracers/<id>/<tracerFileName>` phơi ra đúng các lớp và method ở trên.
2. Chỉ dùng thư viện chuẩn — sandbox của Piston không có mạng.
3. Tự tuần tự hóa JSON thay vì dùng thư viện có sẵn: cách in số thực phải khớp
   JavaScript từng ký tự, và phải chặn số nguyên vượt 2^53 ngay tại chỗ.
4. Khai báo `tracerPlacement` trong `config/src/languages/<id>.ts`.
5. Thêm một dòng vào bảng `CASES` của `tracers/_conformance/src/conformance.test.ts`
   và một hằng thuật toán trong `bubbleSort.ts`.
