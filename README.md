# 📘 Trắc nghiệm Online Platform API

<p align="center">
  <a href="https://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<p align="center">
  <b>Backend API cho hệ thống làm bài trắc nghiệm trực tuyến</b><br/>
  Xây dựng bằng <a href="https://nestjs.com/">NestJS</a>, <a href="https://www.prisma.io/">Prisma</a> (MongoDB), và <a href="https://github.com/colinhacks/zod">Zod</a>.<br/>
</p>

<p align="center">
<a href="https://www.npmjs.com/package/@nestjs/core" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/package/@nestjs/core" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/package/@nestjs/core" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
</p>

---

## 📖 Mô tả

Hệ thống backend cung cấp các API phục vụ cho ứng dụng **Trắc nghiệm Online** bao gồm:

- Quản lý **User, Role, Permission, Auth**.
- Quản lý **Quiz, Question, Answer** (xây dựng sau).
- Tích hợp **JWT + Refresh Token** cho xác thực bảo mật.
- Hỗ trợ **OTP (VerificationCode)** để xác thực email/phone khi đăng ký.

---

## 🛠️ Công nghệ sử dụng

- [NestJS](https://nestjs.com/) - Framework Node.js mạnh mẽ.
- [Prisma](https://www.prisma.io/) - ORM kết nối MongoDB.
- [MongoDB Atlas](https://www.mongodb.com/atlas) - Cloud Database.
- [Zod](https://github.com/colinhacks/zod) - Validation & Schema.
- [TypeScript](https://www.typescriptlang.org/) - Ngôn ngữ chính.

---

## 🚀 Cài đặt dự án

```bash
# clone repo
git clone https://github.com/<your-org>/tracnghiemonline-platform-api.git
cd tracnghiemonline-platform-api

# cài dependency
npm install
```

---

## ⚙️ Cấu hình môi trường

Tạo file `.env`:

```env
NODE_ENV=development
PORT=8080
DATABASE_URL="mongodb+srv://<USER>:<PASS>@<CLUSTER>.mongodb.net/tracnghiemonline?retryWrites=true&w=majority"
```

---

## ▶️ Chạy project

```bash
# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run start:prod
```

---

## 🗄️ Prisma

```bash
# push schema lên database
npx prisma db push

# generate client
npx prisma generate

# mở prisma studio để xem data
npx prisma studio
```

---

## 🧪 Test (chưa build)

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e
```

---

## 📌 Roadmap

- [x] Setup dự án NestJS + Prisma + Zod
- [x] Tạo schema `User, Role, Permission, RefreshToken, Device, LoginSession, VerificationCode`
- [ ] Seed role mặc định (`admin`, `teacher`, `student`)
- [ ] Module `Auth` (register, login, refresh token, logout)
- [ ] Module `Quiz` (quiz, question, answer)
- [ ] Module `Result` (kết quả, thống kê)

---

## 👥 Contributors

Developed by the talented **New Bie Coder Team**:

<table align="center">
  <tr>
    <td align="center">
      <a href="https://github.com/truongquangquoc2011">
        <img src="https://avatars.githubusercontent.com/truongquangquoc2011" width="100px;" alt="Trương Quang Quốc"/>
        <br /><sub><b>Trương Quang Quốc</b></sub>
      </a><br />💻
    </td>
    <td align="center">
      <a href="https://github.com/nguyenthanhsang">
        <img src="https://github.com/Shangfarm" width="100px;" alt="Nguyễn Thanh Sang"/>
        <br /><sub><b>Nguyễn Thanh Sang</b></sub>
      </a><br />💻
    </td>
    <td align="center">
      <a href="https://github.com/maikivix">
        <img src="https://github.com/Vix1311" width="100px;" alt="Mai Kỳ Vĩ"/>
        <br /><sub><b>Mai Kỳ Vĩ</b></sub>
      </a><br />💻
    </td>
  </tr>
</table>
