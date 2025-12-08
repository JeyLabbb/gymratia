# GymRatIA - Project State Report

**Generated:** 2025-01-XX  
**Codebase:** Next.js App Router + Supabase + OpenAI

---

## 1. High-Level Product Flow (As Implemented)

### Current End-to-End User Journey

```
1. Home (/) 
   ├─ Unauthenticated: Marketing landing page
   └─ Authenticated: EpicHomeAuthenticated component (personalized hero, stats, quick links)

2. Onboarding
   ├─ /onboarding/basic → Basic form (sex, height, weight, intensity, days, allergies, goal)
   │  └─ Saves to user_profiles via /api/user/profile (POST)
   │  └─ Redirects to /trainers
   └─ /onboarding/expert → (exists but not fully implemented)

3. Trainers Selection
   ├─ /trainers → List of trainers (Edu, Carolina)
   └─ /trainers/[slug] → Trainer profile page with "Configurar" button

4. Trainer Configuration
   ├─ /trainers/edu/configure → TrainerSetupChat component
   │  ├─ Structured Q&A (8 questions: name, sex, height, weight, goal, days, cannotTrain, intensity)
   │  ├─ Free chat phase (optional, enabled for Edu)
   │  └─ onComplete → Calls /api/user/save-setup-data + /api/build-excel
   │     └─ Downloads Excel file
   │     └─ Redirects to /dashboard/chat/edu
   └─ /trainers/carolina/configure → (exists, similar flow)

5. Chat with Trainer
   ├─ /dashboard/chat/[slug] → ChatGPTStyleChat component
   │  ├─ Auto-initializes chat (creates trainer_chats record if needed)
   │  ├─ Sends welcome message on first open (via /api/trainer/welcome)
   │  ├─ Chat messages via /api/chat (POST)
   │  └─ Messages stored in chat_messages table
   └─ /dashboard/chats → List of all trainer chats

6. Dashboard
   ├─ /dashboard → Main dashboard (stats, active trainers, quick links)
   ├─ /dashboard/profile → Profile page (view/edit personal info, progress tracking, photos)
   ├─ /dashboard/workouts → (placeholder page)
   └─ /dashboard/diet → (placeholder page)

7. Plan Generation
   ├─ JSON Path: /api/generate-plan (uses OpenAI JSON mode)
   │  └─ Stores in plans.plan_json as StoredPlanJson
   └─ Excel Path: /api/build-excel (Edu only, uses templates)
      └─ Stores in plans.plan_json as StoredPlanJson (source: 'excel')
      └─ Downloads .xlsx file to user
```

### Data Persistence vs UI-Only

**Persisted to Supabase:**
- `user_profiles`: full_name, preferred_name, height_cm, weight_kg, goal, sex, avatar_url
- `trainer_chats`: user_id, trainer_slug, last_message_at
- `chat_messages`: chat_id, role, content, created_at
- `user_preferences`: public_profile, public_progress
- `progress_tracking`: user_id, date, weight_kg, body_fat_percentage, notes
- `progress_photos`: user_id, date, photo_url
- `profile_changes`: user_id, field_name, old_value, new_value, created_at
- `trainer_notifications`: user_id, trainer_slug, message, read, created_at
- `plans`: user_id (NULL currently), trainer_id, title, plan_json, nutrition_json, technique_json

**UI-Only (Not Persisted):**
- Onboarding form state (until submitted)
- Chat input state
- Modal states (AddProgressModal, AddPhotoModal)
- Toast notifications

---

## 2. Feature Inventory

### UI Pages/Routes

| Route | Status | Notes |
|-------|--------|-------|
| `/` (Home) | ✅ Done | Shows EpicHomeAuthenticated for logged-in users |
| `/onboarding/basic` | ✅ Done | Saves to user_profiles, redirects to /trainers |
| `/onboarding/expert` | 🟡 Partial | Page exists but not fully implemented |
| `/trainers` | ✅ Done | Lists all trainers from personas.ts |
| `/trainers/[slug]` | ✅ Done | Trainer profile page with GeneratePlanButton (demo) |
| `/trainers/edu/configure` | ✅ Done | Full setup flow with TrainerSetupChat |
| `/trainers/carolina/configure` | ✅ Done | Similar to Edu |
| `/dashboard` | ✅ Done | Main dashboard with stats and trainer cards |
| `/dashboard/chat/[slug]` | ✅ Done | Full chat interface with welcome message |
| `/dashboard/chats` | ✅ Done | List of all trainer chats |
| `/dashboard/profile` | ✅ Done | Profile view/edit, progress tracking, photos |
| `/dashboard/workouts` | ❌ Not Done | Placeholder page only |
| `/dashboard/diet` | ❌ Not Done | Placeholder page only |
| `/auth/login` | ✅ Done | Supabase auth login |
| `/auth/callback` | ✅ Done | Auth callback handler |

