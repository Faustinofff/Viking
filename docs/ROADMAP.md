# Viking — Development Roadmap

> **Vision:** A premium fitness operating system for coaches and students.
> Not just another workout tracker — a complete ecosystem.

---

## Product Strategy

### Core Principles
1. **Workout Experience First** — The #1 reason users stay is the workout flow. Make it addictive.
2. **Coach Empowerment** — Coaches are power users. Give them fast, powerful tools.
3. **Retention via Progress** — If users see progress, they stay. Visualize everything.
4. **Mobile-First for Students, Web-First for Coaches** — Optimize each experience for its platform.

### What NOT to build early
- Custom video hosting (use YouTube/Vimeo embeds)
- Real-time chat (use push notifications)
- Payment processing (use Stripe Connect later)
- AI features (Phase 3+)
- Complex analytics (basic metrics first)

---

## Phase 0 — MVP (Weeks 1-4)
**Goal: Launch a functional workout tracker for independent users and coaches.**

### Features
| Area | Features | Priority |
|------|----------|----------|
| Auth | Email/password, Google OAuth | P0 |
| Auth | Role selection (independent vs coach) | P0 |
| Exercises | Global exercise database (200+ exercises) | P0 |
| Exercises | Exercise search + filter | P0 |
| Workouts | Create workout plans | P0 |
| Workouts | Workout day builder | P0 |
| Workouts | Active workout tracking | P0 |
| Workouts | Set completion with checkmarks | P0 |
| Workouts | Rest timer | P0 |
| Workouts | Basic progress tracking (sets/reps) | P1 |
| Students | Coach adds students via email | P1 |
| Profile | Basic user profile | P1 |
| Onboarding | Role selection UI | P0 |

### Database Tables Required
- `profiles`
- `exercises`
- `workout_plans`
- `workout_days`
- `workout_exercises`
- `exercise_sets`
- `workout_sessions`
- `set_logs`
- `coach_students`

### UI Screens — Mobile (Student)
- Login
- Onboarding (role selection)
- Workout List (weekly view)
- Active Workout (exercise list + set tracking)
- Exercise Detail (instructions, video)

### UI Screens — Web (Coach)
- Login
- Dashboard (basic overview)
- Student List
- Workout Builder (exercise search + drag/drop)
- Workout Day Editor

### Complexity: Medium
### Build Order
1. Database schema + seed exercises
2. Auth + role selection
3. Exercise library (search, filter)
4. Workout plan CRUD
5. Active workout tracking
6. Coach-student linking
7. Polish workout flow (animations, timer)

---

## Phase 1 — Student Management (Weeks 5-8)
**Goal: Make coaches powerful with student management and nutrition.**

### Features
| Area | Features | Priority |
|------|----------|----------|
| Students | Student profiles with progress stats | P0 |
| Students | Adherence tracking | P0 |
| Students | Assign/unassign routines | P0 |
| Nutrition | Create nutrition plans | P0 |
| Nutrition | Meal builder with macros | P0 |
| Nutrition | Assign plans to students | P1 |
| Nutrition | Student meal logging | P1 |
| Nutrition | Water intake tracking | P1 |
| Schedule | Basic session scheduling | P1 |
| Schedule | Session types (presential/online) | P2 |
| Progress | Weight logging | P1 |
| Progress | Body measurements | P2 |
| Progress | Goal setting | P2 |

### Database Tables Required
- `nutrition_plans`
- `meal_plan_days`
- `meals`
- `meal_foods`
- `meal_logs`
- `water_logs`
- `weight_logs`
- `body_measurements`
- `goals`
- `training_sessions`
- `session_attendance`

### UI Screens — Mobile
- Nutrition (macro dashboard, meal list)
- Meal Detail (food list, checkmark)
- Weight Log (input + chart)
- Schedule (session list)
- Goal Setting

### UI Screens — Web
- Nutrition Plan Builder
- Meal Editor
- Student Detail View
- Schedule Calendar
- Weight Chart View

### Complexity: Medium-High
### Build Order
1. Nutrition plan CRUD (web)
2. Meal builder
3. Student nutrition assignment
4. Mobile meal logging
5. Weight logging + chart
6. Basic scheduling
7. Adherence calculation

---

## Phase 2 — Polish & Engagement (Weeks 9-12)
**Goal: Make the app feel premium, improve retention, and add social proof.**

