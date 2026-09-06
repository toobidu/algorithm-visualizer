"""Runtime chế độ dán code thuần cho Python.

Python có hook lúc chạy nên không cần biến đổi mã nguồn như Java: `sys.settrace`
cho biết mỗi dòng vừa chạy và toàn bộ biến cục bộ tại đó.

Chỉ in ra bước; phần suy ra vẽ gì nằm ở @av/autoviz, dùng chung cho mọi ngôn ngữ.
"""

import json
import sys

_PREFIX = chr(0x1e) + "@AV|"

# Trần số bước: thuật toán nặng có thể sinh hàng triệu bước và làm nghẽn stdout
MAX_STEPS = 20000
_steps = 0

# Chỉ theo dõi file của người dùng, bỏ qua thư viện chuẩn
_TARGET = "main.py"


def _render(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, int):
        return value if abs(value) <= 9007199254740991 else str(value)
    if isinstance(value, float):
        if value != value:
            return {"$num": "NaN"}
        if value in (float("inf"), float("-inf")):
            return {"$num": "Infinity" if value > 0 else "-Infinity"}
        return value
    if isinstance(value, (list, tuple)):
        return [_render(item) for item in value]
    if isinstance(value, str):
        return value
    return None


def _emit(line, variables):
    payload = {}
    for name, value in variables.items():
        if name.startswith("_"):
            continue
        rendered = _render(value)
        if rendered is not None:
            payload[name] = rendered
    sys.stdout.write(
        _PREFIX + json.dumps({"line": line, "vars": payload}, ensure_ascii=False,
                             separators=(",", ":")) + "\n"
    )


def _tracer(frame, event, _arg):
    global _steps
    if event != "line":
        return _tracer
    if _TARGET not in frame.f_code.co_filename:
        return _tracer
    if _steps >= MAX_STEPS:
        return None
    _steps += 1
    _emit(frame.f_lineno, frame.f_locals)
    return _tracer


def start():
    sys.settrace(_tracer)


def stop():
    sys.settrace(None)