### API Routes

| Route | Status | Notes |
|-------|--------|-------|
| `/api/generate-plan` | ✅ Done | Generates JSON plan via OpenAI, stores in plans table |
| `/api/build-excel` | ✅ Done | Builds Excel for Edu, stores plan_json, downloads file |
| `/api/chat` | ✅ Done | POST: Send message, GET: Fetch messages/chats |
| `/api/user/profile` | ✅ Done | GET/POST: Fetch/update user_profiles |
| `/api/user/save-setup-data` | ✅ Done | Saves setup data to user_profiles with normalization |
| `/api/trainer/welcome` | ✅ Done | Pre-defined welcome message (no OpenAI call) |
| `/api/trainer/auto-message` | ✅ Done | Generates trainer response to profile changes |
| `/api/trainer-notifications` | ✅ Done | GET/POST: Fetch/create trainer notifications |
| `/api/progress` | ✅ Done | GET/POST: Fetch/create progress entries |
| `/api/progress-photos` | ✅ Done | POST: Upload progress photos to Supabase Storage |
| `/api/health` | ✅ Done | Health check endpoint |

### Supabase Integration

**Tables Used:**

| Table | Purpose | RLS Enabled | Status |
|-------|---------|-------------|--------|
| `user_profiles` | User personal info, stats | ✅ Yes | ✅ Done |
| `trainer_chats` | Chat sessions per trainer | ✅ Yes | ✅ Done |
| `chat_messages` | Individual messages | ✅ Yes | ✅ Done |
| `user_preferences` | User settings | ✅ Yes | ✅ Done |
| `progress_tracking` | Weight/body fat entries | ✅ Yes | ✅ Done |
| `progress_photos` | Progress photo metadata | ✅ Yes | ✅ Done |
| `profile_changes` | Audit log of profile changes | ✅ Yes | ✅ Done |
| `trainer_notifications` | Trainer messages about changes | ✅ Yes | ✅ Done |
| `plans` | Generated workout plans | ❌ No | 🟡 Partial |
| `trainers` | Trainer metadata | ❌ Unknown | 🟡 Partial |

**Storage Buckets:**

| Bucket | Purpose | Status |
|--------|---------|--------|
| `avatars` | User profile pictures | ✅ Created (via SQL script) |
| `progress-photos` | Progress photos | ✅ Created (via SQL script) |
| `posts` | Future posts feature | ✅ Created (via SQL script) |

**What's Stored:**

- **User Profiles**: full_name, preferred_name, height_cm, weight_kg, goal, sex, avatar_url, email
- **Chat Messages**: Full conversation history per trainer
- **Progress Tracking**: Date, weight_kg, body_fat_percentage, notes
- **Progress Photos**: Date, photo_url (stored in Storage)
- **Plans**: plan_json (StoredPlanJson), nutrition_json, technique_json, title, trainer_id
- **Profile Changes**: Audit trail of all profile field changes
- **Trainer Notifications**: Messages from trainers about profile changes

### Trainer Chat + Personalities

| Feature | Status | Notes |
|---------|--------|-------|
| Trainer personas definition | ✅ Done | Defined in `src/lib/personas.ts` |
| Edu persona (tough, direct) | ✅ Done | System prompt emphasizes hardness, no excuses |
| Carolina persona (gentle, supportive) | ✅ Done | System prompt emphasizes empathy |
| Chat interface | ✅ Done | ChatGPTStyleChat component with message history |
| Welcome message on chat open | ✅ Done | Pre-defined message, no OpenAI call |
| Auto-message on profile change | ✅ Done | 5-second delay, personalized by trainer |
| Unread message badge | ✅ Done | Shows count in sidebar, disappears on open |
| Trainer notification popup | ✅ Done | Top-left popup with preview, auto-dismiss |
| Message read tracking | ✅ Done | Uses last_message_at from trainer_chats |
| Context injection (profile, changes) | ✅ Done | Injected into chatConversational |