### Features
| Area | Features | Priority |
|------|----------|----------|
| Workouts | Previous performance display | P0 |
| Workouts | PR tracking (personal records) | P0 |
| Workouts | Haptic feedback on set complete | P1 |
| Workouts | Sound effects | P2 |
| Workouts | Exercise tutorial videos | P1 |
| Progress | Progress photos | P1 |
| Progress | Body measurement trends | P2 |
| Progress | Progress insights/streaks | P1 |
| Coach | Coach custom exercises | P1 |
| Coach | Custom video/tips per exercise | P1 |
| Coach | Dashboard analytics | P1 |
| Design | Animations (spring, transitions) | P1 |
| Design | Glassmorphism polish | P1 |
| Design | Onboarding flow | P1 |
| Notifications | Push notifications | P1 |
| Notifications | Workout reminders | P2 |

### Complexity: Medium
### Build Order
1. Previous performance in workout view
2. PR detection + badge
3. Haptic feedback
4. Coach exercise content (video, tips)
5. Progress photos
6. Streaks and insights
7. Push notifications
8. Animation polish

---

## Phase 3 — Discovery & Growth (Weeks 13-16)
**Goal: Enable coach discovery and marketplace dynamics.**

### Features
| Area | Features | Priority |
|------|----------|----------|
| Marketplace | Coach public profiles | P0 |
| Marketplace | Coach search/browse | P0 |
| Marketplace | Reviews and ratings | P0 |
| Marketplace | Specialty filters | P1 |
| Marketplace | Contact/inquiry system | P1 |
| AI | Exercise form check (future) | P3 |
| AI | Workout recommendation | P3 |
| AI | Nutrition plan suggestion | P3 |
| Monetization | Coach subscription plans | P2 |
| Monetization | Stripe integration | P2 |
| Monetization | Marketplace commission | P3 |

### Database Tables Required
- `coach_profiles`
- `gyms`
- `coach_gyms`
- `reviews`
- `social_links`

### Complexity: Medium-High
### Build Order
1. Coach profile builder
2. Coach discovery (search, filters)
3. Review system
4. Contact/inquiry flow
5. Stripe integration
6. Subscription management

---

## Phase 4 — Scale & Advanced (Weeks 17+)
**Goal: Enterprise features, AI, and platform scalability.**

### Features
| Area | Features | Priority |
|------|----------|----------|
| AI | Workout plan auto-generation | P1 |
| AI | Exercise form analysis via video | P2 |
| AI | Nutrition plan optimization | P2 |
| Analytics | Advanced coach analytics | P1 |
| Analytics | Client retention predictions | P2 |
| Templates | Workout template marketplace | P1 |
| Community | Social features | P3 |
| Enterprise | Group management | P2 |
| Enterprise | Multi-gym support | P2 |
| Native | Widgets (iOS/Android) | P2 |
| Native | Apple Watch / Wear OS | P3 |

### Complexity: High
### Build Order
1. Template marketplace
2. AI workout generation
3. Advanced analytics
4. Group management
5. Mobile widgets
6. Wearable apps

---

## Folder Architecture

```
viking/
├── packages/
│   ├── shared/              # Shared types, constants, utilities
│   │   └── src/
│   │       ├── types/       # All TypeScript interfaces
│   │       ├── constants/   # Design tokens, enums
│   │       └── index.ts
│   │
│   ├── mobile/              # React Native Expo app
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── ui/      # Design system (GlassCard, Button, etc.)
│   │   │   │   └── workout/ # Workout-specific components
│   │   │   ├── screens/
│   │   │   │   ├── auth/
│   │   │   │   ├── workout/
│   │   │   │   ├── nutrition/
│   │   │   │   ├── progress/
│   │   │   │   ├── discover/
│   │   │   │   └── profile/
│   │   │   ├── navigation/  # Stack + Tab navigators
│   │   │   ├── hooks/       # Custom hooks
│   │   │   ├── services/    # Supabase API calls
│   │   │   ├── store/       # Zustand state management
│   │   │   └── theme/       # Theme configuration
│   │   ├── App.tsx
│   │   └── app.json
│   │
│   └── web/                 # Next.js web dashboard
│       └── src/
│           ├── app/
│           │   ├── (auth)/        # Auth pages
│           │   │   └── login/
│           │   └── (dashboard)/   # Dashboard pages
│           │       ├── dashboard/
│           │       ├── students/
│           │       ├── workouts/
│           │       ├── nutrition/
│           │       ├── schedule/
│           │       ├── analytics/
│           │       └── marketplace/
│           └── components/
│               ├── ui/            # Reusable web components
│               └── dashboard/     # Dashboard-specific
│
├── docs/
│   ├── ROADMAP.md
│   └── database-schema.sql
└── package.json
```

