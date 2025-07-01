# Account Storage API

API lưu trữ dữ liệu tài khoản sử dụng Express.js và MongoDB.

## Tính năng

- Lưu trữ và truy xuất dữ liệu tài khoản theo project
- API RESTful với xác thực JWT
- Lưu trữ dữ liệu trong MongoDB
- Hỗ trợ nhiều môi trường triển khai

## Cài đặt

1. Clone repository:
   ```
   git clone <repository-url>
   cd account-storage-api
   ```

2. Cài đặt dependencies:
   ```
   npm install
   ```

3. Tạo file .env từ .env.example và cấu hình:
   ```
   cp .env.example .env
   ```

4. Khởi động server:
   ```
   npm run dev
   ```

## API Endpoints

### Lấy giá trị
- **GET** `/api/values?account=<account>&project=<project>`
- Trả về tất cả giá trị cho account và project cụ thể

### Lưu giá trị mới
- **POST** `/api/values`
- Body: `{ "account": "...", "project": "...", "values": { ... } }`

### Lấy giá trị theo ID
- **GET** `/api/values/:id`

### Cập nhật giá trị theo ID
- **PUT** `/api/values/:id`
- Body: `{ "values": { ... } }`

### Xóa giá trị theo ID
- **DELETE** `/api/values/:id`

## Bảo mật

API sử dụng xác thực dựa trên token. Tất cả các requests cần có header:
```
Authorization: Bearer YOUR_AUTH_TOKEN
```

## Phát triển

- Sử dụng `npm run dev` để chạy server với hot-reload
- Sử dụng `npm run build` để build ứng dụng
- Sử dụng `npm start` để chạy phiên bản production 