### Plan Generation (JSON vs Excel)

| Feature | Status | Notes |
|---------|--------|-------|
| JSON plan generation | ✅ Done | `/api/generate-plan` uses OpenAI JSON mode |
| Excel plan generation | ✅ Done | `/api/build-excel` uses Edu templates |
| Plan storage in Supabase | 🟡 Partial | Stores plan_json but user_id is NULL |
| Plan viewing UI | ❌ Not Done | No UI to view stored plans |
| Plan history | ❌ Not Done | No list of previous plans |
| Plan download (Excel) | ✅ Done | Downloads .xlsx file for Edu |
| Plan download (JSON) | ❌ Not Done | No download option for JSON plans |
| Mock mode (USE_MOCK=1) | ✅ Done | Returns hardcoded plan structure |

### Plan Viewing/Dashboard/History

| Feature | Status | Notes |
|---------|--------|-------|
| Plan list view | ❌ Not Done | No UI to see all plans |
| Plan detail view | ❌ Not Done | No UI to view plan contents |
| Plan comparison | ❌ Not Done | No way to compare plans |
| Plan export | 🟡 Partial | Excel export works, JSON export missing |
| Plan sharing | ❌ Not Done | No sharing functionality |

### Auth & user_id Handling

| Feature | Status | Notes |
|---------|--------|-------|
| Supabase Auth integration | ✅ Done | Login, callback, session management |
| AuthProvider context | ✅ Done | useAuth hook available globally |
| RLS policies | ✅ Done | All tables have RLS enabled |
| user_id in user_profiles | ✅ Done | Correctly linked to auth.users |
| user_id in trainer_chats | ✅ Done | Correctly linked to auth.users |
| user_id in chat_messages | ✅ Done | Via trainer_chats relationship |
| user_id in plans | ❌ Not Done | **CRITICAL: user_id is NULL in all plans** |
| user_id in progress_tracking | ✅ Done | Correctly linked |
| user_id in progress_photos | ✅ Done | Correctly linked |

---

## 3. Files Map (Most Important Files)

### Home UI
- **`src/app/page.tsx`** - Main landing page, shows EpicHomeAuthenticated when authenticated
- **`src/app/_components/EpicHomeAuthenticated.tsx`** - Authenticated homepage with personalized hero, stats, quick links
- **`src/app/_components/PersonalizedHero.tsx`** - Hero section with user name
- **`src/app/_components/PersonalizedNavbar.tsx`** - Navbar with auth state

### Onboarding Pages
- **`src/app/onboarding/basic/page.tsx`** - Basic onboarding form, saves to user_profiles
- **`src/app/onboarding/expert/page.tsx`** - Expert onboarding (exists but incomplete)

### Trainers List + Trainer Profile Page
- **`src/app/trainers/page.tsx`** - Lists all trainers from personas.ts
- **`src/app/trainers/[slug]/page.tsx`** - Individual trainer profile page
- **`src/app/trainers/[slug]/GeneratePlanButton.tsx`** - Demo button to generate plan (not used in real flow)

### Trainer Setup Chat Component
- **`src/app/trainers/edu/configure/page.tsx`** - Edu configuration page, calls TrainerSetupChat
- **`src/app/trainers/edu/configure/TrainerSetupChat.tsx`** - Reusable chat component for structured Q&A + free chat
- **`src/app/trainers/carolina/configure/page.tsx`** - Carolina configuration page

### Generate Plan Button/Component
- **`src/app/trainers/[slug]/GeneratePlanButton.tsx`** - Demo button (not in real flow)
- **`src/app/trainers/edu/configure/page.tsx`** - Real flow: calls /api/build-excel after setup

### API: generate-plan, build-excel, health
- **`src/app/api/generate-plan/route.ts`** - Generates JSON plan via OpenAI, stores in plans table
- **`src/app/api/build-excel/route.ts`** - Builds Excel workbook for Edu, stores plan_json, downloads file
- **`src/app/api/health/route.ts`** - Health check endpoint

