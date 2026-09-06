// Runtime chế độ dán code thuần cho Java.
//
// Bộ chèn mã (packages/autoviz/src/instrumentJava.ts) gọi AvTrace.step(...) sau mỗi câu lệnh.
// Nhiệm vụ ở đây chỉ là in ra một dòng JSON cho mỗi bước; toàn bộ phần suy ra vẽ gì
// nằm ở @av/autoviz, dùng chung cho mọi ngôn ngữ.
//
// KHÔNG có câu lệnh `import`: file này được nối vào SAU code người dùng, mà Java bắt
// mọi `import` phải đứng trước mọi khai báo class. Vì vậy chỉ dùng kiểu dựng sẵn.
//
// Cũng không dùng dấu gạch chéo ngược dạng literal — mọi ký tự escape đều dựng từ mã số.
// Escape trong chuỗi Java rất dễ bị sai một lớp khi đi qua công cụ sinh mã.

final class AvTrace {
    private static final char BS = (char) 92;
    private static final char RS = (char) 30;
    private static final String PREFIX = "" + RS + "@AV|";

    // Trần số bước: thuật toán nặng có thể sinh hàng triệu bước và làm nghẽn stdout
    private static final int MAX_STEPS = 20000;
    private static int steps = 0;

    private AvTrace() {}

    static void step(int line, Object... pairs) {
        if (steps >= MAX_STEPS) return;
        steps++;

        StringBuilder sb = new StringBuilder();
        sb.append(PREFIX).append("{").append(quote("line")).append(':').append(line);
        sb.append(',').append(quote("vars")).append(":{");
        for (int i = 0; i + 1 < pairs.length; i += 2) {
            if (i > 0) sb.append(',');
            sb.append(quote(String.valueOf(pairs[i]))).append(':').append(render(pairs[i + 1]));
        }
        sb.append("}}");
        System.out.println(sb);
    }

    private static String render(Object value) {
        if (value == null) return "null";
        if (value instanceof int[]) return renderInts((int[]) value);
        if (value instanceof long[]) {
            long[] a = (long[]) value;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < a.length; i++) {
                if (i > 0) sb.append(',');
                sb.append(a[i]);
            }
            return sb.append(']').toString();
        }
        if (value instanceof double[]) {
            double[] a = (double[]) value;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < a.length; i++) {
                if (i > 0) sb.append(',');
                sb.append(renderDouble(a[i]));
            }
            return sb.append(']').toString();
        }
        if (value instanceof int[][]) {
            int[][] grid = (int[][]) value;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < grid.length; i++) {
                if (i > 0) sb.append(',');
                sb.append(renderInts(grid[i]));
            }
            return sb.append(']').toString();
        }
        if (value instanceof Integer || value instanceof Long || value instanceof Short
                || value instanceof Byte) {
            return String.valueOf(value);
        }
        if (value instanceof Double || value instanceof Float) {
            return renderDouble(((Number) value).doubleValue());
        }
        if (value instanceof Boolean) return String.valueOf(value);
        if (value instanceof Character) return quote(String.valueOf(value));
        if (value instanceof String) return quote((String) value);
        // Đối tượng khác không mang thông tin hữu ích cho người học
        return "null";
    }

    private static String renderInts(int[] values) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < values.length; i++) {
            if (i > 0) sb.append(',');
            sb.append(values[i]);
        }
        return sb.append(']').toString();
    }

    // NaN và vô cực không phải JSON hợp lệ — PLAN.md §3.5 quy tắc 3
    private static String renderDouble(double d) {
        if (Double.isNaN(d)) return "{" + quote("$num") + ":" + quote("NaN") + "}";
        if (Double.isInfinite(d)) {
            return "{" + quote("$num") + ":" + quote(d > 0 ? "Infinity" : "-Infinity") + "}";
        }
        if (d == Math.rint(d) && Math.abs(d) < 1e15) return String.valueOf((long) d);
        return String.valueOf(d);
    }

    private static String quote(String text) {
        StringBuilder sb = new StringBuilder();
        sb.append('"');
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (c == '"') sb.append(BS).append('"');
            else if (c == BS) sb.append(BS).append(BS);
            else if (c == 10) sb.append(BS).append('n');
            else if (c == 13) sb.append(BS).append('r');
            else if (c == 9) sb.append(BS).append('t');
            else if (c < 32) sb.append(BS).append('u').append(hex4(c));
            else sb.append(c);
        }
        sb.append('"');
        return sb.toString();
    }

    private static String hex4(char c) {
        String digits = "0123456789abcdef";
        StringBuilder sb = new StringBuilder();
        for (int shift = 12; shift >= 0; shift -= 4) {
            sb.append(digits.charAt((c >> shift) & 0xf));
        }
        return sb.toString();
    }
}
