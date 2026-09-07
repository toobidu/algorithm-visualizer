# Piston tự host

Lớp thực thi code cho 16 ngôn ngữ không chạy được trong trình duyệt.
JavaScript và TypeScript **không** đi qua đây — chúng chạy thẳng trong Web Worker.

## Dựng

```bash
docker compose -f deploy/piston/docker-compose.yml up -d
pnpm piston:install          # cài gói cho các ngôn ngữ đã bật
pnpm piston:check            # đối chiếu với config/src/languages
```

Lần đầu tải gói khá lâu: mỗi ngôn ngữ vài trăm MB tới hơn 1 GB.
Chỉ cài ngôn ngữ đang cần — xem `deploy/piston/packages.json`.

## Vì sao `privileged: true`

Piston tự tạo namespace và áp cgroup cho tiến trình chạy code người dùng.
Đây là yêu cầu của chính nó, không phải lựa chọn của dự án này.
**Không mở cổng 2000 ra ngoài máy**: nó không có xác thực, ai gọi được cũng chạy được code tùy ý.

## Gỡ

```bash
docker compose -f deploy/piston/docker-compose.yml down -v
```

`-v` xoá luôn volume chứa gói ngôn ngữ đã tải.
