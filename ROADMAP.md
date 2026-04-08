# ReachPilot — Roadmap

Последнее обновление: 2026-03-30

---

## Phase 1: Deploy & First Users (неделя 1)

Цель: сделать продукт доступным для других людей.

### 1.1 Деплой бэкенда

- [ ] Зарегистрироваться на Railway (railway.app) или Fly.io
- [ ] Создать проект, подключить GitHub repo или задеплоить через CLI
- [ ] Добавить env переменные: `ANTHROPIC_API_KEY`, `LLM_MODEL`
- [ ] Проверить что `/health` и `/api/insights` работают на production URL
- [ ] Обновить `API_BASE` в `extension/background.js` на production URL

Стоимость: бесплатно на старте (Railway free tier / Fly.io free allowance)

### 1.2 Публикация Chrome Extension

- [ ] Зарегистрировать Chrome Web Store Developer аккаунт ($5 разовый платёж)
- [ ] Подготовить материалы для Chrome Web Store:
  - Описание (до 132 символов краткое, до 16000 подробное)
  - Скриншоты расширения (1280x800 или 640x400, минимум 1)
  - Иконка 128x128 (уже есть)
  - Promo tile 440x280 (small)
- [ ] Обновить `API_BASE` в background.js на production URL
- [ ] Загрузить ZIP расширения в Chrome Web Store
- [ ] Дождаться review (обычно 1-3 дня)
- [ ] Получить public URL расширения

### 1.3 Деплой лендинга

- [ ] Купить домен (варианты: reachpilot.ai, getreachpilot.com, reachpilot.app)
  - Namecheap, Cloudflare, Google Domains — ~$10-15/год
- [ ] Задеплоить `landing/index.html` на Vercel или Netlify (бесплатно)
  - `npx vercel --prod` или drag & drop на Netlify
- [ ] Привязать домен к хостингу
- [ ] Обновить CTA кнопки на лендинге → ссылка на Chrome Web Store

### 1.4 Первые пользователи (20-30 человек)

- [ ] Написать пост в Reddit: r/sales, r/coldoutreach, r/salestechniques
  - Формат: "I built X, here's what it generated for 10 real LinkedIn profiles"
  - Показать before/after примеры
- [ ] Опубликовать в LinkedIn: пост с видео/скриншотами
  - Формат: "I let AI analyze YOUR LinkedIn and write you a cold message"
- [ ] Написать 10-15 знакомым SDR/рекрутерам лично
- [ ] Собрать фидбек: что работает, что нет, будут ли платить

---

## Phase 2: Почта и коммуникация

Цель: профессиональная точка контакта для фидбека и поддержки.

### 2.1 Email

- [ ] Настроить почту на кастомном домене:
  - **Вариант A (бесплатно):** Zoho Mail — бесплатный план, 5 юзеров, кастомный домен
  - **Вариант B ($6/мес):** Google Workspace
  - **Вариант C (временно):** Gmail без домена (reachpilot.app@gmail.com)
- [ ] Минимальные адреса:
  - `hello@reachpilot.ai` — основная почта, регистрация в сервисах
  - `support@reachpilot.ai` — фидбек от юзеров (можно алиас на hello@)
- [ ] Добавить email в footer лендинга
- [ ] Добавить email в описание на Chrome Web Store

### 2.2 Feedback канал

- [ ] Добавить ссылку "Send Feedback" в Side Panel расширения
  - Самый простой вариант: `mailto:support@reachpilot.ai`
  - Альтернатива: Google Form → результаты в Google Sheet
- [ ] Опционально: создать простой Telegram-канал или Discord для early users

---

## Phase 3: Auth (неделя 2-3)

Цель: идентификация пользователей + лимиты на бесплатном тарифе.

### 3.1 Google OAuth

- [ ] Создать проект в Google Cloud Console
- [ ] Настроить OAuth 2.0 (consent screen, credentials)
- [ ] Добавить endpoint: `POST /api/auth/google` — принимает Google auth code, возвращает JWT
- [ ] Добавить endpoint: `POST /api/auth/refresh` — обновление JWT
- [ ] В расширении: кнопка "Sign in with Google" в Side Panel
  - Использовать `chrome.identity.launchWebAuthFlow()` для OAuth
  - Сохранить JWT в `chrome.storage.local`
- [ ] Все API запросы отправляют JWT в `Authorization: Bearer ...` header
- [ ] Backend: middleware проверяет JWT, извлекает user_id

### 3.2 База данных

- [ ] Добавить PostgreSQL (Railway addon бесплатно или Neon free tier)
- [ ] Таблицы:
  - `users` — id, email, name, google_id, created_at
  - `usage` — id, user_id, action (insights/generate), created_at
  - `subscriptions` — id, user_id, plan, stripe_customer_id, active_until
- [ ] SQLAlchemy или просто asyncpg для простоты

### 3.3 Rate limiting

- [ ] Free tier: 5 sequences/день (считать по usage таблице)
- [ ] Когда лимит исчерпан: расширение показывает "Upgrade to Pro" с ссылкой на pricing
- [ ] Endpoint: `GET /api/usage` — возвращает plan, использование за сегодня, лимит

---

## Phase 4: Оплата (неделя 3-4)

Цель: начать получать деньги.

### 4.1 Stripe интеграция