### OpenAI Wrapper + Persona Definitions
- **`src/lib/personas.ts`** - Trainer definitions (Edu, Carolina) with personas, setup questions
- **`src/lib/openai-chat.ts`** - chatConversational function (conversational mode, not JSON)
- **`src/lib/openai.ts`** - chatJSON function (JSON mode for plan generation)

### Plan Storage Helper
- **`src/lib/plan-storage.ts`** - insertPlanRecord function, StoredPlanJson type definitions
- **`src/lib/schemas.ts`** - Zod schemas for Plan validation

### Supabase Client
- **`src/lib/supabase.ts`** - Client-side Supabase client (anon key)
- **`src/app/api/chat/route.ts`** - Server-side Supabase client (service role key)

### Chat Components
- **`src/app/_components/ChatGPTStyleChat.tsx`** - Main chat interface, handles welcome message, read tracking
- **`src/app/dashboard/chat/[slug]/page.tsx`** - Chat page wrapper

### Profile & Progress
- **`src/app/dashboard/profile/page.tsx`** - Profile page with edit form, progress tracking, photos
- **`src/app/dashboard/profile/AddProgressModal.tsx`** - Modal to add progress entries
- **`src/app/dashboard/profile/AddPhotoModal.tsx`** - Modal to upload progress photos

### Notifications
- **`src/app/_components/useTrainerNotifications.tsx`** - Hook to detect new trainer messages
- **`src/app/_components/TrainerNotificationPopup.tsx`** - Popup component for trainer notifications
- **`src/app/_components/TrainerNotificationsProvider.tsx`** - Context provider for notifications

### Dashboard Layout
- **`src/app/_components/DashboardLayout.tsx`** - Sidebar layout with navigation, unread badge

---

## 4. Trainer Personality System (Current Reality)

### How Trainers Are Defined

**Location:** `src/lib/personas.ts`

Trainers are defined as objects with:
- `slug`: Unique identifier ('edu', 'carolina')
- `name`: Display name
- `headline`: Short tagline
- `intensity`: 1-10 scale
- `flexibility`: 1-10 scale
- `philosophy`: Training philosophy text
- `persona.system`: System prompt for OpenAI
- `persona.nutrition`: Nutrition guidance text
- `setupIntro`: Initial message in setup chat
- `setupQuestions`: Array of structured questions

### What Actually Changes Between Edu and Carolina

**Edu (Tough, Direct):**
- System prompt: "SERIO, DIRECTO y SIN PIEDAD. No eres amigable. No endulzas NADA."
- Temperature: 0.5 (lower = more consistent, less creative, harder)
- Setup intro: "El entrenador más duro que vas a tener. Si buscas alguien que te endulce las cosas, no soy tu tipo."
- Philosophy: "Sobrecarga progresiva, RIR 0-2, evita volumen basura."
- Intensity: 9/10
- Flexibility: 4/10

**Carolina (Gentle, Supportive):**
- System prompt: "amable, enfocada en salud y sostenibilidad. Sé comprensiva y alentadora."
- Temperature: 0.8 (higher = more creative, friendlier)
- Setup intro: "Vamos a construir un plan que cuide tu metabolismo, tu salud y tu técnica, sin locuras que no puedas mantener."
- Philosophy: "Técnica, movilidad y adherencia. Full-body o Upper/Lower."
- Intensity: 6/10
- Flexibility: 8/10

### Whether "Personality" Is Truly Different

**✅ YES - Significant Differences:**
1. **System Prompts**: Completely different tone and instructions
2. **Temperature**: Edu 0.5 vs Carolina 0.8 (affects response style)
3. **Setup Questions**: Different wording and approach
4. **Auto-messages**: Different responses to profile changes (Edu is tough, Carolina is gentle)
5. **Chat Responses**: Different tone in conversational chat

**However:**
- Both use the same OpenAI model (gpt-4o-mini)
- Both use the same chatConversational function
- Personality is primarily controlled by system prompt, not separate logic

---

## 5. Plan Generation System (Current Reality)

### How /api/generate-plan Builds Prompt and Uses User Context

**File:** `src/app/api/generate-plan/route.ts`

