📁 Project Architecture
Monorepo Structure
htc2026/
├── frontend/ # React + Vite + Tailwind v4
├── backend/ # FastAPI + SQLAlchemy + PostgreSQL
├── gpu-worker/ # PyTorch training container
├── k8s/ # Kubernetes manifests
└── docker-compose.yml # Local development
Best Practice: Keep services loosely coupled with clear API boundaries. Each service has its own Dockerfile and can be deployed independently.

🎨 Frontend Best Practices

1. Three-Tier Font System
   Use semantic font roles for consistent typography:

/_ CSS Variables _/
--font-body: "Inter" /_ Default UI text _/
--font-display: "Source Serif 4" /_ Hero headings, mission titles _/
--font-mono: "Geist Mono" /_ Stats, labels, code _/
Usage:

Body text: Automatic (default)
Display headings: .font-mission-title or font-family: var(--font-display)
Stats/metadata: .text-meta (13px, uppercase, monospace)
Why: Creates visual hierarchy and improves readability across different content types.

2. Design System with CSS Variables
   Define all colors as CSS variables in :root and .dark for seamless theme switching:

:root {
--background: #FFFFFF;
--foreground: #0F172A;
--primary: #2563EB;
--border: #E2E8F0;
/_ ... _/
}
.dark {
--background: #080D1F;
--foreground: #F1F5F9;
--primary: #2563EB; /_ Same primary across themes _/
--border: rgba(37, 99, 235, 0.18); /_ Glowing borders _/
}
Best Practice: Use semantic color names (--primary, --muted-foreground) instead of literal colors (--blue-500). This makes theme switching automatic.

3. Component Composition with CVA
   Use class-variance-authority for type-safe variant-based styling:

import { cva, type VariantProps } from "class-variance-authority"
const buttonVariants = cva(
"inline-flex items-center justify-center gap-2 rounded-full transition-all",
{
variants: {
variant: {
default: "bg-primary text-primary-foreground hover:bg-primary/90",
outline: "border bg-background hover:bg-accent",
ghost: "hover:bg-accent hover:text-accent-foreground",
},
size: {
default: "h-9 px-4 py-2",
sm: "h-8 px-3",
lg: "h-10 px-6",
icon: "size-9",
},
},
defaultVariants: {
variant: "default",
size: "default",
},
}
)
function Button({ variant, size, className, ...props }: VariantProps<typeof buttonVariants>) {
return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />
}
Why: Type-safe variants prevent typos, improve autocomplete, and centralize component styling logic.

4. State Management Pattern
   Use React Context + hooks for global state with clear separation of concerns:

// lib/store.tsx
interface AppState {
isAuthenticated: boolean
user: UserProfile | null
missions: Mission[]
}
interface AppActions {
login: (email: string, password: string) => Promise<boolean>
addMission: (data: MissionCreate) => Promise<string>
uploadFiles: (missionId: string, files: File[]) => Promise<void>
}
type Store = AppState & AppActions
export function StoreProvider({ children }: { children: ReactNode }) {
const [user, setUser] = useState<UserProfile | null>(null)

const login = useCallback(async (email, password) => {
const res = await apiLogin(email, password)
setUser(res.user)
localStorage.setItem("dfa_auth", JSON.stringify({ token: res.token }))
return true
}, [])

return <StoreContext.Provider value={{ user, login, ... }}>{children}</StoreContext.Provider>
}
export function useStore() {
const ctx = useContext(StoreContext)
if (!ctx) throw new Error("useStore must be used within StoreProvider")
return ctx
}
Best Practices:

Persist auth state to localStorage for session continuity
Use useCallback for action functions to prevent unnecessary re-renders
Separate state (data) from actions (functions) in interface definitions
Throw descriptive errors when hooks are used outside providers 5. API Layer Abstraction
Centralize all API calls with error handling and type safety:

// lib/api.ts
export class ApiError extends Error {
constructor(public status: number, message: string) {
super(message)
}
}
async function fetchWithAuth(url: string, options: RequestInit = {}) {
const auth = localStorage.getItem("dfa_auth")
const token = auth ? JSON.parse(auth).token : null

const res = await fetch(url, {
...options,
headers: {
"Content-Type": "application/json",
...(token && { Authorization: `Bearer ${token}` }),
...options.headers,
},
})

if (!res.ok) {
const error = await res.json().catch(() => ({ detail: "Request failed" }))
throw new ApiError(res.status, error.detail || `HTTP ${res.status}`)
}

return res.json()
}
export async function apiGetMissions(params: { limit?: number }) {
return fetchWithAuth(`/api/missions?limit=${params.limit || 20}`)
}
Why: Centralized error handling, automatic auth token injection, and type-safe responses.

6. Progressive Enhancement with Animations
   Use BlurFade and staggered delays for smooth page loads:

<BlurFade delay={0.1}>
  <h1>Hero Title</h1>
</BlurFade>
<BlurFade delay={0.2}>
  <p>Description text</p>
</BlurFade>
<BlurFade delay={0.3}>
  <Button>Call to Action</Button>