- [ ] Создать Stripe аккаунт (stripe.com)
- [ ] Создать продукт "ReachPilot Pro" и price ($29/мес)
- [ ] Endpoints:
  - `POST /api/checkout` — создаёт Stripe Checkout Session, возвращает URL
  - `POST /api/webhook/stripe` — принимает Stripe events (checkout.session.completed, customer.subscription.deleted)
- [ ] При успешной оплате: обновить `subscriptions` таблицу
- [ ] Stripe Customer Portal для управления подпиской (отмена, смена карты)

### 4.2 Paywall в расширении

- [ ] Free tier показывает:
  - Insights: полностью
  - Messages: только message_1
  - Follow-up: заблокирован, с текстом "Unlock with Pro"
  - Approach card: полностью
- [ ] Кнопка "Upgrade to Pro — $29/mo" → открывает Stripe Checkout в новой вкладке
- [ ] После оплаты: расширение проверяет статус через `GET /api/usage`

### 4.3 Pricing page

- [ ] Добавить страницу `/pricing` на лендинг или отдельную страницу
- [ ] Две колонки: Free vs Pro
- [ ] Free: 5 sequences/day, initial message only, 1 goal
- [ ] Pro: unlimited, full sequence, all goals, priority generation

---

## Phase 5: Launch (неделя 4)

Цель: публичный запуск и первый трафик.

### 5.1 Product Hunt

- [ ] Подготовить:
  - Tagline (< 60 символов)
  - Описание
  - 4-5 скриншотов / GIF демо
  - Maker comment
- [ ] Запустить в 00:01 PST во вторник/среду (лучшие дни)
- [ ] Попросить 10-15 знакомых upvote + оставить комментарий

### 5.2 Content marketing

- [ ] 3-5 постов в Reddit с примерами (r/sales, r/SaaS, r/startups)
- [ ] 5 LinkedIn постов:
  - Before/after примеры сообщений
  - "I analyzed 50 LinkedIn profiles with AI — here's what I learned"
  - Видео демо (30-60 секунд)
- [ ] Опционально: короткое видео для YouTube/Loom

### 5.3 Cold outreach (мета)

- [ ] Использовать свой же продукт чтобы написать SDR-менеджерам
- [ ] Таргет: SDR в SaaS стартапах (50-200 человек), без enterprise tools
- [ ] Цель: 10-20 quality conversations → конвертировать в юзеров

---

## Phase 6: Iterate (неделя 5+)

Цель: product-market fit.

### 6.1 Аналитика

- [ ] Добавить базовый event tracking (PostHog free tier или события в БД):
  - Extension installed
  - Profile analyzed
  - Insights generated
  - Messages generated
  - Message copied
  - Goal selected (book_demo vs start_conversation)
  - Upgrade clicked
- [ ] Dashboard: DAU, generations/day, copy rate, conversion free→paid

### 6.2 Улучшение продукта (по фидбеку)

- [ ] 3-е сообщение (break-up message)
- [ ] Partial regeneration (перегенерировать только opener или CTA)
- [ ] Больше goals (get referral, pitch partnership, recruit)
- [ ] Tone presets (professional, casual, direct, provocative)
- [ ] "Why this works" объяснение под каждым сообщением
- [ ] Quality score (1-10)
- [ ] История генераций (последние 10-20 профилей)

### 6.3 Growth features

- [ ] Referral system: пригласи друга → +10 бесплатных генераций
- [ ] Team plan ($49/мес/seat): shared sender profiles, team templates
- [ ] Email mode (генерация email вместо LinkedIn DM)
- [ ] CRM интеграция (HubSpot, Salesforce) — экспорт сообщений

---

## Бюджет на запуск

| Статья | Стоимость | Когда |
|--------|-----------|-------|
| Домен | $12/год | Phase 1 |
| Chrome Web Store | $5 одноразово | Phase 1 |
| Хостинг бэкенда (Railway) | $0-5/мес | Phase 1 |
| Хостинг лендинга (Vercel) | $0 | Phase 1 |
| Почта (Zoho) | $0 | Phase 2 |
| Claude API | ~$5-20/мес (зависит от юзеров) | Ongoing |
| PostgreSQL (Neon free) | $0 | Phase 3 |
| Stripe | 2.9% + $0.30 per transaction | Phase 4 |
| **Итого до первых денег** | **~$20-40** | |

---

## Ключевые метрики для каждой фазы

| Фаза | Метрика | Цель |
|-------|---------|------|
| Phase 1 | Расширение опубликовано и работает | ✓/✗ |
| Phase 1 | Первые 20 юзеров попробовали | 20 |
| Phase 2 | Получен реальный фидбек | 5+ ответов |
| Phase 3 | DAU (daily active users) | 10+ |
| Phase 4 | Первый платящий клиент | 1 |
| Phase 5 | MRR (monthly recurring revenue) | $500 |
| Phase 6 | MRR | $5,000 |

---

## Риски

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| LinkedIn сломает селекторы | Высокая | Модульный парсер, мониторинг ошибок, быстрые обновления |
| Chrome Web Store отклонит расширение | Средняя | Следовать Chrome policies, никакого auto-sending |
| Качество сообщений недостаточное | Средняя | Тестирование на 50+ профилях, итерация промптов |
| Юзеры не видят ценности | Средняя | Быстрый цикл фидбека, готовность pivotнуть |
| Claude API дорожает | Низкая | Возможность переключить модель через LLM_MODEL |
| Конкуренты скопируют | Средняя | Скорость итерации + niche focus + UX |
