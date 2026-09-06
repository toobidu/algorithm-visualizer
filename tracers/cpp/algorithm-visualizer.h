// Thư viện tracer cho C++ — header-only, một file, chỉ dùng thư viện chuẩn.
//
// Phải sinh ra command list GIỐNG HỆT bản JavaScript tham chiếu (PLAN.md Phụ lục C).
// Sandbox của Piston không có mạng nên không được phụ thuộc thư viện ngoài.

#ifndef ALGORITHM_VISUALIZER_H
#define ALGORITHM_VISUALIZER_H

#include <cmath>
#include <cstdint>
#include <cstdio>
#include <initializer_list>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

namespace av {

// Tiền tố tách kênh lệnh khỏi stdout thường — PLAN.md §3.5 quy tắc 1
inline std::string prefix() { return std::string(1, static_cast<char>(0x1e)) + "@AV|"; }

// Giới hạn số nguyên an toàn của giao thức — §3.5 quy tắc 2b.
// C++ long long rộng hơn double của JavaScript; không chặn thì hai ngôn ngữ lệch nhau.
constexpr long long kSafeIntegerLimit = 9007199254740991LL;

inline std::string escape(const std::string& text) {
  std::string out = "\"";
  for (char c : text) {
    switch (c) {
      case '"': out += "\\\""; break;
      case '\\': out += "\\\\"; break;
      case '\n': out += "\\n"; break;
      case '\r': out += "\\r"; break;
      case '\t': out += "\\t"; break;
      default:
        if (static_cast<unsigned char>(c) < 0x20) {
          char buf[7];
          std::snprintf(buf, sizeof(buf), "\\u%04x", c);
          out += buf;
        } else {
          out += c;
        }
    }
  }
  return out + "\"";
}

/// Một giá trị JSON. Đủ dùng cho command list, không nhằm thành thư viện JSON đầy đủ.
class Value {
 public:
  Value() : text_("null") {}
  Value(int v) : Value(static_cast<long long>(v)) {}
  Value(long long v) {
    if (v > kSafeIntegerLimit || v < -kSafeIntegerLimit) {
      throw std::runtime_error(
          "Gia tri " + std::to_string(v) +
          " vuot khoang so nguyen an toan cua giao thuc. JavaScript se lam tron gia tri nay.");
    }
    text_ = std::to_string(v);
  }
  Value(bool v) : text_(v ? "true" : "false") {}
  Value(double v) {
    // NaN và vô cực không phải JSON hợp lệ — §3.5 quy tắc 3
    if (std::isnan(v)) {
      text_ = "{\"$num\":\"NaN\"}";
    } else if (std::isinf(v)) {
      text_ = v > 0 ? "{\"$num\":\"Infinity\"}" : "{\"$num\":\"-Infinity\"}";
    } else {
      // %.17g rồi rút gọn: xấp xỉ biểu diễn ngắn nhất khứ hồi được.
      // KHÔNG dùng printf("%f") — nó làm tròn về 6 chữ số và làm đổ bộ tuân thủ.
      char buf[40];
      for (int digits = 1; digits <= 17; ++digits) {
        std::snprintf(buf, sizeof(buf), "%.*g", digits, v);
        if (std::stod(buf) == v) break;
      }
      text_ = buf;
    }
  }
  Value(const char* v) : text_(escape(v)) {}
  Value(const std::string& v) : text_(escape(v)) {}

  template <typename T>
  Value(const std::vector<T>& items) {
    std::string out = "[";
    for (size_t i = 0; i < items.size(); ++i) {
      if (i > 0) out += ",";
      out += Value(items[i]).json();
    }
    text_ = out + "]";
  }

  const std::string& json() const { return text_; }

 private:
  std::string text_;
};

inline int nextKey() {
  static int counter = 0;
  return counter++;
}

inline void record(const std::string& key, const std::string& method,
                   const std::vector<Value>& args) {
  std::string out = prefix() + "{\"key\":";
  out += key.empty() ? "null" : escape(key);
  out += ",\"method\":" + escape(method) + ",\"args\":[";
  for (size_t i = 0; i < args.size(); ++i) {
    if (i > 0) out += ",";
    out += args[i].json();
  }
  out += "]}\n";
  std::fputs(out.c_str(), stdout);
}

class Node {
 public:
  std::string key;
  Node(const std::string& className, const std::vector<Value>& args) {
    key = "k" + std::to_string(nextKey());
    record(key, className, args);
  }
  void destroy() { record(key, "destroy", {}); }
  void reset() { record(key, "reset", {}); }

 protected:
  void call(const std::string& method, const std::vector<Value>& args) const {
    record(key, method, args);
  }
};

inline std::vector<Value> titleArgs(const std::string& title) {
  if (title.empty()) return {};
  return {Value(title)};
}

class Array1DTracer : public Node {
 public:
  explicit Array1DTracer(const std::string& title = "",
                         const std::string& className = "Array1DTracer")
      : Node(className, titleArgs(title)) {}