**Flow:**
1. Receives: `mode`, `values`, `trainerSlug`, `title`
2. Finds trainer from `personas.ts`
3. Builds system prompt:
   ```
   ${coach.persona.system}
   Responde SOLO JSON con shape: { "title": string, "weeks": [...] }
   Reglas: 9 semanas exactas; 4-6 ejercicios/día.
   ```
4. Builds `userContext` from `values`:
   - `profile`: fullName, sex, height_cm, weight_kg, goal, notes
   - `availability`: daysPerWeek, cannotTrain
   - `intensity`: number
5. Calls `chatJSON(system, user, userContext)`
6. Validates response with Zod schema (`Plan.safeParse`)
7. Builds `storedPlan` (StoredPlanJson) with:
   - `source: 'json'`
   - `structuredPlan`: Full AI-generated plan
   - `profile`, `availability`, `intensity`: From userContext
8. Calls `insertPlanRecord()` to store in Supabase

**User Context Injection:**
- Injected as a separate user message in `chatJSON()`:
  ```
  "Ten en cuenta el siguiente contexto real del usuario:
   - Nombre: ...
   - Altura: ...
   - Peso: ...
   - Objetivo: ...
   - Días/semana: ...
   - No puede entrenar estos días: ...
   - Intensidad deseada: ..."
  ```

### How /api/build-excel Constructs the Excel

**File:** `src/app/api/build-excel/route.ts`

**Flow:**
1. Receives: `trainerSlug`, `profile`, `availability`, `intensity`
2. Validates: Only works for 'edu'
3. Builds workbook with ExcelJS:
   - **Portada sheet**: User info, trainer, date, goal, stats
   - **9 Week sheets**: One per week (Semana 1, Semana 2, ...)
4. Uses `EDU_WORKOUT_TEMPLATES` (6 templates: PUSH_A, PULL_A, LEGS_A, PUSH_B, PULL_B, LEGS_B)
5. Calls `buildEduWeekPlans()` to generate 9-week plan based on:
   - `daysPerWeek`: Determines template pattern (3-6 days)
   - `intensity`: Affects progression notes
6. For each week:
   - Selects templates based on pattern
   - Generates progression note based on week index and intensity
   - Populates worksheet with exercises, sets, reps, RIR, notes
7. Calls `insertEduPlan()` to store in Supabase
8. Returns Excel buffer as download

**Template Selection:**
- 3 days: PUSH_A, PULL_A, LEGS_A
- 4 days: PUSH_A, PULL_A, LEGS_A, PUSH_B
- 5 days: PUSH_A, PULL_A, LEGS_A, PUSH_B, PULL_B
- 6+ days: All 6 templates

### What Is Stored in plans.plan_json

**For JSON Plans (source: 'json'):**
```json
{
  "version": "v1",
  "source": "json",
  "trainerSlug": "edu",
  "trainerId": null,
  "profile": { "fullName": "...", "sex": "...", "height_cm": 175, ... },
  "availability": { "daysPerWeek": 4, "cannotTrain": ["lunes"] },
  "intensity": 8,
  "structuredPlan": {
    "title": "...",
    "weeks": [
      { "week": 1, "days": [{ "day": "Lunes (Push)", "work": [...] }] },
      ...
    ]
  }
}
```

**For Excel Plans (source: 'excel'):**
```json
{
  "version": "v1",
  "source": "excel",
  "trainerSlug": "edu",
  "trainerId": null,
  "profile": { "fullName": "...", "sex": "...", ... },
  "availability": { "daysPerWeek": 4, "cannotTrain": [] },
  "intensity": 8,
  "weekSummary": [
    { "week": 1, "day": 1, "dayLabel": "Día 1", "templateCode": "PUSH_A", ... },
    ...
  ]
}
```

**Note:** `structuredPlan` is only present for JSON plans. Excel plans use `weekSummary` instead.

### What Breaks If Supabase Insert Fails

**Current Behavior:**
- In `/api/generate-plan`:
  ```typescript
  const insertResult = await insertPlanRecord(...)
  if (!insertResult.ok) {
    console.error('Error inserting plan, but returning success response anyway')
  }
  return NextResponse.json({ ok: true, planId: insertResult.planId ?? null })
  ```
  - **Plan generation still succeeds** even if DB insert fails
  - User gets `{ ok: true, planId: null }`
  - Plan is lost (not stored)

