"""Thư viện tracer cho Python.

Phải sinh ra command list GIỐNG HỆT bản JavaScript tham chiếu
(`apps/web/src/features/runner/tracerRuntime.ts`) — xem PLAN.md Phụ lục C.

Chỉ dùng thư viện chuẩn: sandbox của Piston không có mạng.
"""

import inspect
import json
import math
import sys

# Tiền tố tách kênh lệnh khỏi stdout thường — PLAN.md §3.5 quy tắc 1.
# U+001E RECORD SEPARATOR, khớp `COMMAND_PREFIX` trong @av/protocol.
_PREFIX = chr(0x1e) + "@AV|"

# Giới hạn số nguyên an toàn của giao thức — §3.5 quy tắc 2b.
# Python int không giới hạn, JavaScript thì có: không chặn ở đây thì hai ngôn ngữ
# sinh ra command list khác nhau và bộ tuân thủ đỏ mà không rõ nguyên nhân.
_SAFE_INTEGER_LIMIT = 9007199254740991

_next_key = 0
_base_line = None


def _normalize(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, int):
        if abs(value) > _SAFE_INTEGER_LIMIT:
            raise ValueError(
                "Gia tri %d vuot khoang so nguyen an toan cua giao thuc. "
                "JavaScript se lam tron gia tri nay." % value
            )
        return value
    if isinstance(value, float):
        # NaN va vo cuc khong phai JSON hop le — §3.5 quy tac 3
        if math.isnan(value):
            return {"$num": "NaN"}
        if math.isinf(value):
            return {"$num": "Infinity" if value > 0 else "-Infinity"}
        return value
    if isinstance(value, (list, tuple)):
        return [_normalize(item) for item in value]
    if isinstance(value, dict):
        return {str(k): _normalize(v) for k, v in value.items()}
    return value


def _record(key, method, args):
    line = json.dumps(
        {"key": key, "method": method, "args": [_normalize(a) for a in args]},
        ensure_ascii=False,
        separators=(",", ":"),
    )
    sys.stdout.write(_PREFIX + line + "\n")


def _new_key():
    global _next_key
    key = "k%d" % _next_key
    _next_key += 1
    return key


class _Node:
    def __init__(self, class_name, args):
        self.key = _new_key()
        _record(self.key, class_name, args)

    def destroy(self):
        _record(self.key, "destroy", [])

    def reset(self):
        _record(self.key, "reset", [])


def _add_methods(cls, names):
    for name in names:
        def make(method_name):
            def call(self, *args):
                _record(self.key, method_name, list(args))
            return call
        setattr(cls, name, make(name))


def _title_args(title):
    return [] if title is None else [title]


class Array2DTracer(_Node):
    def __init__(self, title=None, _class_name="Array2DTracer"):
        _Node.__init__(self, _class_name, _title_args(title))


_add_methods(
    Array2DTracer,
    ["set", "patch", "depatch", "select", "selectRow", "selectCol",
     "deselect", "deselectRow", "deselectCol"],
)


class Array1DTracer(_Node):
    def __init__(self, title=None, _class_name="Array1DTracer"):
        _Node.__init__(self, _class_name, _title_args(title))

    def chart(self, tracer):
        _record(self.key, "chart", [tracer.key if tracer is not None else None])


_add_methods(Array1DTracer, ["set", "patch", "depatch", "select", "deselect"])


class ChartTracer(Array1DTracer):
    def __init__(self, title=None):
        Array1DTracer.__init__(self, title, "ChartTracer")


class ScatterTracer(Array2DTracer):
    def __init__(self, title=None):
        Array2DTracer.__init__(self, title, "ScatterTracer")


class LogTracer(_Node):
    def __init__(self, title=None):
        _Node.__init__(self, "LogTracer", _title_args(title))


_add_methods(LogTracer, ["set", "print", "println", "printf"])


class MarkdownTracer(_Node):
    def __init__(self, title=None):
        _Node.__init__(self, "MarkdownTracer", _title_args(title))


_add_methods(MarkdownTracer, ["set"])


class GraphTracer(_Node):
    def __init__(self, title=None):
        _Node.__init__(self, "GraphTracer", _title_args(title))

    def log(self, tracer):
        _record(self.key, "log", [tracer.key if tracer is not None else None])


_add_methods(
    GraphTracer,
    ["set", "directed", "weighted", "addNode", "updateNode", "removeNode",
     "addEdge", "updateEdge", "removeEdge", "layoutCircle", "layoutTree",
     "layoutRandom", "visit", "leave", "select", "deselect"],
)


class _LayoutNode(_Node):
    def __init__(self, class_name, children):
        _Node.__init__(self, class_name, [[child.key for child in children]])

    def add(self, child, index=None):
        args = [child.key] if index is None else [child.key, index]
        _record(self.key, "add", args)

    def remove(self, child):
        _record(self.key, "remove", [child.key])

    def removeAll(self):
        _record(self.key, "removeAll", [])


class VerticalLayout(_LayoutNode):
    def __init__(self, children):
        _LayoutNode.__init__(self, "VerticalLayout", children)


class HorizontalLayout(_LayoutNode):
    def __init__(self, children):
        _LayoutNode.__init__(self, "HorizontalLayout", children)


class Layout:
    @staticmethod
    def setRoot(node):
        _record(None, "setRoot", [node.key])


class Tracer:
    @staticmethod
    def delay(line_number=None):
        """Cắt một khung hình.

        Không truyền số dòng thì lấy từ khung ngăn xếp của người gọi. Bản JavaScript
        phải suy từ chuỗi ngăn xếp lỗi; Python có `inspect` nên chính xác hơn.
        """
        if line_number is None:
            frame = inspect.currentframe()
            caller = frame.f_back if frame is not None else None
            line_number = caller.f_lineno if caller is not None else 0
            if _base_line is not None:
                line_number = max(0, line_number - _base_line)
        _record(None, "delay", [line_number])
