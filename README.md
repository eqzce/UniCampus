# UniCampus — Full-Stack Unified University Platform (Web + Android APK + Render PostgreSQL)

Унифицированная цифровая платформа для университета (**Astana IT University / AITU**), объединяющая ролевой доступ (**Student / Teacher RBAC**), интерактивную зачетную книжку (Gradebook), трекер посещаемости (Attendance), управление расписанием и дедлайнами, 2.5D/SVG навигацию по этажам кампуса, бронирование аудиторий, AI-советника и полный **Offline Mode** (сохранение расписания, карты и оценок без интернета).

---

## 1. Архитектура Full-Stack и Ролевая Модель (RBAC)

```
UniCampus/
├── backend/                         # Production REST API (Node.js + Express + PostgreSQL / Prisma)
│   ├── prisma/
│   │   └── schema.prisma            # Схема БД PostgreSQL (Users, Courses, Grades, Attendance, Assignments, Schedule, RoomBookings)
│   ├── src/
│   │   ├── index.js                 # Express сервер, JWT авторизация, CORS для Web и Capacitor APK
│   │   ├── db.js                    # Драйвер PostgreSQL (pg Pool с авто-миграцией) + локальный фоллбэк
│   │   ├── seed.js                  # Скрипт предзаполнения БД демо-аккаунтами (`npm run backend:seed`)
│   │   └── seedData.js              # Начальные курсы AITU, студенты, преподаватели, оценки и расписание
│   └── package.json
├── src/                             # Frontend (React 19 + TypeScript + Tailwind CSS v4 + Capacitor)
│   ├── config/
│   │   └── apiConfig.ts             # Централизованный конфиг API (`VITE_API_URL`, таймаут 60 сек для Render Cold Start)
│   ├── services/
│   │   ├── api.ts                   # REST API клиент с JWT заголовками (`Authorization: Bearer <token>`)
│   │   └── offlineStorage.ts        # Менеджер Offline Mode (кэширование Schedule, Map, Grades, GPA и Attendance)
│   ├── components/
│   │   ├── auth/
│   │   │   └── AuthModal.tsx        # Вход, Регистрация с выбором роли (Student / Teacher) и 1-клик демо-переключатель
│   │   ├── teacher/
│   │   │   ├── TeacherDashboard.tsx # Интерфейс преподавателя (Gradebook, Attendance, Deadlines, Rooms & Schedule)
│   │   │   └── TeacherBottomNav.tsx # Нижняя навигация преподавателя
│   │   ├── dashboard/               # Главный экран студента (GPA, Attendance, Schedule, Deadlines, Offline Save)
│   │   ├── schedule/                # Интерактивное расписание + переход к кабинету на карте
│   │   ├── grades/                  # Зачетная книжка студента, отзывы преподавателей (Feedback) и дедлайны
│   │   └── map/                     # Интерактивная поэтажная карта кампуса AITU (C1.1, C1.2, C1.3 — 1, 2, 3 этажи)
├── render.yaml                      # Render Blueprint для деплоя Backend + PostgreSQL + Web в 1 клик
├── build-apk.bat                    # Скрипт автоматической сборки Android-приложения `UniCampus.apk`
└── start-dev.bat                    # Запуск Backend API (порт 5000) + Frontend (порт 5173)
```

---

## 2. Тестовые аккаунты и пароли (Seed Data)

Для входа используйте следующие предзаполненные тестовые аккаунты (также доступен мгновенный вход в 1 клик в окне **Sign In / Register** или переключатель **Student / Teacher / Admin** в верхней панели):

| Роль | Email (Логин) | Пароль | ФИО | Группа / Кафедра |
|------|---------------|--------|-----|------------------|
| **Ученик (Student)** | `student@unicampus.kz` | **`student123`** | Arystan Seitkaliyev | Группа `CS-2401` |
| **Учитель (Teacher)** | `teacher@unicampus.kz` | **`teacher123`** | Dr. Yersultan M. | Physics & Intelligent Systems (`PHYS101`, `CS101`) |
| **Админ (Admin)** | `admin@unicampus.kz` | **`admin123`** | Aidar K. (System Admin) | Academic Affairs & Registry |
| *Доп. преподаватель* | `danial@unicampus.kz` | `teacher123` | Prof. Danial R. | Computer Science & Mathematics (`MATH101`, `HIST102`) |
| *Доп. студенты в БД* | `alisher@unicampus.kz`, `dana@unicampus.kz`, `madina@unicampus.kz`, `timur@unicampus.kz` | `student123` | Alisher N., Dana S., Madina K., Timur B. | Группы `CS-2401`, `SE-2402` |

---

## 3. Функционал по 3 Ролям (`Student` / `Teacher` / `Admin`)

