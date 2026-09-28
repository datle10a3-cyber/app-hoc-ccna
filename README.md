# CCNA NOTES: Personal Cisco Study Notebook OS

> Ứng dụng sổ tay cá nhân dùng để tự lưu trữ bài học, lệnh Cisco IOS, mô hình mạng Packet Tracer và ghi chú trong quá trình học CCNA.

---

## 🌟 Tính Năng Chính

- **Tổng Quan (Dashboard):** Thống kê số lượng bài học, lệnh Cisco, mô hình mạng và ghi chú cá nhân.
- **Bài Học (Lessons):** Trình biên soạn và hiển thị bài học theo dạng Block (Lý thuyết, Lệnh Cisco CLI có khung riêng và nút Copy, Ví dụ, Ghi chú trọng tâm, Cảnh báo lỗi hay gặp).
- **Thư Viện Lệnh Cisco (Commands Library):** Tra cứu cú pháp lệnh, mode thực thi, ví dụ CLI với **Cảnh báo chống trùng lệnh (Duplicate Warning)**.
- **Mô Hình Mạng (Topologies):** Lưu trữ sơ đồ mô hình mạng Packet Tracer (Tải lên ảnh hoặc vẽ sơ đồ kéo thả Router, Switch, PC, Server).
- **Ghi Chú Cá Nhân (Notes):** Tạo nhanh ghi chú với các loại nhãn: *Cần nhớ*, *Quan trọng*, *Lỗi gặp phải*, *Cách fix*, *Kiến thức mới*.
- **Dán Nội Dung Smart Paste:** Tự động phân loại câu lệnh Cisco CLI (`SW1(config)#`, `show`, `switchport`, `ip route`), lý thuyết, ghi chú từ văn bản dán từ ChatGPT.
- **Tìm Kiếm Toàn Cục (Cmd+K / Ctrl+K):** Tra cứu tức thì trong 1 giây.
- **Trợ Lý AI CCNA:** Hỏi đáp dựa trên bài học, lệnh, ghi chú và mô hình đã lưu; mở được các nguồn liên quan từ câu trả lời.
- **Yêu Thích (Favorites ⭐):** Đánh dấu bài học, lệnh, mô hình và ghi chú quan trọng.

---

## 🚀 Khởi Chạy Tại Địa Phương

```bash
# Di chuyển vào thư mục dự án
cd APP_HOC_CCNA

# Cài đặt thư viện dependencies
npm install

# Chạy server ứng dụng tại địa phương
npm run dev
```

Mở trình duyệt truy cập: [http://localhost:3000](http://localhost:3000).

## 🤖 Bật Trợ Lý AI

Thêm API key Groq vào file `.env.local` tại gốc dự án:

```env
GROQ_API_KEY="your-groq-api-key"
GROQ_MODEL="openai/gpt-oss-120b"
GROQ_REASONING_EFFORT="high"
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_MODEL="gemini-3.5-flash"
```

Groq là nhà cung cấp chính. Khi Groq trả lỗi hạn mức, trợ lý thử Gemini trước; nếu Gemini tạm thời không trả lời được, trợ lý thử mô hình dự phòng của Groq. Ảnh được chọn hoặc dán vào khung chat sẽ gửi tới Gemini để phân tích. Bạn cũng có thể dùng `OPENAI_API_KEY`, `OPENAI_MODEL` và `OPENAI_REASONING_EFFORT`; nếu có cả Groq và OpenAI, ứng dụng chọn Groq. Khởi động lại ứng dụng, mở **Trợ lý AI** trong menu. Khóa chỉ được đọc ở máy chủ; đừng đặt khóa trong biến `NEXT_PUBLIC_`. Mỗi câu hỏi tìm trên toàn bộ dữ liệu văn bản trong trình duyệt, rồi gửi các đoạn liên quan tới nhà cung cấp AI để tạo câu trả lời có dẫn nguồn. Khi chưa có khóa, trang vẫn tìm và hiển thị nguồn trong ứng dụng. API có phí và hạn mức theo tài khoản nhà cung cấp.

---

## 🔑 Supabase Database & Cấu Hình .env

Ứng dụng chạy local ngay cả khi chưa cấu hình cloud. Khi cấu hình Supabase, người dùng đăng nhập bằng tài khoản riêng để đồng bộ dữ liệu qua Supabase Auth, PostgreSQL và RLS.

Tạo file `.env.local`:

```env
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Biến môi trường Supabase (tùy chọn; cần để bật đồng bộ)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
```

Trên một Supabase project mới, mở SQL Editor và chạy [`supabase_secure_schema.sql`](supabase_secure_schema.sql), sau đó đặt `NEXT_PUBLIC_SUPABASE_URL` và publishable key trong Vercel (Production, Preview nếu cần) và redeploy. Không dùng `SUPABASE_SERVICE_ROLE_KEY` ở trình duyệt/Vercel client. Project cần bật Auth Email/password; thêm URL production và localhost vào Auth → URL Configuration → Redirect URLs để xác nhận email hoạt động. Sau đó tạo tài khoản từ **Cài Đặt → Tài khoản đồng bộ**, đăng nhập cùng tài khoản trên từng thiết bị và đồng bộ sẽ bắt đầu. Lần đăng nhập đầu tiên đưa dữ liệu local hiện có lên tài khoản và gộp theo thời điểm cập nhật.

Ứng dụng dùng các bảng `ccna_*` có RLS bắt buộc theo `auth.uid()`; [`supabase_schema.sql`](supabase_schema.sql) là bản sao tương thích của SQL bảo mật ở trên, còn [`database/schema.sql`](database/schema.sql) là schema cũ và không dùng. Dữ liệu local theo tài khoản; bài học, lệnh Cisco, mô hình, ghi chú và ảnh đồng bộ hóa. Thay đổi trực tiếp được gửi lên cloud; thiết bị khác nhận qua Realtime hoặc lần đồng bộ khi mở lại ứng dụng. Xóa offline được giữ thành tombstone và áp dụng khi kết nối lại.

Khi chưa cấu hình Supabase hoặc chưa đăng nhập, dữ liệu vẫn chỉ nằm trên thiết bị đó. Dùng **Cài đặt → Xuất File JSON** để sao lưu/chuyển dữ liệu thủ công.

---

## ⚡ Triển Khai Vercel

1. Đưa mã nguồn lên GitHub/GitLab repository.
2. Tạo dự án mới trên [Vercel](https://vercel.com).
3. Nhập `GROQ_API_KEY` và `GEMINI_API_KEY` trong Vercel Environment Variables để bật AI; chỉ nhập biến Supabase sau khi cấu hình quyền truy cập phù hợp.
4. Tiến hành Deploy! Dự án đã được tối ưu sẵn cho Vercel.
