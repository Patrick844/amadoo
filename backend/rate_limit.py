import time
from collections import defaultdict, deque

from fastapi import Request, HTTPException

from config import settings

# In-memory sliding-window rate limiter. Fine for a single-instance backend; for a
# multi-instance deployment, back this with Redis (same interface).
_hits: dict[str, deque] = defaultdict(deque)


def _client_ip(request: Request) -> str:
    # Respect the proxy header when present (set by a load balancer / reverse proxy).
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(max_requests: int, window_seconds: int, scope: str):
    """Dependency factory: allow at most `max_requests` per `window_seconds` per IP.

    Disabled when settings.RATE_LIMIT_ENABLED is False (the test suite sets this so it
    isn't throttled). Raises 429 with a Retry-After header when the limit is exceeded.
    """
    async def _dep(request: Request):
        if not settings.RATE_LIMIT_ENABLED:
            return
        key = f"{scope}:{_client_ip(request)}"
        now = time.monotonic()
        dq = _hits[key]
        cutoff = now - window_seconds
        while dq and dq[0] < cutoff:
            dq.popleft()
        if len(dq) >= max_requests:
            retry = int(window_seconds - (now - dq[0])) + 1
            raise HTTPException(
                status_code=429,
                detail=f"Too many attempts. Please try again in {retry}s.",
                headers={"Retry-After": str(retry)},
            )
        dq.append(now)

    return _dep
