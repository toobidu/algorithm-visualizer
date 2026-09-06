// Thư viện tracer cho Java.
//
// Phải sinh ra command list GIỐNG HỆT bản JavaScript tham chiếu — PLAN.md Phụ lục C.
//
// HAI RÀNG BUỘC KHÔNG ĐƯỢC PHÁ:
//
// 1. KHÔNG có câu lệnh `import`. File này được nối vào SAU code người dùng
//    (`tracerPlacement: 'append'`), mà Java bắt mọi `import` phải đứng trước mọi khai báo
//    class. Cần kiểu nào của thư viện chuẩn thì viết tên đầy đủ: `java.util.List`.
//    Nối vào sau chứ không phải trước, vì Piston chạy class ĐẦU TIÊN trong file —
//    đặt thư viện lên trước là nó chạy nhầm thư viện thay vì code người dùng.
//
// 2. KHÔNG có dấu gạch chéo ngược dạng literal — mọi ký tự escape dựng từ mã số.
//    Escape trong chuỗi Java đi qua công cụ sinh mã rất dễ sai một lớp mà không ai thấy.
//
// Không class nào ở đây được `public`: một file Java chỉ được có một class public,
// và suất đó thuộc về code người dùng.

final class Av {
    private static final char BS = (char) 92;
    private static final char RS = (char) 30;
    static final String PREFIX = "" + RS + "@AV|";

    /** Giới hạn số nguyên an toàn — §3.5 quy tắc 2b. long của Java là 64 bit, của JS là 53. */
    static final long SAFE_INTEGER_LIMIT = 9007199254740991L;

    private static int nextKey = 0;

    private Av() {}

    static String newKey() {
        String key = "k" + nextKey;
        nextKey++;
        return key;
    }

    static void record(String key, String method, Object[] args) {
        StringBuilder sb = new StringBuilder(PREFIX);
        sb.append("{").append(quote("key")).append(':');
        sb.append(key == null ? "null" : quote(key));
        sb.append(',').append(quote("method")).append(':').append(quote(method));
        sb.append(',').append(quote("args")).append(":[");
        for (int i = 0; i < args.length; i++) {
            if (i > 0) sb.append(',');
            sb.append(dump(args[i]));
        }
        sb.append("]}");
        System.out.println(sb);
    }

