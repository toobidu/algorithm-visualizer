<?php

/**
 * Thư viện tracer cho PHP.
 *
 * Phải sinh ra command list GIỐNG HỆT bản JavaScript tham chiếu — PLAN.md Phụ lục C.
 * Chỉ dùng thư viện chuẩn: sandbox của Piston không có mạng.
 *
 * Ký tự escape trong chuỗi kết quả dựng từ mã số (`chr(92)`) chứ không viết literal:
 * chuỗi PHP có hai lớp escape và rất dễ sai một lớp mà không ai thấy.
 */

final class Av
{
    /** Tiền tố tách kênh lệnh khỏi stdout thường — §3.5 quy tắc 1. */
    public const PREFIX = "\x1e@AV|";

    /** Giới hạn số nguyên an toàn — §3.5 quy tắc 2b. int của PHP là 64 bit, của JS là 53. */
    public const SAFE_INTEGER_LIMIT = 9007199254740991;

    private static int $nextKey = 0;

    public static function newKey(): string
    {
        $key = 'k' . self::$nextKey;
        self::$nextKey++;
        return $key;
    }

    public static function record(?string $key, string $method, array $args): void
    {
        $parts = [];
        foreach ($args as $arg) {
            $parts[] = self::dump($arg);
        }
        echo self::PREFIX
            . '{"key":' . ($key === null ? 'null' : self::quote($key))
            . ',"method":' . self::quote($method)
            . ',"args":[' . implode(',', $parts) . ']}'
            . PHP_EOL;
    }

    /**
     * Tự tuần tự hóa thay vì json_encode: json_encode in số thực nguyên là "1.0" trong
     * một số cấu hình và escape "/" thành gạch chéo có escape. Khác một ký tự là bộ
     * tuân thủ đỏ mà không rõ nguyên nhân.
     */
    public static function dump(mixed $value): string
    {
        if ($value === null) {
            return 'null';
        }
        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }
        if (is_int($value)) {
            if (abs($value) > self::SAFE_INTEGER_LIMIT) {
                throw new RuntimeException(
                    "Gia tri $value vuot khoang so nguyen an toan cua giao thuc. "
                    . 'JavaScript se lam tron gia tri nay.'
                );
            }
            return (string) $value;
        }
        if (is_float($value)) {
            return self::dumpFloat($value);
        }
        if (is_string($value)) {
            return self::quote($value);
        }
        if (is_array($value)) {
            return array_is_list($value) ? self::dumpList($value) : self::dumpMap($value);
        }
        if ($value instanceof AvNode) {
            return self::quote($value->key);
        }
        return 'null';
    }

    private static function dumpList(array $items): string
    {
        $parts = [];
        foreach ($items as $item) {
            $parts[] = self::dump($item);
        }
        return '[' . implode(',', $parts) . ']';
    }

    private static function dumpMap(array $map): string
    {
        $parts = [];
        foreach ($map as $key => $item) {
            $parts[] = self::quote((string) $key) . ':' . self::dump($item);
        }
        return '{' . implode(',', $parts) . '}';
    }

    /** NaN và vô cực không phải JSON hợp lệ — §3.5 quy tắc 3. */
    private static function dumpFloat(float $value): string
    {
        if (is_nan($value)) {
            return '{' . self::quote('$num') . ':' . self::quote('NaN') . '}';
        }
        if (is_infinite($value)) {
            return '{' . self::quote('$num') . ':'
                . self::quote($value > 0 ? 'Infinity' : '-Infinity') . '}';
        }
        if ($value == floor($value) && abs($value) < 1e15) {
            return (string) (int) $value;
        }
        return rtrim(rtrim(sprintf('%.17g', $value), '0'), '.');
    }

    public static function quote(string $text): string
    {
        $bs = chr(92);
        $out = '"';
        $length = strlen($text);
        for ($i = 0; $i < $length; $i++) {
            $c = $text[$i];
            $code = ord($c);
            if ($c === '"') {
                $out .= $bs . '"';
            } elseif ($c === $bs) {
                $out .= $bs . $bs;
            } elseif ($code === 10) {
                $out .= $bs . 'n';
            } elseif ($code === 13) {
                $out .= $bs . 'r';
            } elseif ($code === 9) {
                $out .= $bs . 't';
            } elseif ($code < 32) {
                $out .= $bs . 'u' . sprintf('%04x', $code);
            } else {
                $out .= $c;
            }
        }
        return $out . '"';
    }
}

/** Gốc chung: mọi tracer chỉ là một khoá cộng danh sách phương thức chuyển tiếp. */
abstract class AvNode
{
    public string $key;

