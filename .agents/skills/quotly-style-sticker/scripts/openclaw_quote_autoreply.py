#!/usr/bin/env python3
import argparse
import base64
import ipaddress
import json
import mimetypes
import os
import re
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
import uuid
from typing import Any, Dict, List, Optional, Tuple

TELEGRAM_TOKEN_URL_PATTERN = re.compile(
    r"https?://api\.telegram\.org/file/bot[^/]+/", re.IGNORECASE
)
DEFAULT_MAX_AVATAR_BYTES = 1_048_576


def _first_non_empty(*values: Any) -> Any:
    for value in values:
        if isinstance(value, str):
            text = value.strip()
            if text:
                return text
            continue
        if value not in (None, {}, [], ()):
            return value
    return None


def _parse_env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    normalized = raw.strip().lower()
    if normalized in ("1", "true", "yes", "on"):
        return True
    if normalized in ("0", "false", "no", "off"):
        return False
    print(
        f"WARN: Invalid boolean env {name}={raw!r}, using default {default}.",
        file=sys.stderr,
    )
    return default


def _parse_env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    try:
        return int(raw.strip())
    except ValueError:
        print(
            f"WARN: Invalid integer env {name}={raw!r}, using default {default}.",
            file=sys.stderr,
        )
        return default


def _get_path(obj: Any, *keys: str) -> Any:
    current = obj
    for key in keys:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
    return current


def _as_int(value: Any, default: int) -> int:
    try:
        return int(str(value).strip())
    except Exception:
        return default


def _clean_name(*parts: Any) -> Optional[str]:
    items = []
    for part in parts:
        if isinstance(part, str) and part.strip():
            items.append(part.strip())
    if not items:
        return None
    return " ".join(items)


def _profile_from_obj(obj: Any) -> Dict[str, Any]:
    if not isinstance(obj, dict):
        return {}
    name = _first_non_empty(
        obj.get("name"),
        obj.get("displayName"),
        obj.get("display_name"),
        _clean_name(obj.get("first_name"), obj.get("last_name")),
        obj.get("username"),
        obj.get("title"),
    )
    return {
        "id": _first_non_empty(obj.get("id"), obj.get("user_id"), obj.get("sender_id")),
        "name": name,
        "avatar": _first_non_empty(
            obj.get("avatar"),
            obj.get("avatarUrl"),
            obj.get("avatar_url"),
            _get_path(obj, "photo", "url"),
            obj.get("photoUrl"),
        ),
        "status_emoji": _first_non_empty(
            obj.get("statusEmoji"),
            obj.get("status_emoji"),
            obj.get("emoji"),
            obj.get("status"),
        ),
        "status_emoji_id": _first_non_empty(
            obj.get("statusEmojiId"),
            obj.get("status_emoji_id"),
            obj.get("emoji_status"),
            obj.get("emoji_status_id"),
            obj.get("emoji_status_custom_emoji_id"),
            _get_path(obj, "statusEmoji", "id"),
            _get_path(obj, "status_emoji", "id"),
        ),
    }


def _merge_profile(*profiles: Dict[str, Any]) -> Dict[str, Any]:
    merged: Dict[str, Any] = {}
    keys = ("id", "name", "avatar", "status_emoji", "status_emoji_id")
    for key in keys:
        merged[key] = _first_non_empty(
            *(p.get(key) if isinstance(p, dict) else None for p in profiles)
        )
    return merged


def _extract_context(payload: Dict[str, Any]) -> Dict[str, Any]:
    context = payload.get("context")
    if isinstance(context, dict):
        return context
    return payload


def _extract_channel(context: Dict[str, Any]) -> str:
    channel = _first_non_empty(
        _get_path(context, "event", "channel"),
        _get_path(context, "channel", "name"),
        context.get("channel"),
    )
    return str(channel).strip().lower() if channel else ""


