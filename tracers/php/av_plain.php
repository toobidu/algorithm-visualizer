<?php
// Runtime chế độ tự trực quan hóa cho PHP.
//
// `declare(ticks=1)` khiến PHP gọi hàm đăng ký sau MỖI câu lệnh. Nó phải là câu lệnh đầu
// tiên của file và chỉ tác dụng với code nằm sau nó trong cùng file — nên runtime này
// bắt buộc nằm trên đầu, không gửi kèm thành file riêng được.
//
// Chỉ in ra bước; phần suy ra vẽ gì nằm ở @av/autoviz, dùng chung cho mọi ngôn ngữ.

declare(ticks=1);

const AV_PREFIX = "\x1e@AV|";

// Trần số bước: thuật toán nặng có thể sinh hàng triệu bước và làm nghẽn stdout
const AV_MAX_STEPS = 20000;

$avSteps = 0;

function avRender($value) {
    if (is_int($value)) {
        return abs($value) <= 9007199254740991 ? $value : (string) $value;
    }
    if (is_float($value)) {
        if (is_nan($value)) return ['$num' => 'NaN'];
        if (is_infinite($value)) return ['$num' => $value > 0 ? 'Infinity' : '-Infinity'];
        return $value;
    }
    if (is_bool($value) || is_string($value) || $value === null) return $value;
    if (is_array($value)) return array_map('avRender', $value);
    return null;
}

function avTick() {
    global $avSteps;
    if ($avSteps >= AV_MAX_STEPS) return;

    $frames = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 2);
    $frame = $frames[0] ?? null;
    if ($frame === null) return;
    // Chỉ theo dõi file của người dùng
    if (!str_ends_with($frame['file'] ?? '', 'main.php')) return;

    $avSteps++;

    $vars = [];
    foreach ($GLOBALS as $name => $value) {
        if ($name === 'GLOBALS' || str_starts_with($name, 'av') || str_starts_with($name, '_')) {
            continue;
        }
        $rendered = avRender($value);
        if ($rendered !== null) $vars[$name] = $rendered;
    }

    echo AV_PREFIX . json_encode(
        ['line' => $frame['line'], 'vars' => (object) $vars],
        JSON_UNESCAPED_UNICODE
    ) . "\n";
}

register_tick_function('avTick');
