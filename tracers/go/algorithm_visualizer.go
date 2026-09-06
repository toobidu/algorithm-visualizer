// Thư viện tracer cho Go.
//
// Phải sinh ra command list GIỐNG HỆT bản JavaScript tham chiếu (PLAN.md Phụ lục C).
// Chỉ dùng thư viện chuẩn: sandbox của Piston không có mạng.
//
// Nằm chung package main với code người dùng — Piston biên dịch mọi file .go gửi lên,
// nên không cần nhúng thẳng như C++.

package main

import (
	"fmt"
	"math"
	"os"
	"runtime"
	"strconv"
	"strings"
)

// Tiền tố tách kênh lệnh khỏi stdout thường — PLAN.md §3.5 quy tắc 1
var avPrefix = string(rune(0x1e)) + "@AV|"

// Giới hạn số nguyên an toàn của giao thức — §3.5 quy tắc 2b.
// int64 của Go rộng hơn double của JavaScript; không chặn thì hai ngôn ngữ lệch nhau.
const avSafeIntegerLimit int64 = 9007199254740991

var avNextKey int

// AvValue là một giá trị JSON đã được tuần tự hóa sẵn.
type AvValue struct{ json string }

func avEscape(text string) string {
	var b strings.Builder
	b.WriteByte('"')
	for _, r := range text {
		switch r {
		case '"':
			b.WriteString("\\\"")
		case '\\':
			b.WriteString("\\\\")
		case '\n':
			b.WriteString("\\n")
		case '\r':
			b.WriteString("\\r")
		case '\t':
			b.WriteString("\\t")
		default:
			if r < 0x20 {
				b.WriteString(fmt.Sprintf("\\u%04x", r))
			} else {
				b.WriteRune(r)
			}
		}
	}
	b.WriteByte('"')
	return b.String()
}

// AvInt bọc số nguyên, báo lỗi nếu vượt khoảng an toàn của giao thức.
func AvInt(v int) AvValue {
	n := int64(v)
	if n > avSafeIntegerLimit || n < -avSafeIntegerLimit {
		panic(fmt.Sprintf(
			"Gia tri %d vuot khoang so nguyen an toan cua giao thuc. JavaScript se lam tron gia tri nay.", n))
	}
	return AvValue{strconv.FormatInt(n, 10)}
}

// AvFloat bọc số thực; NaN và vô cực không phải JSON hợp lệ nên được đánh dấu — §3.5 quy tắc 3.
func AvFloat(v float64) AvValue {
	if math.IsNaN(v) {
		return AvValue{`{"$num":"NaN"}`}
	}
	if math.IsInf(v, 1) {
		return AvValue{`{"$num":"Infinity"}`}
	}
	if math.IsInf(v, -1) {
		return AvValue{`{"$num":"-Infinity"}`}
	}
	// 'g' với -1 chữ số cho biểu diễn ngắn nhất khứ hồi được, đúng như JavaScript
	return AvValue{strconv.FormatFloat(v, 'g', -1, 64)}
}

func AvStr(v string) AvValue  { return AvValue{avEscape(v)} }
func AvBool(v bool) AvValue   { return AvValue{strconv.FormatBool(v)} }

// AvInts bọc một mảng số nguyên.
func AvInts(values []int) AvValue {
	parts := make([]string, len(values))
	for i, v := range values {
		parts[i] = AvInt(v).json
	}
	return AvValue{"[" + strings.Join(parts, ",") + "]"}
}

// AvIntGrid bọc một mảng hai chiều.
func AvIntGrid(rows [][]int) AvValue {
	parts := make([]string, len(rows))
	for i, row := range rows {
		parts[i] = AvInts(row).json
	}
	return AvValue{"[" + strings.Join(parts, ",") + "]"}
}

func avRecord(key string, method string, args []AvValue) {
	parts := make([]string, len(args))
	for i, a := range args {
		parts[i] = a.json
	}
	keyJSON := "null"
	if key != "" {
		keyJSON = avEscape(key)
	}
	fmt.Fprintf(os.Stdout, "%s{\"key\":%s,\"method\":%s,\"args\":[%s]}\n",
		avPrefix, keyJSON, avEscape(method), strings.Join(parts, ","))
}

func avNewKey() string {
	key := "k" + strconv.Itoa(avNextKey)
	avNextKey++
	return key
}

type avNode struct{ Key string }

func (n *avNode) call(method string, args ...AvValue) { avRecord(n.Key, method, args) }
func (n *avNode) Destroy()                            { n.call("destroy") }

func avTitleArgs(title string) []AvValue {
	if title == "" {
		return nil
	}
	return []AvValue{AvStr(title)}
}

func avNew(className string, args []AvValue) avNode {
	node := avNode{Key: avNewKey()}
	avRecord(node.Key, className, args)
	return node
}

// Array1DTracer hiển thị một mảng một chiều.
type Array1DTracer struct{ avNode }