def _extract_message(context: Dict[str, Any]) -> Dict[str, Any]:
    message = context.get("message")
    if isinstance(message, dict):
        return message
    event_message = _get_path(context, "event", "message")
    if isinstance(event_message, dict):
        return event_message
    return {}


def _extract_raw_payload(context: Dict[str, Any]) -> Any:
    return _first_non_empty(
        _get_path(context, "event", "rawPayload"),
        _get_path(context, "event", "raw_payload"),
        context.get("rawPayload"),
        context.get("raw_payload"),
    )


def _coerce_message_obj(item_payload: Dict[str, Any]) -> Dict[str, Any]:
    for candidate in (
        _get_path(item_payload, "context", "message"),
        item_payload.get("message"),
        _get_path(item_payload, "event", "message"),
    ):
        if isinstance(candidate, dict):
            return candidate

    if any(
        key in item_payload
        for key in (
            "text",
            "body",
            "content",
            "sender",
            "from",
            "forward",
            "forward_from",
            "forward_origin",
        )
    ):
        return item_payload
    return {}


def _extract_item_raw_payload(
    item_payload: Dict[str, Any], fallback_raw_payload: Any
) -> Any:
    return _first_non_empty(
        item_payload.get("rawPayload"),
        item_payload.get("raw_payload"),
        _get_path(item_payload, "event", "rawPayload"),
        _get_path(item_payload, "event", "raw_payload"),
        _get_path(item_payload, "context", "event", "rawPayload"),
        _get_path(item_payload, "context", "event", "raw_payload"),
        fallback_raw_payload,
    )


def _extract_message_items(
    input_payload: Dict[str, Any], context: Dict[str, Any], fallback_raw_payload: Any
) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []

    def append_item(item_payload: Any) -> None:
        if not isinstance(item_payload, dict):
            return
        message_obj = _coerce_message_obj(item_payload)
        has_text_override = bool(
            _first_non_empty(
                item_payload.get("quote_text"), item_payload.get("original_text")
            )
        )
        if not message_obj and not has_text_override:
            return
        items.append(
            {
                "payload": item_payload,
                "message": message_obj,
                "raw_payload": _extract_item_raw_payload(
                    item_payload, fallback_raw_payload
                ),
            }
        )

    for source in (
        input_payload.get("messages"),
        context.get("messages"),
        _get_path(context, "event", "messages"),
    ):
        if isinstance(source, list):
            for item in source:
                append_item(item)

    if not items:
        append_item(input_payload)

    return items


def _extract_forward_from_message(
    message: Dict[str, Any],
) -> Tuple[Dict[str, Any], Optional[str]]:
    candidates = []
    for key in (
        "forward",
        "forwardFrom",
        "forward_from",
        "forwardedFrom",
        "source",
        "origin",
    ):
        value = message.get(key)
        if isinstance(value, dict):
            candidates.append(value)

    for candidate in candidates:
        for nested_key in ("sender", "from", "user", "source", "chat"):
            nested = candidate.get(nested_key)
            profile = _profile_from_obj(nested)
            if profile.get("id") or profile.get("name") or profile.get("avatar"):
                text = _first_non_empty(
                    candidate.get("text"),
                    candidate.get("message"),
                    candidate.get("content"),
                )
                return profile, text
        profile = _profile_from_obj(candidate)
        if profile.get("id") or profile.get("name") or profile.get("avatar"):
            text = _first_non_empty(
                candidate.get("text"),
                candidate.get("message"),
                candidate.get("content"),
            )
            return profile, text

    return {}, None


