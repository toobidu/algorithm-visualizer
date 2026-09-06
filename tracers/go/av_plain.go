// Runtime chế độ tự trực quan hóa cho Go.
//
// Go không có hook lúc chạy nên bộ chèn mã (packages/autoviz) gọi AvStep(...) sau mỗi
// câu lệnh. Nhiệm vụ ở đây chỉ là in ra một dòng JSON cho mỗi bước.
//
// Nằm chung package main với code người dùng — Piston biên dịch mọi file .go gửi lên.

package main

import (
	"fmt"
	"math"
	"os"
	"strconv"
	"strings"
)

var avPlainPrefix = string(rune(0x1e)) + "@AV|"

// Trần số bước: thuật toán nặng có thể sinh hàng triệu bước và làm nghẽn stdout
const avMaxSteps = 20000

var avStepCount int

func avRender(value interface{}) string {
	switch v := value.(type) {
	case nil:
		return "null"
	case int:
		return strconv.Itoa(v)
	case int64:
		return strconv.FormatInt(v, 10)
	case bool:
		return strconv.FormatBool(v)
	case string:
		return avQuote(v)
	case float64:
		if math.IsNaN(v) {
			return `{"$num":"NaN"}`
		}
		if math.IsInf(v, 1) {
			return `{"$num":"Infinity"}`
		}
		if math.IsInf(v, -1) {
			return `{"$num":"-Infinity"}`
		}
		return strconv.FormatFloat(v, 'g', -1, 64)
	case []int:
		parts := make([]string, len(v))
		for i, item := range v {
			parts[i] = strconv.Itoa(item)
		}
		return "[" + strings.Join(parts, ",") + "]"
	case [][]int:
		rows := make([]string, len(v))
		for i, row := range v {
			rows[i] = avRender(row)
		}
		return "[" + strings.Join(rows, ",") + "]"
	case []string:
		parts := make([]string, len(v))
		for i, item := range v {
			parts[i] = avQuote(item)
		}
		return "[" + strings.Join(parts, ",") + "]"
	default:
		// Kiểu khác không mang thông tin hữu ích cho người học
		return "null"
	}
}

// avQuote bọc chuỗi thành JSON.
//
// Mọi ký tự escape dựng từ mã số thay vì viết dấu gạch chéo ngược literal:
// escape trong chuỗi Go đi qua công cụ sinh mã rất dễ sai một lớp mà không ai thấy.
func avQuote(text string) string {
	const bs = rune(92)
	var b strings.Builder
	b.WriteByte('"')
	for _, r := range text {
		switch r {
		case '"':
			b.WriteRune(bs)
			b.WriteRune('"')
		case bs:
			b.WriteRune(bs)
			b.WriteRune(bs)
		case 10:
			b.WriteRune(bs)
			b.WriteRune('n')
		case 13:
			b.WriteRune(bs)
			b.WriteRune('r')
		case 9:
			b.WriteRune(bs)
			b.WriteRune('t')
		default:
			if r < 32 {
				b.WriteRune(bs)
				b.WriteRune('u')
				b.WriteString(avHex4(r))
			} else {
				b.WriteRune(r)
			}
		}
	}
	b.WriteByte('"')
	return b.String()
}

func avHex4(r rune) string {
	const digits = "0123456789abcdef"
	var b strings.Builder
	for shift := 12; shift >= 0; shift -= 4 {
		b.WriteByte(digits[(r>>uint(shift))&0xf])
	}
	return b.String()
}

// AvStep ghi lại một bước thực thi. Bộ chèn mã gọi hàm này sau mỗi câu lệnh.
func AvStep(line int, pairs ...interface{}) {
	if avStepCount >= avMaxSteps {
		return
	}
	avStepCount++

	parts := make([]string, 0, len(pairs)/2)
	for i := 0; i+1 < len(pairs); i += 2 {
		name, ok := pairs[i].(string)
		if !ok {
			continue
		}
		parts = append(parts, avQuote(name)+":"+avRender(pairs[i+1]))
	}
	var out strings.Builder
	out.WriteString(avPlainPrefix)
	out.WriteString("{")
	out.WriteString(avQuote("line"))
	out.WriteString(":")
	out.WriteString(strconv.Itoa(line))
	out.WriteString(",")
	out.WriteString(avQuote("vars"))
	out.WriteString(":{")
	out.WriteString(strings.Join(parts, ","))
	out.WriteString("}}")
	fmt.Fprintln(os.Stdout, out.String())
}