- In `/api/build-excel`:
  ```typescript
  insertEduPlan(body).catch(() => { /* handled inside */ })
  ```
  - Excel download still works
  - DB insert is fire-and-forget
  - If insert fails, plan is lost

**Impact:**
- User can download Excel but plan is not stored
- No way to retrieve plan later
- No plan history
- **CRITICAL: user_id is NULL** (see Auth section)

---

## 6. Known Issues / Tech Debt

### Auth / RLS / user_id null

**Issue:** `plans.user_id` is always NULL
- **Location:** `src/lib/plan-storage.ts:75`
- **Code:** `user_id: null, // auth not implemented yet`
- **Impact:** Plans cannot be linked to users, no way to retrieve user's plans
- **Fix Required:** Get user_id from auth session in API routes, pass to insertPlanRecord

**Issue:** RLS not enabled on `plans` table
- **Impact:** Plans are accessible to all users (if RLS was enabled, would block all access)
- **Fix Required:** Create plans table with RLS, add policies for user access

### Onboarding Data Not Reused

**Issue:** Onboarding data is saved to `user_profiles` but not always used in plan generation
- **Location:** `/api/generate-plan` receives `values` from request, not from DB
- **Impact:** If user skips onboarding or data changes, plan generation uses stale/empty data
- **Fix Required:** Fetch user profile from DB in `/api/generate-plan` and merge with request values

### Mock vs OpenAI

**Issue:** Mock mode exists but not well documented
- **Location:** `src/app/api/generate-plan/route.ts:44`
- **Code:** `if (process.env.USE_MOCK === '1') { raw = mockPlan() }`
- **Impact:** Unclear when/why to use mock mode
- **Fix Required:** Document USE_MOCK env var, or remove if not needed

### Type Safety (Generated DB Types or Not)

**Issue:** No generated TypeScript types from Supabase schema
- **Impact:** Manual type definitions, potential mismatches with DB schema
- **Fix Required:** Use `supabase-gen-types` or similar to generate types from schema

### UI/UX Gaps

**Issue:** No plan viewer
- **Impact:** Users cannot view stored plans after generation
- **Fix Required:** Create `/dashboard/workouts` page to list and view plans

**Issue:** No plan history
- **Impact:** Users cannot see previous plans or compare changes
- **Fix Required:** Add plan list view, filter by trainer, date, etc.

**Issue:** Excel download works but JSON plans have no download
- **Impact:** JSON plans are stored but not accessible to user
- **Fix Required:** Add download button for JSON plans (export as JSON or formatted text)

**Issue:** Profile changes trigger notifications but no way to see history
- **Impact:** Users cannot see what changed and when
- **Fix Required:** Add "Change History" section in profile page

**Issue:** Progress photos uploaded but no gallery view
- **Impact:** Users cannot see all photos in one place
- **Fix Required:** Add photo gallery in profile page

### Other Issues

**Issue:** `trainers` table referenced but may not exist
- **Location:** `src/lib/plan-storage.ts:54`
- **Code:** `await supabase.from('trainers').select('id, slug').eq('slug', params.trainerSlug)`
- **Impact:** If table doesn't exist, trainerId is always null (but code handles this gracefully)
- **Fix Required:** Create trainers table or remove lookup

**Issue:** No error handling for OpenAI API failures
- **Location:** `src/lib/openai-chat.ts`, `src/lib/openai.ts`
- **Impact:** If OpenAI is down, chat/plan generation fails with unclear error
- **Fix Required:** Add retry logic, better error messages, fallback responses

**Issue:** Welcome message is pre-defined, not personalized
- **Location:** `src/app/api/trainer/welcome/route.ts`
- **Impact:** Welcome message doesn't use user's name or context
- **Fix Required:** Inject user context into welcome message (or use OpenAI with fast model)

---

## 7. Next 3 Best Steps (In Order)

### Step 1: Fix Plan Storage and User Linking

**Goal:** Ensure plans are stored with correct user_id and can be retrieved.

**Files to Touch:**
- `src/lib/plan-storage.ts` - Add user_id parameter to insertPlanRecord
- `src/app/api/generate-plan/route.ts` - Get user from auth, pass user_id
- `src/app/api/build-excel/route.ts` - Get user from auth, pass user_id
- Create SQL migration: `create-plans-table.sql` - Create plans table with RLS

