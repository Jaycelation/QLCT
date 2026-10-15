# QLCT: Quản lý chi tiêu cá nhân

Ứng dụng web quản lý tài chính cá nhân: ghi thu chi, ngân sách, mục tiêu tiết kiệm, báo cáo và xuất CSV/Excel. Giao diện mặc định tiếng Việt (có tiếng Anh), tiền tệ VND, hỗ trợ sáng/tối và điện thoại.

## Tính năng

- **Tổng quan**: số dư, thu/chi tháng, tiết kiệm ròng, so sánh với tháng trước, biểu đồ xu hướng, thu vs chi, cơ cấu theo danh mục, giao dịch gần đây.
- **Giao dịch**: thêm/sửa/xóa, tìm kiếm, lọc theo loại, tài khoản, danh mục, phương thức thanh toán và khoảng ngày; sắp xếp theo ngày hoặc số tiền. Nhập nhanh số tiền kiểu `150k`, `2tr`, `1.5tr`.
- **Tài khoản và danh mục**: nhiều tài khoản (tiền mặt, ngân hàng, ví điện tử, thẻ tín dụng), danh mục mặc định có dịch và danh mục tự tạo với biểu tượng, màu.
- **Giao dịch định kỳ**: hằng ngày/tuần/tháng/năm, tạm dừng, tiếp tục. Giao dịch được tạo tự động khi mở app hoặc bằng job định kỳ.
- **Ngân sách**: ngân sách tổng hoặc theo danh mục, ngưỡng cảnh báo, dự báo cuối tháng, kế hoạch vs thực tế.
- **Mục tiêu tiết kiệm**: góp/rút tiền, mốc 25/50/75/100%, số tiền cần để dành mỗi tháng theo hạn chót.
- **Báo cáo**: theo tuần/tháng/năm, nhận xét tự động, xuất CSV hoặc Excel nhiều sheet.
- **Cài đặt**: hồ sơ, đổi mật khẩu (đăng xuất các phiên khác), ngôn ngữ, giao diện.

## Công nghệ

Next.js 16 (App Router, Server Actions), React 19, TypeScript, Tailwind CSS 4, shadcn/ui (Radix), Prisma 6 + PostgreSQL, Recharts 3, Zod 4, next-intl, Vitest. Quản lý gói bằng pnpm.

## Chạy trên máy

Cần Node.js 22+, pnpm 10 (`corepack enable`) và PostgreSQL 16 (hoặc Docker).

```bash
pnpm install
docker compose up -d          # Postgres cục bộ; bỏ qua nếu đã có Postgres riêng
cp .env.example .env          # chỉnh DATABASE_URL nếu cần
pnpm db:migrate               # tạo bảng
pnpm db:seed                  # dữ liệu mẫu 12 tháng
pnpm dev                      # http://localhost:3000
```

Tài khoản mẫu: `demo@example.com` / `Demo@12345`.

## Biến môi trường

| Biến | Ý nghĩa |
|---|---|
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL |
| `TEST_DATABASE_URL` | Database riêng cho `pnpm test`; tên phải chứa `test` |
| `APP_TIMEZONE` | Múi giờ quyết định "hôm nay" (mặc định `Asia/Ho_Chi_Minh`) |

Không có secret nào được đưa xuống trình duyệt.

## Lệnh

| Lệnh | Việc làm |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Chạy dev, build, chạy production |
| `pnpm lint` / `pnpm typecheck` | ESLint, kiểm tra kiểu |
| `pnpm test` | Unit test và integration test (cần Postgres) |
| `pnpm db:migrate` / `pnpm db:deploy` | Tạo migration khi dev / áp migration khi deploy |
| `pnpm db:seed` | Nạp dữ liệu mẫu |
| `pnpm jobs:run` | Job bảo trì: tạo giao dịch định kỳ đến hạn cho mọi người dùng, xóa phiên và bộ đếm rate limit đã hết hạn |

## Kiến trúc

```
src/
  app/            trang (auth), (app) và API xuất file, health check
  actions/        Server Actions: xác thực, Zod, gọi service
  server/         service theo nghiệp vụ, luôn lọc theo userId của phiên
  lib/            quy tắc nghiệp vụ thuần (tiền, ngày, ngân sách, nhận xét), schema Zod
  components/     giao diện, biểu đồ, form
messages/         bản dịch vi/en
prisma/           schema, migration, seed
scripts/          job bảo trì chạy bằng cron
tests/            unit và integration
```

- Tiền lưu dạng `BigInt` theo đồng, ngày lưu `@db.Date`.
- Giao dịch định kỳ có khóa duy nhất `(recurringId, date)` nên tạo lại nhiều lần cũng không trùng.

## Bảo mật

- Mật khẩu băm bcrypt. Phiên lưu trong DB, cookie `httpOnly`, `SameSite=Lax`, `Secure` khi production; DB chỉ giữ SHA-256 của token.
- Mọi truy vấn lấy `userId` từ phiên, không tin id người dùng gửi lên (chống IDOR); có test cho từng loại dữ liệu.
- Giới hạn số lần đăng nhập/đăng ký lưu trong PostgreSQL nên đúng cả khi chạy nhiều instance; khóa được băm, không lưu email hay IP thô.
- Zod kiểm tra mọi input; Prisma tham số hóa truy vấn; React tự escape output; Server Actions có kiểm tra Origin chống CSRF.
- Chống open redirect sau đăng nhập, thông báo lỗi đăng nhập chung chung, file CSV/Excel chống formula injection, header bảo mật (HSTS, X-Frame-Options, nosniff...).

## Triển khai

```bash
docker build -t qlct .
docker run --env-file .env -p 3000:3000 qlct
```

Trước mỗi bản phát hành chạy `pnpm db:deploy` với `DATABASE_URL` production. Nên đặt cron chạy `pnpm jobs:run` mỗi ngày (ví dụ 00:05 theo `APP_TIMEZONE`) để giao dịch định kỳ được ghi cả khi người dùng chưa mở app. Endpoint `GET /api/health` dùng cho health check.

CI (GitHub Actions) chạy lint, typecheck, test với Postgres và build cho mỗi PR.