### 1. Вид Ученика (`role: 'student'`) — Просмотр расписания и оценок
- **Только просмотр (View-Only)**: Ученик может **только просматривать** своё расписание и официальные оценки/дедлайны (кнопки изменения/удаления расписания скрыты).
- **Dashboard & Grades**: Просмотр динамического **GPA (по 4.0 шкале)** на основе реальных оценок из БД, процента посещаемости (**Attendance Rate**), ведомости оценок (`0–100`) с отзывами преподавателей (**Teacher Feedback**), расписания и переход к кабинету на интерактивной карте кампуса (`Map`).
- **Offline Access (Офлайн-режим)**: Кнопка **Save Offline** сохраняет расписание (**Schedule**), карту корпусов (**Map**) и оценки (**Grades**) для работы без интернета.

### 2. Вид Преподавателя (`role: 'teacher'`) — Управление расписанием и выставление оценок
- **Изменение расписания (Schedule Management)**: Преподаватель может **добавлять новые занятия**, **редактировать существующие пары** (менять предмет, день недели, время, кабинет `C1.1.320` / `C1.2.136` / `C1.3.246`, группу) и **удалять занятия** — все изменения сразу синхронизируются с расписанием ученика.
- **Выставление оценок ученикам из БД (Interactive Gradebook)**: Выбор предмета и группы (`CS-2401`, `SE-2402`), выставление и редактирование оценок (`0–100`) по категориям (`Assignment`, `Midterm 1`, `Midterm 2`, `Final`) и отправка комментариев (**Teacher Feedback**) любому студенту из базы данных.
- **Attendance & Deadlines & Room Bookings**: Отметка посещаемости (`Present`, `Late`, `Absent`), публикация новых дедлайнов и подтверждение бронирования аудиторий (**Approve / Reject**).

### 3. Вид Администратора (`role: 'admin'`) — Управление предметами, привязка учителей и полный доступ
- **Добавление предметов и привязка учителей (Subjects & Teacher Binding)**: Админ может **создавать новые предметы (`Courses`)**, указывать код курса и кредиты ECTS, **привязывать и переназначать преподавателей** к любому предмету из выпадающего списка, а также **регистрировать новых преподавателей** в БД.
- **Полный доступ ко всем функциям**: В нижней навигации админа доступны все разделы управления университетом (**Subjects**, **Schedule**, **Grades**, **Attendance**, **Deadlines**, **Map**).

---

## 4. Локальный запуск (Backend + Frontend)

1. Установите зависимости фронтенда и бэкенда:
   ```bash
   npm install
   npm run backend:install
   ```
2. Заполните базу данных демо-данными (если требуется сбросить к начальному состоянию):
   ```bash
   npm run backend:seed
   ```
3. Запустите оба сервера (или дважды кликните `start-dev.bat` на Windows):
   ```bash
   # В первом терминале (Backend API на http://localhost:5000):
   npm run backend:start

   # Во втором терминале (Frontend на http://localhost:5173):
   npm run dev
   ```

---

## 5. Пошаговый деплой на Render (`render.yaml`)

В корне репозитория подготовлен файл **`render.yaml`** (Render Blueprint) для автоматического развертывания базы данных **Render PostgreSQL** (`unicampus-db`), облачного бэкенда **Web Service** (`unicampus-api`) и веб-интерфейса (`unicampus-web`).

### Инструкция по деплою на Render:
1. Загрузите изменения в ваш GitHub-репозиторий (`git push origin main`).
2. Войдите в панель управления [Render Dashboard](https://dashboard.render.com/).
3. Нажмите **New +** → **Blueprint**.
4. Подключите ваш репозиторий `UniCampus`. Render автоматически обнаружит файл `render.yaml` и создаст:
   - Базу данных PostgreSQL **`unicampus-db`** (Free Plan).
   - Веб-сервис бэкенда **`unicampus-api`** (автоматически получит переменную `DATABASE_URL` от PostgreSQL и сгенерирует `JWT_SECRET`). При первом старте сервер автоматически создаст таблицы (`users`, `courses`, `grades`, `attendance`, `assignments`, `schedule`, `room_bookings`) и заполнит их демо-данными.
   - Статический сайт **`unicampus-web`** для веб-версии.
5. После завершения деплоя скопируйте HTTPS-ссылку вашего бэкенда (например, `https://unicampus-api.onrender.com/api`).

> **Примечание о Render Cold Start**: На бесплатном тарифе Render сервер засыпает после 15 минут неактивности. Клиент UniCampus оснащён 60-секундным таймаутом (`RENDER_COLD_START_TIMEOUT_MS = 60000`) и автоматическим информационным баннером при пробуждении сервера, а также возможностью мгновенно переключиться в **Offline Mode**.

---

## 6. Пересборка Android APK (`UniCampus.apk`) для работы с Render

1. Укажите URL вашего Render-сервера в файле `.env` в корне проекта (или оставьте `https://unicampus-api.onrender.com/api` по умолчанию):
   ```env
   VITE_API_URL=https://unicampus-api.onrender.com/api
   ```
   *(Также URL сервера можно в любой момент изменить прямо внутри установленного APK в окне **Sign In / Register → Render API Config**).*
2. Запустите сборку APK двойным кликом по **`build-apk.bat`** или командой:
   ```powershell
   .\build-apk.bat
   ```
3. Готовый установочный файл **`UniCampus.apk`** появится в корне папки проекта.
