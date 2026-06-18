import logging
import httpx

log = logging.getLogger("amadoo.push")

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def send_push(to_token: str, title: str, body: str, data: dict | None = None) -> None:
    if not to_token or not to_token.startswith("ExponentPushToken"):
        log.debug("[PUSH] Skipping — no valid token: %s", to_token)
        return

    payload = {
        "to": to_token,
        "title": title,
        "body": body,
        "data": data or {},
        "sound": "default",
        "priority": "high",
        "channelId": "default",
    }

    try:
        async with httpx.AsyncClient(timeout=5) as client:
            res = await client.post(
                EXPO_PUSH_URL,
                json=payload,
                headers={"Accept-Encoding": "gzip, deflate", "Accept": "application/json", "Content-Type": "application/json"},
            )
            result = res.json()
            if res.status_code == 200:
                log.info("[PUSH] ✅ Sent to %s — status: %s", to_token[:30], result.get("data", {}).get("status"))
            else:
                log.warning("[PUSH] ❌ Expo API %d: %s", res.status_code, result)
    except Exception as e:
        log.error("[PUSH] ❌ Exception sending push: %s", e)