</BlurFade>
Best Practice: Increment delays by 0.1-0.2s for natural staggered reveals. Keep total animation time under 1s to avoid feeling sluggish.

7. Dark Mode Implementation
   Prevent flash of unstyled content with inline script:

<!-- index.html -->
<script>
  (function() {
    var theme = localStorage.getItem('theme');
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  })();
</script>

Why: Runs before React hydration to prevent theme flash. Respects system preference as default.

8. Responsive Design Patterns
   Use Tailwind's mobile-first breakpoints with semantic class names:

<div className="
  px-4 py-8          /* Mobile: tight padding */
  sm:px-6 sm:py-12  /* Tablet: medium padding */
  lg:px-8 lg:py-16  /* Desktop: generous padding */
  max-w-6xl mx-auto /* Constrain width, center */
">
  <h1 className="
    text-3xl          /* Mobile: 30px */
    sm:text-4xl       /* Tablet: 36px */
    lg:text-5xl       /* Desktop: 48px */
    font-semibold tracking-tight
  ">
    Responsive Heading
  </h1>
</div>
🔧 Backend Best Practices
1. Configuration Management
Use Pydantic Settings for type-safe environment variables:

# app/core/config.py

from pydantic_settings import BaseSettings
from functools import lru_cache
class Settings(BaseSettings):
DATABASE_URL: str = "postgresql+asyncpg://..."
S3_ENDPOINT_URL: str = "https://..."
HF_TOKEN: str = ""
APP_ENV: str = "development"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

@lru_cache
def get_settings() -> Settings:
return Settings()
Best Practices:

Use @lru_cache to load settings once (singleton pattern)
Provide sensible defaults for local development
Use @property for computed config values
Document required vs optional env vars in comments 2. Database Session Management
Use dependency injection with automatic rollback:

# app/core/database.py

from sqlalchemy.ext.asyncio import create*async_engine, async_sessionmaker, AsyncSession
engine = create_async_engine(
settings.DATABASE_URL,
echo=settings.APP_ENV == "development", # SQL logging in dev
pool_size=5,
max_overflow=10,
)
AsyncSessionLocal = async_sessionmaker(
engine,
class*=AsyncSession,
expire_on_commit=False, # Allow access to objects after commit
)
async def get_db() -> AsyncGenerator[AsyncSession, None]:
async with AsyncSessionLocal() as session:
try:
yield session
await session.commit()
except Exception:
await session.rollback()
raise
Why: Automatic commit on success, rollback on error. No manual session management in routes.

3. SQLAlchemy Model Patterns
   Use mixins for common fields:

# app/models/base.py

from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import func
from datetime import datetime
import uuid
class Base(DeclarativeBase):
pass
class TimestampMixin:
created_at: Mapped[datetime] = mapped_column(server_default=func.now())
updated_at: Mapped[datetime] = mapped_column(
server_default=func.now(),
onupdate=func.now()
)
class UUIDMixin:
id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)

# Usage

class Mission(Base, UUIDMixin, TimestampMixin):
**tablename** = "missions"
title: Mapped[str]
description: Mapped[str]
Best Practice: Use server_default for timestamps to ensure consistency even with raw SQL inserts.

4. Router Organization
   Group related endpoints with clear prefixes and tags:

# app/routers/missions.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
router = APIRouter(prefix="/missions", tags=["missions"])
@router.get("", response_model=MissionListResponse)
async def list_missions(
status: MissionStatus | None = None,
skip: int = Query(0, ge=0),
limit: int = Query(20, ge=1, le=100),
db: AsyncSession = Depends(get_db),
): # ... implementation
@router.post("", response_model=MissionResponse)
async def create_mission(
payload: MissionCreate,
db: AsyncSession = Depends(get_db),
user: User = Depends(get_current_user),
): # ... implementation
Best Practices:

Use empty string "" for list/create endpoints (not "/")
Add validation with Query(ge=0, le=100) for pagination
Use response_model for automatic serialization and docs
Inject dependencies (db, user) via Depends() 5. Background Tasks with Lifespan
Use FastAPI lifespan for startup/shutdown tasks:

# main.py

from contextlib import asynccontextmanager
import asyncio
\_background_tasks: list[asyncio.Task] = []
@asynccontextmanager
async def lifespan(app: FastAPI): # Startup
async with engine.begin() as conn:
await conn.run_sync(Base.metadata.create_all)

    _background_tasks.append(asyncio.create_task(monitor_heartbeats()))
    _background_tasks.append(asyncio.create_task(cleanup_orphaned_jobs()))
    logger.info("Background tasks started")

    yield

    # Shutdown
    for task in _background_tasks:
        task.cancel()
    await asyncio.gather(*_background_tasks, return_exceptions=True)
    await engine.dispose()

app = FastAPI(lifespan=lifespan)
Why: Ensures background tasks are properly started and cleaned up. Prevents resource leaks.

6. Error Handling Pattern
   Use structured logging and HTTP exceptions:

import logging
logger = logging.getLogger(**name**)
@router.post("/train")
async def start_training(job_id: str, db: AsyncSession = Depends(get_db)):
try:
job = await db.get(TrainingJob, job_id)
if not job:
raise HTTPException(status_code=404, detail="Job not found")

        await training_orchestrator.start_job(job)
        logger.info("Training started: job_id=%s", job_id)
        return {"status": "started"}

    except ValueError as exc:
        logger.error("Invalid job config: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.exception("Training start failed: job_id=%s", job_id)
        raise HTTPException(status_code=500, detail="Internal server error")

Best Practices:

Use logger.exception() for unexpected errors (includes traceback)
Use logger.error() for expected errors (validation, not found)
Return structured error responses with detail field
Never expose internal error details in production
🐳 Docker & Deployment

1. Multi-Stage Dockerfile (if needed)
   FROM python:3.12-slim
   WORKDIR /app

# Install system deps

RUN apt-get update && apt-get install -y --no-install-recommends \
 gcc libpq-dev && \
 rm -rf /var/lib/apt/lists/\*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
Best Practices:

Use --no-install-recommends to minimize image size
Clean up apt cache with rm -rf /var/lib/apt/lists/\*
Use --no-cache-dir for pip to save space
Specify exact Python version (not latest) 2. Docker Compose for Local Dev
services:
db:
image: postgres:16-alpine
environment:
POSTGRES_USER: dataforall
POSTGRES_PASSWORD: dataforall
POSTGRES_DB: dataforall
ports: - "5432:5432"
volumes: - pgdata:/var/lib/postgresql/data
healthcheck:
test: ["CMD-SHELL", "pg_isready -U dataforall"]
interval: 5s
timeout: 3s
retries: 5
backend:
build: ./backend
ports: - "8000:8000"
env_file: - .env
volumes: - ./backend:/app # Hot reload
depends_on:
db:
condition: service_healthy # Wait for DB
volumes:
pgdata:
Best Practice: Use depends_on with condition: service_healthy to ensure services start in correct order.

🔐 Security Best Practices

1. JWT Authentication

# app/core/auth.py

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer
import jwt
security = HTTPBearer()
async def get_current_user(
credentials: HTTPAuthorizationCredentials = Depends(security),
db: AsyncSession = Depends(get_db),
) -> User:
token = credentials.credentials
try:
payload = jwt.decode(token, settings.APP_SECRET_KEY, algorithms=["HS256"])
user_id = payload.get("sub")
if not user_id:
raise HTTPException(status_code=401, detail="Invalid token")

        user = await db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

2. Password Hashing
   import bcrypt
   def hash_password(password: str) -> str:
   return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
   def verify_password(plain: str, hashed: str) -> bool:
   return bcrypt.checkpw(plain.encode(), hashed.encode())
   Never store plain text passwords. Always use bcrypt or argon2.

🚀 Performance Best Practices

1. Database Query Optimization
   Use selectinload to prevent N+1 queries:

from sqlalchemy.orm import selectinload
query = select(Mission).options(
selectinload(Mission.datasets),
selectinload(Mission.members).selectinload(MissionMember.user),
)
result = await db.execute(query)
missions = result.scalars().all() 2. Pagination Pattern
@router.get("/missions")
async def list_missions(
skip: int = Query(0, ge=0),
limit: int = Query(20, ge=1, le=100),
db: AsyncSession = Depends(get_db),
):
count_query = select(func.count(Mission.id))
total = (await db.execute(count_query)).scalar() or 0

    query = select(Mission).offset(skip).limit(limit)
    result = await db.execute(query)
    missions = result.scalars().all()

    return {
        "missions": missions,
        "total": total,
        "skip": skip,
        "limit": limit,
    }

📝 Code Style Guidelines
TypeScript/React
Use function declarations for components (not const arrow functions)
Prefer interface over type for object shapes
Use async/await over .then() chains
Destructure props in function signature
Use ?? for null coalescing, ?. for optional chaining
Python
Follow PEP 8 (use black formatter)
Use type hints for all function signatures
Prefer async/await over callbacks
Use f-strings for string formatting
Keep functions under 50 lines (extract helpers)
🧪 Testing Patterns (Future)

# tests/test_missions.py

import pytest
from httpx import AsyncClient
@pytest.mark.asyncio
async def test_create_mission(client: AsyncClient, auth_headers: dict):
response = await client.post(
"/api/missions",
json={"title": "Test Mission", "description": "..."},
headers=auth_headers,
)
assert response.status_code == 201
data = response.json()
assert data["title"] == "Test Mission"
📚 Documentation Standards
Code comments: Explain why, not what
Docstrings: Use for public APIs and complex functions
README: Include setup instructions, architecture diagram, and API docs link
CHANGELOG: Document breaking changes and new features
🎯 Key Takeaways
Consistency over cleverness — Use established patterns
Type safety everywhere — TypeScript + Pydantic prevent runtime errors
Fail fast, fail loud — Throw descriptive errors early
Separate concerns — UI, business logic, data access in different layers
Optimize for readability — Code is read 10x more than written
Document decisions — Future you will thank present