func NewArray1DTracer(title string) *Array1DTracer {
	return &Array1DTracer{avNew("Array1DTracer", avTitleArgs(title))}
}
func (t *Array1DTracer) Set(values []int)      { t.call("set", AvInts(values)) }
func (t *Array1DTracer) Select(a, b int)       { t.call("select", AvInt(a), AvInt(b)) }
func (t *Array1DTracer) SelectOne(a int)       { t.call("select", AvInt(a)) }
func (t *Array1DTracer) Deselect(a, b int)     { t.call("deselect", AvInt(a), AvInt(b)) }
func (t *Array1DTracer) Patch(i, value int)    { t.call("patch", AvInt(i), AvInt(value)) }
func (t *Array1DTracer) Depatch(i int)         { t.call("depatch", AvInt(i)) }
func (t *Array1DTracer) Chart(c *ChartTracer)  { t.call("chart", AvStr(c.Key)) }

// ChartTracer hiển thị cùng dữ liệu dưới dạng cột.
type ChartTracer struct{ avNode }

func NewChartTracer(title string) *ChartTracer {
	return &ChartTracer{avNew("ChartTracer", avTitleArgs(title))}
}

// Array2DTracer hiển thị lưới hai chiều.
type Array2DTracer struct{ avNode }

func NewArray2DTracer(title string) *Array2DTracer {
	return &Array2DTracer{avNew("Array2DTracer", avTitleArgs(title))}
}
func (t *Array2DTracer) Set(rows [][]int)             { t.call("set", AvIntGrid(rows)) }
func (t *Array2DTracer) Select(sx, sy int)            { t.call("select", AvInt(sx), AvInt(sy)) }
func (t *Array2DTracer) SelectRow(x, sy, ey int)      { t.call("selectRow", AvInt(x), AvInt(sy), AvInt(ey)) }
func (t *Array2DTracer) DeselectRow(x, sy, ey int)    { t.call("deselectRow", AvInt(x), AvInt(sy), AvInt(ey)) }
func (t *Array2DTracer) Patch(x, y, value int)        { t.call("patch", AvInt(x), AvInt(y), AvInt(value)) }
func (t *Array2DTracer) Depatch(x, y int)             { t.call("depatch", AvInt(x), AvInt(y)) }

// LogTracer là khung nhật ký dạng văn bản thuần.
type LogTracer struct{ avNode }

func NewLogTracer(title string) *LogTracer {
	return &LogTracer{avNew("LogTracer", avTitleArgs(title))}
}
func (t *LogTracer) Print(message string)   { t.call("print", AvStr(message)) }
func (t *LogTracer) Println(message string) { t.call("println", AvStr(message)) }

// GraphTracer hiển thị đồ thị.
type GraphTracer struct{ avNode }

func NewGraphTracer(title string) *GraphTracer {
	return &GraphTracer{avNew("GraphTracer", avTitleArgs(title))}
}
func (t *GraphTracer) Set(matrix [][]int)          { t.call("set", AvIntGrid(matrix)) }
func (t *GraphTracer) Directed(v bool)             { t.call("directed", AvBool(v)) }
func (t *GraphTracer) Weighted(v bool)             { t.call("weighted", AvBool(v)) }
func (t *GraphTracer) AddNode(id int)              { t.call("addNode", AvInt(id)) }
func (t *GraphTracer) AddEdge(a, b int)            { t.call("addEdge", AvInt(a), AvInt(b)) }
func (t *GraphTracer) Visit(target, source int)    { t.call("visit", AvInt(target), AvInt(source)) }
func (t *GraphTracer) VisitRoot(target int)        { t.call("visit", AvInt(target)) }
func (t *GraphTracer) Leave(target, source int)    { t.call("leave", AvInt(target), AvInt(source)) }
func (t *GraphTracer) LeaveRoot(target int)        { t.call("leave", AvInt(target)) }
func (t *GraphTracer) LayoutTree(root int, sorted bool) {
	t.call("layoutTree", AvInt(root), AvBool(sorted))
}
func (t *GraphTracer) Log(l *LogTracer) { t.call("log", AvStr(l.Key)) }

// avKeyed cho phép layout nhận mọi loại tracer.
type avKeyed interface{ key() string }

func (n *avNode) key() string { return n.Key }

type avLayout struct{ avNode }

func avNewLayout(className string, children []avKeyed) *avLayout {
	parts := make([]string, len(children))
	for i, c := range children {
		parts[i] = avEscape(c.key())
	}
	node := avNode{Key: avNewKey()}
	avRecord(node.Key, className, []AvValue{{"[" + strings.Join(parts, ",") + "]"}})
	return &avLayout{node}
}

func NewVerticalLayout(children ...avKeyed) *avLayout {
	return avNewLayout("VerticalLayout", children)
}
func NewHorizontalLayout(children ...avKeyed) *avLayout {
	return avNewLayout("HorizontalLayout", children)
}

// LayoutSetRoot đặt đối tượng gốc của khung hiển thị.
func LayoutSetRoot(node avKeyed) { avRecord("", "setRoot", []AvValue{AvStr(node.key())}) }

// Delay cắt một khung hình tại đúng dòng đang gọi.
//
// Go không có macro nên phải lấy số dòng từ ngăn xếp lúc chạy. Tracer nằm cùng
// package nhưng khác file, nên `runtime.Caller(1)` trả về đúng dòng trong file người dùng.
func Delay() {
	_, _, line, ok := runtime.Caller(1)
	if !ok {
		line = 0
	}
	avRecord("", "delay", []AvValue{AvInt(line)})
}

// DelayAt dùng khi muốn chỉ định số dòng tường minh.
func DelayAt(line int) { avRecord("", "delay", []AvValue{AvInt(line)}) }