    /** Phương thức được phép chuyển tiếp thẳng sang command list. */
    protected const FORWARD = [];

    public function __construct(string $className, array $args)
    {
        $this->key = Av::newKey();
        Av::record($this->key, $className, $args);
    }

    public function __call(string $name, array $args): void
    {
        if (!in_array($name, static::FORWARD, true)) {
            throw new BadMethodCallException(
                static::class . " khong co phuong thuc $name"
            );
        }
        Av::record($this->key, $name, $args);
    }

    public function destroy(): void
    {
        Av::record($this->key, 'destroy', []);
    }

    public function reset(): void
    {
        Av::record($this->key, 'reset', []);
    }

    protected static function titleArgs(?string $title): array
    {
        return $title === null ? [] : [$title];
    }
}

class Array2DTracer extends AvNode
{
    protected const FORWARD = [
        'set', 'patch', 'depatch', 'select', 'selectRow', 'selectCol',
        'deselect', 'deselectRow', 'deselectCol',
    ];

    public function __construct(?string $title = null, string $className = 'Array2DTracer')
    {
        parent::__construct($className, self::titleArgs($title));
    }
}

class Array1DTracer extends AvNode
{
    protected const FORWARD = ['set', 'patch', 'depatch', 'select', 'deselect'];

    public function __construct(?string $title = null, string $className = 'Array1DTracer')
    {
        parent::__construct($className, self::titleArgs($title));
    }

    public function chart(?AvNode $tracer): void
    {
        Av::record($this->key, 'chart', [$tracer?->key]);
    }
}

class ChartTracer extends Array1DTracer
{
    public function __construct(?string $title = null)
    {
        parent::__construct($title, 'ChartTracer');
    }
}

class ScatterTracer extends Array2DTracer
{
    public function __construct(?string $title = null)
    {
        parent::__construct($title, 'ScatterTracer');
    }
}

class LogTracer extends AvNode
{
    protected const FORWARD = ['set', 'print', 'println', 'printf'];

    public function __construct(?string $title = null)
    {
        parent::__construct('LogTracer', self::titleArgs($title));
    }
}

class MarkdownTracer extends AvNode
{
    protected const FORWARD = ['set'];

    public function __construct(?string $title = null)
    {
        parent::__construct('MarkdownTracer', self::titleArgs($title));
    }
}

class GraphTracer extends AvNode
{
    protected const FORWARD = [
        'set', 'directed', 'weighted', 'addNode', 'updateNode', 'removeNode',
        'addEdge', 'updateEdge', 'removeEdge', 'layoutCircle', 'layoutTree',
        'layoutRandom', 'visit', 'leave', 'select', 'deselect',
    ];

    public function __construct(?string $title = null)
    {
        parent::__construct('GraphTracer', self::titleArgs($title));
    }

    public function log(?AvNode $tracer): void
    {
        Av::record($this->key, 'log', [$tracer?->key]);
    }
}

abstract class AvLayoutNode extends AvNode
{
    /** @param AvNode[] $children */
    public function __construct(string $className, array $children)
    {
        parent::__construct($className, [array_map(fn(AvNode $c) => $c->key, $children)]);
    }

    public function add(AvNode $child, ?int $index = null): void
    {
        Av::record($this->key, 'add', $index === null ? [$child->key] : [$child->key, $index]);
    }

    public function remove(AvNode $child): void
    {
        Av::record($this->key, 'remove', [$child->key]);
    }

    public function removeAll(): void
    {
        Av::record($this->key, 'removeAll', []);
    }
}

class VerticalLayout extends AvLayoutNode
{
    public function __construct(array $children)
    {
        parent::__construct('VerticalLayout', $children);
    }
}

class HorizontalLayout extends AvLayoutNode
{
    public function __construct(array $children)
    {
        parent::__construct('HorizontalLayout', $children);
    }
}

final class Layout
{
    public static function setRoot(AvNode $node): void
    {
        Av::record(null, 'setRoot', [$node->key]);
    }
}

final class Tracer
{
    /**
     * Cắt một khung hình. Không truyền số dòng thì lấy từ ngăn xếp của người gọi —
     * `debug_backtrace` cho số dòng chính xác nên không phải bù offset như JavaScript.
     */
    public static function delay(?int $lineNumber = null): void
    {
        if ($lineNumber === null) {
            $frames = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 1);
            $lineNumber = $frames[0]['line'] ?? 0;
        }
        Av::record(null, 'delay', [$lineNumber]);
    }
}