  template <typename T>
  void set(const std::vector<T>& values) { call("set", {Value(values)}); }
  void select(int a) { call("select", {Value(a)}); }
  void select(int a, int b) { call("select", {Value(a), Value(b)}); }
  void deselect(int a) { call("deselect", {Value(a)}); }
  void deselect(int a, int b) { call("deselect", {Value(a), Value(b)}); }
  void patch(int i, const Value& v) { call("patch", {Value(i), v}); }
  void depatch(int i) { call("depatch", {Value(i)}); }
  void chart(const Node& target) { call("chart", {Value(target.key)}); }
};

class ChartTracer : public Array1DTracer {
 public:
  explicit ChartTracer(const std::string& title = "")
      : Array1DTracer(title, "ChartTracer") {}
};

class Array2DTracer : public Node {
 public:
  explicit Array2DTracer(const std::string& title = "",
                         const std::string& className = "Array2DTracer")
      : Node(className, titleArgs(title)) {}

  template <typename T>
  void set(const std::vector<std::vector<T>>& values) { call("set", {Value(values)}); }
  void select(int sx, int sy) { call("select", {Value(sx), Value(sy)}); }
  void select(int sx, int sy, int ex, int ey) {
    call("select", {Value(sx), Value(sy), Value(ex), Value(ey)});
  }
  void deselect(int sx, int sy) { call("deselect", {Value(sx), Value(sy)}); }
  void selectRow(int x, int sy, int ey) { call("selectRow", {Value(x), Value(sy), Value(ey)}); }
  void deselectRow(int x, int sy, int ey) { call("deselectRow", {Value(x), Value(sy), Value(ey)}); }
  void patch(int x, int y, const Value& v) { call("patch", {Value(x), Value(y), v}); }
  void depatch(int x, int y) { call("depatch", {Value(x), Value(y)}); }
};

class LogTracer : public Node {
 public:
  explicit LogTracer(const std::string& title = "") : Node("LogTracer", titleArgs(title)) {}
  void print(const std::string& message) { call("print", {Value(message)}); }
  void println(const std::string& message) { call("println", {Value(message)}); }
  void set(const std::string& text) { call("set", {Value(text)}); }
};

class GraphTracer : public Node {
 public:
  explicit GraphTracer(const std::string& title = "") : Node("GraphTracer", titleArgs(title)) {}
  void directed(bool v) { call("directed", {Value(v)}); }
  void weighted(bool v) { call("weighted", {Value(v)}); }
  template <typename T>
  void set(const std::vector<std::vector<T>>& matrix) { call("set", {Value(matrix)}); }
  void addNode(int id) { call("addNode", {Value(id)}); }
  void addEdge(int a, int b) { call("addEdge", {Value(a), Value(b)}); }
  void visit(int target) { call("visit", {Value(target)}); }
  void visit(int target, int source) { call("visit", {Value(target), Value(source)}); }
  void leave(int target) { call("leave", {Value(target)}); }
  void leave(int target, int source) { call("leave", {Value(target), Value(source)}); }
  void layoutTree(int root, bool sorted) { call("layoutTree", {Value(root), Value(sorted)}); }
  void log(const Node& target) { call("log", {Value(target.key)}); }
};

class LayoutNode : public Node {
 public:
  LayoutNode(const std::string& className, std::initializer_list<const Node*> children)
      : Node(className, keysOf(children)) {}

 private:
  static std::vector<Value> keysOf(std::initializer_list<const Node*> children) {
    std::vector<std::string> keys;
    for (const Node* child : children) keys.push_back(child->key);
    return {Value(keys)};
  }
};

class VerticalLayout : public LayoutNode {
 public:
  VerticalLayout(std::initializer_list<const Node*> children)
      : LayoutNode("VerticalLayout", children) {}
};

class HorizontalLayout : public LayoutNode {
 public:
  HorizontalLayout(std::initializer_list<const Node*> children)
      : LayoutNode("HorizontalLayout", children) {}
};

struct Layout {
  static void setRoot(const Node& node) { record("", "setRoot", {Value(node.key)}); }
};

struct Tracer {
  static void delay(int lineNumber) { record("", "delay", {Value(lineNumber)}); }
};

}  // namespace av

using namespace av;

/// Cắt một khung hình tại đúng dòng đang gọi.
///
/// Phải là macro chứ không thể là hàm: `__LINE__` chỉ đúng khi được mở ra ngay tại
/// chỗ gọi. Số dòng này nằm trong hệ quy chiếu của file ĐÃ GHÉP (thư viện + code
/// người dùng), và gateway trừ lại phần thư viện bằng `rebaseLineNumbers`.
#define AV_DELAY() av::Tracer::delay(__LINE__)

#endif  // ALGORITHM_VISUALIZER_H