**Actions:**
1. Create `plans` table in Supabase:
   ```sql
   CREATE TABLE plans (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     trainer_id INTEGER REFERENCES trainers(id),
     title TEXT NOT NULL,
     plan_json JSONB NOT NULL,
     nutrition_json JSONB,
     technique_json JSONB,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```
2. Add RLS policies for plans table
3. Update `insertPlanRecord` to accept `user_id: string`
4. Update `/api/generate-plan` to get user from auth header
5. Update `/api/build-excel` to get user from auth header
6. Test: Generate plan, verify user_id is set, verify plan is retrievable

**Why First:** Without user_id, plans are orphaned and cannot be retrieved. This blocks all plan viewing features.

---

### Step 2: Build Plan Viewer and History

**Goal:** Allow users to view their stored plans and see plan history.

**Files to Touch:**
- `src/app/dashboard/workouts/page.tsx` - Replace placeholder with plan list view
- Create `src/app/dashboard/workouts/[planId]/page.tsx` - Plan detail view
- Create `src/app/api/plans/route.ts` - GET: List user's plans, GET/[id]: Get plan details
- Create `src/app/_components/PlanViewer.tsx` - Component to render plan (JSON or Excel format)

**Actions:**
1. Create `/api/plans` route:
   - GET: Fetch all plans for user (filter by trainer, date, etc.)
   - GET/[id]: Fetch single plan by ID
2. Update `/dashboard/workouts` page:
   - Fetch plans from API
   - Display list: title, trainer, date, download buttons
   - Link to detail view
3. Create plan detail view:
   - Render plan_json.structuredPlan (for JSON plans)
   - Render plan_json.weekSummary (for Excel plans)
   - Show nutrition_json and technique_json
   - Add download button (JSON export or Excel regeneration)
4. Add plan comparison (optional): Compare two plans side-by-side

**Why Second:** Users generate plans but cannot see them. This is a core feature gap.

---

### Step 3: Enhance Trainer Personalities and Agent Behavior

**Goal:** Make trainers feel more distinct and "agent-like" with proactive behavior.

**Files to Touch:**
- `src/lib/personas.ts` - Add more personality traits, behavior rules
- `src/lib/openai-chat.ts` - Enhance system prompts with behavior instructions
- Create `src/lib/trainer-behaviors.ts` - Define proactive behaviors (check-ins, reminders, etc.)
- `src/app/api/trainer/auto-message/route.ts` - Enhance auto-message generation
- Create `src/app/api/trainer/checkin/route.ts` - Proactive check-in messages

**Actions:**
1. Add behavior rules to personas:
   - Edu: Sends tough reminders if no progress entry in 7 days
   - Carolina: Sends gentle check-ins every 2 weeks
   - Both: React to progress photos, weight changes, etc.
2. Enhance system prompts:
   - Add instructions for proactive behavior
   - Add instructions for remembering user preferences
   - Add instructions for asking follow-up questions
3. Create check-in system:
   - Background job (or API route) to check for inactive users
   - Generate check-in message based on trainer persona
   - Store in trainer_notifications
4. Add "memory" system:
   - Store important facts about user in chat context
   - Reference previous conversations
   - Remember user's preferences (e.g., "I don't like leg day")

**Why Third:** Personality is good but trainers feel reactive, not proactive. Adding agent-like behavior makes them feel more "alive" and useful.

---

## Summary

**What's Working:**
- ✅ Complete auth flow with Supabase
- ✅ Trainer chat with distinct personalities
- ✅ Profile management with progress tracking
- ✅ Plan generation (both JSON and Excel)
- ✅ Trainer notifications on profile changes
- ✅ Dashboard with stats and quick links

**What's Missing:**
- ❌ Plan viewing and history
- ❌ User linking in plans table (user_id is NULL)
- ❌ Plan download for JSON plans
- ❌ Proactive trainer behaviors (check-ins, reminders)

**What Needs Fixing:**
- 🔧 Plans table RLS and user_id linking
- 🔧 Onboarding data reuse in plan generation
- 🔧 Error handling for OpenAI failures
- 🔧 Type safety with generated DB types

**Priority Order:**
1. Fix plan storage (user_id, RLS)
2. Build plan viewer
3. Enhance trainer personalities

---

**End of Report**