---

## Navigation Structure

### Mobile (Student/Independent)
```
RootNavigator
├── AuthStack
│   ├── Login
│   ├── Register
│   └── Onboarding (role selection)
│
└── MainTabs
    ├── Workouts (stack)
    │   ├── WorkoutList
    │   ├── ActiveWorkout
    │   └── ExerciseDetail
    ├── Nutrition (stack)
    │   ├── NutritionDashboard
    │   └── MealDetail
    ├── Progress (stack)
    │   ├── ProgressDashboard
    │   ├── WeightLog
    │   └── Goals
    ├── Discover (stack)
    │   ├── CoachList
    │   └── CoachProfile
    └── Profile (stack)
        ├── MyProfile
        └── Settings
```

### Web (Coach)
```
DashboardLayout (sidebar)
├── Dashboard       — Overview, stats, recent activity
├── Students        — Student list, detail, assign plans
├── Workouts        — Workout builder, exercise library
├── Nutrition       — Meal plan builder
├── Schedule        — Session calendar
├── Analytics       — Charts, adherence, revenue
└── Marketplace     — Coach profile, reviews
```

---

## Reusable UI System

### Design Tokens (defined in `@viking/shared/src/constants`)

| Token | Value | Usage |
|-------|-------|-------|
| `bg.primary` | `#0A0A0B` | App background |
| `bg.card` | `rgba(255,255,255,0.04)` | Card surfaces |
| `accent.primary` | `#00D4AA` | Primary actions, highlights |
| `accent.glow` | `rgba(0,212,170,0.25)` | Active cards, timers |
| `text.primary` | `#FFFFFF` | Primary text |
| `text.tertiary` | `rgba(255,255,255,0.4)` | Secondary/metadata |
| `border.subtle` | `rgba(255,255,255,0.06)` | Card borders |

### Mobile Components (`src/components/ui/`)
- `GlassCard` — Glassmorphism container (default, elevated, glow variants)
- `CtaButton` — Primary, secondary, ghost, danger variants
- `TextField` — Themed input with focus/error states
- `ScreenLayout` — Safe area + padding wrapper
- `Header` — Screen title + subtitle
- `ProgressBar` — Linear progress indicator

### Web (Tailwind classes + `components/ui/`)
- `.glass` — Glassmorphism card
- `.card` — Standard card wrapper
- `.btn-primary` / `.btn-secondary` / `.btn-ghost`
- `.input-field` — Themed input
- `.label` — Uppercase label
- `.stat-value` / `.stat-label` — Stat display

---

## Database Schema Principles

1. **UUID primary keys** — for security and distributed inserts
2. **Timestamptz** — always store UTC, convert on display
3. **Array columns** for tags/muscle groups — avoids excessive join tables
4. **RLS enabled** — row-level security on all user-facing tables
5. **Soft deletes** only where needed (most data is relational)
6. **Indexes** on foreign keys + frequently queried columns

---

## Future AI Integration Opportunities

1. **Workout Plan Generation** — User inputs goals, AI generates weekly plan
2. **Form Analysis** — User uploads video, AI detects form issues
3. **Nutrition Optimization** — AI adjusts macros based on progress
4. **Adherence Predictions** — Flag students at risk of dropping out
5. **Exercise Recommendations** — Suggest exercises based on equipment + goals
6. **Smart Rest Timer** — Adjust rest times based on exercise difficulty + user performance

---

## Monetization Strategy

### Coach-Side (Revenue)
| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | 3 students, basic workouts |
| Pro | $19/mo | 20 students, nutrition, analytics |
| Elite | $49/mo | Unlimited students, marketplace, AI |

### Marketplace (Future)
- 10% commission on coach signups via platform
- Premium coach listings

### Student-Side (Retention)
- Free app with ads/watermark
- Premium ($4.99/mo): No ads, advanced analytics, AI features

---

## Technical Recommendations

1. **Supabase Realtime** — Use for live workout sync between coach/student
2. **React Query** — Cache-first data fetching with optimistic updates
3. **Zustand** — Lightweight global state (auth, workout timer)
4. **Expo AV** — Video playback for exercise tutorials
5. **React Native Reanimated** — Smooth 60fps animations
6. **Tailwind CSS** — Rapid web UI development
7. **Recharts** — Lightweight charts for web analytics
8. **Date-fns** — Date formatting and manipulation