    /**
     * Tự tuần tự hóa thay vì dùng thư viện JSON: bản đóng gói của Piston không có thư viện
     * ngoài, và cách in số thực phải khớp JavaScript từng ký tự.
     */
    static String dump(Object value) {
        if (value == null) return "null";
        if (value instanceof Boolean) return value.toString();
        if (value instanceof Double || value instanceof Float) {
            return dumpDouble(((Number) value).doubleValue());
        }
        if (value instanceof Number) return dumpLong(((Number) value).longValue());
        if (value instanceof Character) return quote(value.toString());
        if (value instanceof String) return quote((String) value);
        if (value instanceof AvNode) return quote(((AvNode) value).key);

        if (value instanceof int[]) {
            int[] a = (int[]) value;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < a.length; i++) {
                if (i > 0) sb.append(',');
                sb.append(a[i]);
            }
            return sb.append(']').toString();
        }
        if (value instanceof long[]) {
            long[] a = (long[]) value;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < a.length; i++) {
                if (i > 0) sb.append(',');
                sb.append(dumpLong(a[i]));
            }
            return sb.append(']').toString();
        }
        if (value instanceof double[]) {
            double[] a = (double[]) value;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < a.length; i++) {
                if (i > 0) sb.append(',');
                sb.append(dumpDouble(a[i]));
            }
            return sb.append(']').toString();
        }
        if (value instanceof Object[]) {
            Object[] a = (Object[]) value;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < a.length; i++) {
                if (i > 0) sb.append(',');
                sb.append(dump(a[i]));
            }
            return sb.append(']').toString();
        }
        if (value instanceof java.util.List) {
            java.util.List<?> list = (java.util.List<?>) value;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < list.size(); i++) {
                if (i > 0) sb.append(',');
                sb.append(dump(list.get(i)));
            }
            return sb.append(']').toString();
        }
        if (value instanceof java.util.Map) {
            java.util.Map<?, ?> map = (java.util.Map<?, ?>) value;
            StringBuilder sb = new StringBuilder("{");
            boolean first = true;
            for (java.util.Map.Entry<?, ?> entry : map.entrySet()) {
                if (!first) sb.append(',');
                first = false;
                sb.append(quote(String.valueOf(entry.getKey()))).append(':');
                sb.append(dump(entry.getValue()));
            }
            return sb.append('}').toString();
        }
        return quote(value.toString());
    }

    private static String dumpLong(long value) {
        if (value > SAFE_INTEGER_LIMIT || value < -SAFE_INTEGER_LIMIT) {
            throw new IllegalArgumentException(
                    "Gia tri " + value + " vuot khoang so nguyen an toan cua giao thuc. "
                            + "JavaScript se lam tron gia tri nay.");
        }
        return String.valueOf(value);
    }

    /** NaN và vô cực không phải JSON hợp lệ — §3.5 quy tắc 3. */
    private static String dumpDouble(double d) {
        if (Double.isNaN(d)) return "{" + quote("$num") + ":" + quote("NaN") + "}";
        if (Double.isInfinite(d)) {
            return "{" + quote("$num") + ":" + quote(d > 0 ? "Infinity" : "-Infinity") + "}";
        }
        if (d == Math.rint(d) && Math.abs(d) < 1e15) return String.valueOf((long) d);
        return String.valueOf(d);
    }

    static String quote(String text) {
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

/** Gốc chung: mọi tracer chỉ là một khoá cộng vài phương thức chuyển tiếp. */
abstract class AvNode {
    final String key;

    AvNode(String className, Object[] args) {
        this.key = Av.newKey();
        Av.record(this.key, className, args);
    }

    /** Rút gọn lời gọi: mọi phương thức của tracer đều chỉ là ghi lại một lệnh. */
    protected void send(String method, Object... args) {
        Av.record(this.key, method, args);
    }

    public void destroy() {
        send("destroy");
    }

    public void reset() {
        send("reset");
    }

    static Object[] titleArgs(String title) {
        return title == null ? new Object[0] : new Object[] {title};
    }
}

class Array2DTracer extends AvNode {
    Array2DTracer(String title) {
        this(title, "Array2DTracer");
    }

    Array2DTracer(String title, String className) {
        super(className, titleArgs(title));
    }

    public void set(Object data) {
        send("set", data);
    }

    public void patch(int row, int col, Object value) {
        send("patch", row, col, value);
    }

    public void depatch(int row, int col) {
        send("depatch", row, col);
    }

    public void select(int row, int col) {
        send("select", row, col);
    }

    public void selectRow(int row, int from, int to) {
        send("selectRow", row, from, to);
    }

    public void selectCol(int col, int from, int to) {
        send("selectCol", col, from, to);
    }

    public void deselect(int row, int col) {
        send("deselect", row, col);
    }

    public void deselectRow(int row, int from, int to) {
        send("deselectRow", row, from, to);
    }

    public void deselectCol(int col, int from, int to) {
        send("deselectCol", col, from, to);
    }
}

class Array1DTracer extends AvNode {
    Array1DTracer(String title) {
        this(title, "Array1DTracer");
    }

    Array1DTracer(String title, String className) {
        super(className, titleArgs(title));
    }

    public void set(Object data) {
        send("set", data);
    }

    public void patch(int index, Object value) {
        send("patch", index, value);
    }

    public void depatch(int index) {
        send("depatch", index);
    }

    public void select(int index) {
        send("select", index);
    }

    public void select(int from, int to) {
        send("select", from, to);
    }

    public void deselect(int index) {
        send("deselect", index);
    }

    public void deselect(int from, int to) {
        send("deselect", from, to);
    }

    public void chart(AvNode tracer) {
        send("chart", tracer == null ? null : tracer.key);
    }
}

class ChartTracer extends Array1DTracer {
    ChartTracer(String title) {
        super(title, "ChartTracer");
    }
}

class ScatterTracer extends Array2DTracer {
    ScatterTracer(String title) {
        super(title, "ScatterTracer");
    }
}

class LogTracer extends AvNode {
    LogTracer(String title) {
        super("LogTracer", titleArgs(title));
    }

    public void set(Object data) {
        send("set", data);
    }

    public void print(Object message) {
        send("print", message);
    }

    public void println(Object message) {
        send("println", message);
    }

    public void printf(Object format, Object... args) {
        Object[] all = new Object[args.length + 1];
        all[0] = format;
        for (int i = 0; i < args.length; i++) all[i + 1] = args[i];
        Av.record(this.key, "printf", all);
    }
}

class MarkdownTracer extends AvNode {
    MarkdownTracer(String title) {
        super("MarkdownTracer", titleArgs(title));
    }

    public void set(Object data) {
        send("set", data);
    }
}

class GraphTracer extends AvNode {
    GraphTracer(String title) {
        super("GraphTracer", titleArgs(title));
    }

    public void set(Object data) {
        send("set", data);
    }

    public void directed(boolean value) {
        send("directed", value);
    }

    public void weighted(boolean value) {
        send("weighted", value);
    }

    public void addNode(Object id, Object weight, Object x, Object y, Object visitedCount,
            Object selectedCount) {
        send("addNode", id, weight, x, y, visitedCount, selectedCount);
    }

    public void updateNode(Object id, Object weight) {
        send("updateNode", id, weight);
    }

    public void removeNode(Object id) {
        send("removeNode", id);
    }

    public void addEdge(Object source, Object target, Object weight) {
        send("addEdge", source, target, weight);
    }

    public void updateEdge(Object source, Object target, Object weight) {
        send("updateEdge", source, target, weight);
    }

    public void removeEdge(Object source, Object target) {
        send("removeEdge", source, target);
    }

    public void layoutCircle() {
        send("layoutCircle");
    }

    public void layoutTree(Object root, boolean sorted) {
        send("layoutTree", root, sorted);
    }

    public void layoutRandom() {
        send("layoutRandom");
    }

    public void visit(Object target, Object source) {
        send("visit", target, source);
    }

    public void visit(Object target, Object source, Object weight) {
        send("visit", target, source, weight);
    }

    public void leave(Object target, Object source) {
        send("leave", target, source);
    }

    public void select(Object target, Object source) {
        send("select", target, source);
    }

    public void deselect(Object target, Object source) {
        send("deselect", target, source);
    }

    public void log(AvNode tracer) {
        send("log", tracer == null ? null : tracer.key);
    }
}

abstract class AvLayoutNode extends AvNode {
    AvLayoutNode(String className, AvNode[] children) {
        super(className, childKeys(children));
    }

    private static Object[] childKeys(AvNode[] children) {
        String[] keys = new String[children.length];
        for (int i = 0; i < children.length; i++) keys[i] = children[i].key;
        return new Object[] {keys};
    }

    public void add(AvNode child) {
        send("add", child.key);
    }

    public void add(AvNode child, int index) {
        send("add", child.key, index);
    }

    public void remove(AvNode child) {
        send("remove", child.key);
    }

    public void removeAll() {
        send("removeAll");
    }
}

class VerticalLayout extends AvLayoutNode {
    VerticalLayout(AvNode... children) {
        super("VerticalLayout", children);
    }
}

class HorizontalLayout extends AvLayoutNode {
    HorizontalLayout(AvNode... children) {
        super("HorizontalLayout", children);
    }
}

final class Layout {
    private Layout() {}

    static void setRoot(AvNode node) {
        Av.record(null, "setRoot", new Object[] {node.key});
    }
}

final class Tracer {
    private Tracer() {}

    /**
     * Cắt một khung hình.
     *
     * Java KHÔNG suy được số dòng của người gọi một cách rẻ tiền như Python hay Ruby:
     * `StackWalker` phải dựng cả khung ngăn xếp cho mỗi lần gọi, mà `delay` được gọi hàng
     * chục nghìn lần. Vì vậy số dòng là bắt buộc — người dùng truyền thẳng.
     */
    static void delay(int lineNumber) {
        Av.record(null, "delay", new Object[] {lineNumber});
    }

    /** Không truyền số dòng thì tự lấy từ ngăn xếp của người gọi. */
    static void delay() {
        delay(callerLine());
    }

    private static int callerLine() {
        StackWalker walker = StackWalker.getInstance();
        java.util.Optional<Integer> line =
                walker.walk(frames -> frames.skip(2).findFirst().map(f -> f.getLineNumber()));
        return line.orElse(0);
    }
}