def _telegram_profile_from_user(user: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(user, dict):
        return {}
    return {
        "id": user.get("id"),
        "name": _first_non_empty(
            _clean_name(user.get("first_name"), user.get("last_name")),
            user.get("username"),
        ),
        "status_emoji_id": _first_non_empty(
            user.get("emoji_status_custom_emoji_id"),
            user.get("emoji_status_id"),
            _get_path(user, "emoji_status", "custom_emoji_id"),
        ),
    }


def _telegram_profile_from_chat(chat: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(chat, dict):
        return {}
    return {
        "id": chat.get("id"),
        "name": _first_non_empty(chat.get("title"), chat.get("username")),
    }


def _extract_forward_from_raw(raw_payload: Any) -> Tuple[Dict[str, Any], Optional[str]]:
    if not isinstance(raw_payload, dict):
        return {}, None

    message = raw_payload.get("message")
    if not isinstance(message, dict):
        message = raw_payload

    forward_profile: Dict[str, Any] = {}
    forward_text = _first_non_empty(message.get("text"), message.get("caption"))

    forward_from = message.get("forward_from")
    if isinstance(forward_from, dict):
        forward_profile = _telegram_profile_from_user(forward_from)

    if not forward_profile:
        forward_origin = message.get("forward_origin")
        if isinstance(forward_origin, dict):
            origin_type = str(forward_origin.get("type") or "").strip().lower()
            if origin_type == "user":
                forward_profile = _telegram_profile_from_user(
                    forward_origin.get("sender_user") or {}
                )
            elif origin_type in ("chat", "channel"):
                forward_profile = _telegram_profile_from_chat(
                    forward_origin.get("sender_chat") or {}
                )
            elif origin_type == "hidden_user":
                forward_profile = {
                    "name": _first_non_empty(
                        forward_origin.get("sender_user_name"),
                        forward_origin.get("sender_name"),
                    )
                }

    if not forward_profile:
        hidden_name = message.get("forward_sender_name")
        if hidden_name:
            forward_profile = {"name": hidden_name}

    return forward_profile, forward_text


def _normalize_user_id(value: Any) -> Optional[int]:
    if value is None:
        return None
    if isinstance(value, int):
        return value
    text = str(value).strip()
    if text.lstrip("-").isdigit():
        return int(text)
    return None


def _tg_api_call(
    token: str, method: str, params: Dict[str, Any], timeout_seconds: float
) -> Dict[str, Any]:
    query = urllib.parse.urlencode(params)
    url = f"https://api.telegram.org/bot{token}/{method}?{query}"
    request = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if not payload.get("ok"):
        raise RuntimeError(f"Telegram API {method} failed: {payload}")
    result = payload.get("result")
    return result if isinstance(result, dict) else {}


def _guess_mime_type(file_path: str) -> str:
    mime_type, _ = mimetypes.guess_type(file_path)
    if mime_type and mime_type.startswith("image/"):
        return mime_type
    return "image/jpeg"


def _download_telegram_file_data_url(
    token: str, file_path: str, timeout_seconds: float, max_avatar_bytes: int
) -> Optional[str]:
    download_url = f"https://api.telegram.org/file/bot{token}/{file_path}"
    request = urllib.request.Request(download_url, method="GET")
    with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
        image_bytes = response.read(max_avatar_bytes + 1)
    if len(image_bytes) > max_avatar_bytes:
        raise RuntimeError(
            f"Telegram avatar is larger than max_avatar_bytes ({max_avatar_bytes})."
        )
    if not image_bytes:
        return None
    mime_type = _guess_mime_type(file_path)
    encoded = base64.b64encode(image_bytes).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def _fetch_telegram_avatar_data_url(
    token: str, user_id: int, timeout_seconds: float, max_avatar_bytes: int
) -> Optional[str]:
    photos_result = _tg_api_call(
        token,
        "getUserProfilePhotos",
        {"user_id": user_id, "limit": 1},
        timeout_seconds,
    )
    photos = photos_result.get("photos")
    if not isinstance(photos, list) or not photos:
        return None

    sizes = photos[0]
    if not isinstance(sizes, list) or not sizes:
        return None

    file_id = _first_non_empty(
        *(photo.get("file_id") for photo in reversed(sizes) if isinstance(photo, dict))
    )
    if not file_id:
        return None

    file_result = _tg_api_call(token, "getFile", {"file_id": file_id}, timeout_seconds)
    file_path = file_result.get("file_path")
    if not isinstance(file_path, str) or not file_path.strip():
        return None

    return _download_telegram_file_data_url(
        token, file_path, timeout_seconds, max_avatar_bytes
    )


def _extract_text(
    base_payload: Dict[str, Any],
    item_payload: Dict[str, Any],
    message: Dict[str, Any],
    forward_text_from_context: Optional[str],
    forward_text_from_raw: Optional[str],
) -> str:
    return str(
        _first_non_empty(
            item_payload.get("quote_text"),
            base_payload.get("quote_text"),
            message.get("text"),
            message.get("body"),
            message.get("content"),
            forward_text_from_context,
            forward_text_from_raw,
            item_payload.get("original_text"),
            base_payload.get("original_text"),
            "",
        )
    )


def _decode_image_base64(image_data: str) -> bytes:
    payload = image_data.strip()
    if payload.startswith("data:image") and "," in payload:
        payload = payload.split(",", 1)[1]
    payload = payload.replace("\n", "").replace("\r", "")
    missing_padding = len(payload) % 4
    if missing_padding:
        payload += "=" * (4 - missing_padding)
    return base64.b64decode(payload)


def _looks_like_webp(data: bytes) -> bool:
    return len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP"


def _request_quote_api_bytes(
    api_url: str, payload: Dict[str, Any], timeout_seconds: float
) -> bytes:
    request = urllib.request.Request(
        api_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "User-Agent": "openclaw-quotly-skill/1.0",
            "Accept": "application/json,image/webp,*/*",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
        return response.read()


def _generate_quote_image(
    payload: Dict[str, Any], api_url: str, timeout_seconds: float
) -> bytes:
    urls = [api_url]
    if not api_url.lower().endswith(".webp"):
        urls.append(f"{api_url}.webp")

    last_error: Optional[Exception] = None
    for url in urls:
        try:
            body = _request_quote_api_bytes(url, payload, timeout_seconds)
            if _looks_like_webp(body):
                return body
            result = json.loads(body.decode("utf-8"))
            image_data = _first_non_empty(
                _get_path(result, "result", "image"), result.get("image")
            )
            if isinstance(image_data, str) and image_data.strip():
                return _decode_image_base64(image_data)
            raise RuntimeError(f"Invalid QuotLy response: {result}")
        except (
            urllib.error.HTTPError,
            urllib.error.URLError,
            json.JSONDecodeError,
            RuntimeError,
        ) as exc:
            last_error = exc

    if last_error is not None:
        raise last_error
    raise RuntimeError("Failed to generate quote image.")


def _save_temp_webp(image_bytes: bytes) -> str:
    path = os.path.join(tempfile.gettempdir(), f"quotly-{uuid.uuid4().hex}.webp")
    with open(path, "wb") as handle:
        handle.write(image_bytes)
    return os.path.abspath(path)


def _contains_telegram_token_url(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    return bool(TELEGRAM_TOKEN_URL_PATTERN.search(value))


def _estimate_data_url_size_bytes(data_url: str) -> int:
    if "," not in data_url:
        return 0
    payload = data_url.split(",", 1)[1].replace("\n", "").replace("\r", "").strip()
    if not payload:
        return 0
    return (len(payload) * 3) // 4


def _parse_avatar_allow_hosts(raw_value: str) -> List[str]:
    hosts: List[str] = []
    for item in raw_value.split(","):
        host = item.strip().lower().rstrip(".")
        if host:
            hosts.append(host)
    return hosts


def _host_matches_allowlist(host: str, allow_hosts: List[str]) -> bool:
    for allowed in allow_hosts:
        if host == allowed or host.endswith(f".{allowed}"):
            return True
    return False


def _is_disallowed_host(host: str) -> bool:
    if not host:
        return True

    lowered = host.lower().rstrip(".")
    if lowered in ("localhost", "localhost.localdomain"):
        return True
    if lowered.endswith(".local") or lowered.endswith(".internal"):
        return True
    if lowered in ("metadata.google.internal",):
        return True

    try:
        ip = ipaddress.ip_address(lowered)
        return not ip.is_global
    except ValueError:
        return False


def _sanitize_avatar_for_renderer(
    avatar_value: Any,
    max_avatar_bytes: int,
    disable_remote_avatar_url: bool,
    avatar_allow_hosts: List[str],
) -> Optional[str]:
    if not isinstance(avatar_value, str):
        return None

    avatar = avatar_value.strip()
    if not avatar:
        return None

    if _contains_telegram_token_url(avatar):
        print(
            "WARN: Unsafe Telegram file URL contains bot token; avatar removed to avoid secret leakage.",
            file=sys.stderr,
        )
        return None

    if avatar.lower().startswith("data:image/"):
        data_size = _estimate_data_url_size_bytes(avatar)
        if data_size > max_avatar_bytes:
            print(
                f"WARN: Avatar data URL too large ({data_size} bytes), removed.",
                file=sys.stderr,
            )
            return None
        return avatar

    parsed = urllib.parse.urlparse(avatar)
    if parsed.scheme.lower() != "https":
        print("WARN: Non-HTTPS avatar URL removed.", file=sys.stderr)
        return None
    if parsed.username or parsed.password:
        print("WARN: Avatar URL with embedded credentials removed.", file=sys.stderr)
        return None
    if disable_remote_avatar_url:
        print(
            "WARN: Remote avatar URL disabled by configuration; avatar removed.",
            file=sys.stderr,
        )
        return None

    host = (parsed.hostname or "").lower().rstrip(".")
    if _is_disallowed_host(host):
        print(
            "WARN: Avatar URL points to a disallowed host; avatar removed.",
            file=sys.stderr,
        )
        return None
    if avatar_allow_hosts and not _host_matches_allowlist(host, avatar_allow_hosts):
        print(
            "WARN: Avatar URL host is not in allowlist; avatar removed.",
            file=sys.stderr,
        )
        return None

    query_pairs = urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)
    sensitive_query_keys = (
        "token",
        "sig",
        "signature",
        "auth",
        "secret",
        "credential",
        "security",
        "access_key",
        "x-amz",
        "x-goog",
    )
    for key, _ in query_pairs:
        lowered = key.lower()
        if any(marker in lowered for marker in sensitive_query_keys):
            print(
                "WARN: Avatar URL query looks sensitive; avatar removed.",
                file=sys.stderr,
            )
            return None

    return parsed._replace(fragment="").geturl()


def _split_display_name(name: str) -> Tuple[str, Optional[str]]:
    text = name.strip()
    if not text:
        return "Unknown", None
    parts = text.split(" ", 1)
    first_name = parts[0]
    last_name = parts[1].strip() if len(parts) > 1 and parts[1].strip() else None
    return first_name, last_name


def _resolve_source_profile(
    base_payload: Dict[str, Any],
    item_payload: Dict[str, Any],
    message: Dict[str, Any],
    raw_payload: Any,
) -> Tuple[Dict[str, Any], Optional[str], Optional[str]]:
    explicit_profile_base = {
        "id": base_payload.get("source_id"),
        "name": base_payload.get("source_name"),
        "avatar": base_payload.get("source_avatar_url"),
        "status_emoji": base_payload.get("source_status_emoji"),
        "status_emoji_id": _first_non_empty(
            base_payload.get("source_status_emoji_id"),
            base_payload.get("source_status_id"),
        ),
    }
    explicit_profile_item = {
        "id": item_payload.get("source_id"),
        "name": item_payload.get("source_name"),
        "avatar": item_payload.get("source_avatar_url"),
        "status_emoji": item_payload.get("source_status_emoji"),
        "status_emoji_id": _first_non_empty(
            item_payload.get("source_status_emoji_id"),
            item_payload.get("source_status_id"),
        ),
    }
    sender_profile = _merge_profile(
        _profile_from_obj(message.get("sender")),
        _profile_from_obj(message.get("from")),
    )
    forward_profile_context, forward_text_context = _extract_forward_from_message(
        message
    )
    forward_profile_raw, forward_text_raw = _extract_forward_from_raw(raw_payload)

    source_profile = _merge_profile(
        explicit_profile_item,
        explicit_profile_base,
        forward_profile_context,
        forward_profile_raw,
        sender_profile,
    )
    return source_profile, forward_text_context, forward_text_raw


def _build_quote_message(
    base_payload: Dict[str, Any],
    item_payload: Dict[str, Any],
    message: Dict[str, Any],
    raw_payload: Any,
    channel: str,
    args: argparse.Namespace,
    avatar_cache: Dict[int, Optional[str]],
    avatar_allow_hosts: List[str],
) -> Optional[Dict[str, Any]]:
    source_profile, forward_text_context, forward_text_raw = _resolve_source_profile(
        base_payload, item_payload, message, raw_payload
    )
    source_avatar = source_profile.get("avatar")
    source_id = _normalize_user_id(source_profile.get("id"))

    if (
        not source_avatar
        and channel == "telegram"
        and source_id is not None
        and not args.disable_telegram_avatar_lookup
    ):
        if source_id in avatar_cache:
            source_avatar = avatar_cache[source_id]
        else:
            token = _first_non_empty(
                os.getenv("TG_BOT_TOKEN"), os.getenv("TELEGRAM_BOT_TOKEN")
            )
            if token:
                try:
                    source_avatar = _fetch_telegram_avatar_data_url(
                        str(token), source_id, args.timeout, args.max_avatar_bytes
                    )
                except Exception as avatar_exc:
                    print(
                        f"WARN: Telegram avatar lookup failed, continuing without avatar: {avatar_exc}",
                        file=sys.stderr,
                    )
                    source_avatar = None
            else:
                source_avatar = None
            avatar_cache[source_id] = source_avatar

    source_avatar = _sanitize_avatar_for_renderer(
        source_avatar,
        args.max_avatar_bytes,
        args.disable_remote_avatar_url,
        avatar_allow_hosts,
    )

    source_name = str(_first_non_empty(source_profile.get("name"), "Unknown"))
    source_status_emoji = _first_non_empty(source_profile.get("status_emoji"))
    source_status_emoji_id = _first_non_empty(source_profile.get("status_emoji_id"))
    display_name = source_name

    quote_text = _extract_text(
        base_payload, item_payload, message, forward_text_context, forward_text_raw
    )
    if not quote_text.strip():
        return None

    first_name, last_name = _split_display_name(display_name)
    message_from: Dict[str, Any] = {"id": source_id if source_id is not None else 0}
    message_from["first_name"] = first_name
    if last_name:
        message_from["last_name"] = last_name
    message_from["name"] = display_name
    if source_status_emoji_id:
        message_from["emoji_status"] = str(source_status_emoji_id)
    elif source_status_emoji:
        message_from["name"] = f"{display_name} {source_status_emoji}"
        message_from["first_name"], message_from["last_name"] = _split_display_name(
            message_from["name"]
        )
    if source_avatar:
        message_from["photo"] = {"url": str(source_avatar)}

    return {
        "entities": [],
        "avatar": True,
        "from": message_from,
        "text": quote_text,
    }


def _load_input_payload(input_arg: str) -> Dict[str, Any]:
    if input_arg == "-":
        raw = sys.stdin.read()
        if not raw.strip():
            raise RuntimeError(
                "Stdin is empty. Provide JSON via stdin when using --input -."
            )
        payload = json.loads(raw)
    else:
        with open(input_arg, "r", encoding="utf-8") as handle:
            payload = json.load(handle)
    if not isinstance(payload, dict):
        raise RuntimeError("Input payload must be a JSON object.")
    return payload


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate QuotLy-style sticker and output MEDIA path for OpenClaw.",
        epilog=(
            "Risk controls use environment variables: "
            "QUOTLY_DISABLE_TELEGRAM_AVATAR_LOOKUP, "
            "QUOTLY_DISABLE_REMOTE_AVATAR_URL, "
            "QUOTLY_AVATAR_ALLOW_HOSTS, "
            "QUOTLY_MAX_AVATAR_BYTES."
        ),
    )
    parser.add_argument(
        "--input",
        required=True,
        help="Path to input JSON file, or '-' to read JSON from stdin.",
    )
    parser.add_argument(
        "--api",
        default="https://bot.lyo.su/quote/generate",
        help="QuotLy API endpoint.",
    )
    parser.add_argument(
        "--timeout", type=float, default=20.0, help="Network timeout seconds."
    )
    parser.add_argument(
        "--debug-raw", action="store_true", help="Print raw payload JSON to stderr."
    )
    args = parser.parse_args()

    try:
        args.disable_telegram_avatar_lookup = _parse_env_bool(
            "QUOTLY_DISABLE_TELEGRAM_AVATAR_LOOKUP", True
        )
        args.disable_remote_avatar_url = _parse_env_bool(
            "QUOTLY_DISABLE_REMOTE_AVATAR_URL", True
        )
        args.max_avatar_bytes = _parse_env_int(
            "QUOTLY_MAX_AVATAR_BYTES", DEFAULT_MAX_AVATAR_BYTES
        )
        if args.max_avatar_bytes <= 0:
            raise RuntimeError("Environment QUOTLY_MAX_AVATAR_BYTES must be > 0.")

        avatar_allow_hosts = _parse_avatar_allow_hosts(
            os.getenv("QUOTLY_AVATAR_ALLOW_HOSTS", "")
        )
        input_payload = _load_input_payload(args.input)

        context = _extract_context(input_payload)
        channel = _extract_channel(context)
        raw_payload = _extract_raw_payload(context)
        message_items = _extract_message_items(input_payload, context, raw_payload)

        if args.debug_raw and isinstance(raw_payload, dict):
            print(
                json.dumps(raw_payload, ensure_ascii=False, indent=2), file=sys.stderr
            )

        quote_messages: List[Dict[str, Any]] = []
        avatar_cache: Dict[int, Optional[str]] = {}
        for idx, item in enumerate(message_items, start=1):
            quote_message = _build_quote_message(
                input_payload,
                item["payload"],
                item["message"],
                item["raw_payload"],
                channel,
                args,
                avatar_cache,
                avatar_allow_hosts,
            )
            if quote_message is None:
                print(
                    f"WARN: Skipping message #{idx} because no renderable text was found.",
                    file=sys.stderr,
                )
                continue
            quote_messages.append(quote_message)

        if not quote_messages:
            raise RuntimeError(
                "No quote text available. Provide quote_text or message.text/original_text."
            )

        quotly_payload = {
            "type": "quote",
            "format": "webp",
            "backgroundColor": str(input_payload.get("background_color", "#1b1429")),
            "width": _as_int(input_payload.get("width", 512), 512),
            "height": _as_int(input_payload.get("height", 768), 768),
            "scale": _as_int(input_payload.get("scale", 2), 2),
            "maxWidth": _as_int(input_payload.get("max_width", 300), 300),
            "borderRadius": _as_int(input_payload.get("border_radius", 28), 28),
            "pictureRadius": _as_int(input_payload.get("picture_radius", 512), 512),
            "messages": quote_messages,
        }

        image_bytes = _generate_quote_image(quotly_payload, args.api, args.timeout)
        media_path = _save_temp_webp(image_bytes)

        print("Quote sticker generated.")
        print(f"MEDIA:{media_path}")
        return 0
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
