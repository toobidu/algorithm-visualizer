# Thư viện tracer cho Ruby.
#
# Phải sinh ra command list GIỐNG HỆT bản JavaScript tham chiếu — PLAN.md Phụ lục C.
# Chỉ dùng thư viện chuẩn: sandbox của Piston không có mạng.

module AlgorithmVisualizer
  # Tiền tố tách kênh lệnh khỏi stdout thường — §3.5 quy tắc 1.
  PREFIX = 30.chr + '@AV|'

  # Giới hạn số nguyên an toàn — §3.5 quy tắc 2b. Integer của Ruby không giới hạn,
  # của JavaScript thì có: không chặn ở đây thì hai ngôn ngữ ra command list khác nhau.
  SAFE_INTEGER_LIMIT = 9_007_199_254_740_991

  @next_key = 0

  class << self
    def new_key
      key = "k#{@next_key}"
      @next_key += 1
      key
    end

    def record(key, method, args)
      payload = { 'key' => key, 'method' => method, 'args' => args.map { |a| normalize(a) } }
      $stdout.puts(PREFIX + dump(payload))
    end

    def normalize(value)
      case value
      when Integer
        if value.abs > SAFE_INTEGER_LIMIT
          raise "Gia tri #{value} vuot khoang so nguyen an toan cua giao thuc. " \
                'JavaScript se lam tron gia tri nay.'
        end
        value
      when Float
        # NaN và vô cực không phải JSON hợp lệ — §3.5 quy tắc 3
        return { '$num' => 'NaN' } if value.nan?
        return { '$num' => value.positive? ? 'Infinity' : '-Infinity' } if value.infinite?

        value
      when Array then value.map { |item| normalize(item) }
      when Hash then value.to_h { |k, v| [k.to_s, normalize(v)] }
      else value
      end
    end

    # Tự tuần tự hóa thay vì dùng `json`: bản JSON của Ruby in số thực nguyên là "1.0"
    # còn JavaScript in "1". Khác một ký tự là bộ tuân thủ đỏ.
    def dump(value)
      case value
      when nil then 'null'
      when true, false then value.to_s
      when Integer then value.to_s
      when Float then dump_float(value)
      when String then quote(value)
      when Symbol then quote(value.to_s)
      when Array then '[' + value.map { |item| dump(item) }.join(',') + ']'
      when Hash then '{' + value.map { |k, v| "#{quote(k.to_s)}:#{dump(v)}" }.join(',') + '}'
      else quote(value.to_s)
      end
    end

    def dump_float(value)
      return value.to_i.to_s if value.finite? && value == value.to_i && value.abs < 1e15

      value.to_s
    end

    def quote(text)
      out = +'"'
      text.each_char do |c|
        code = c.ord
        out << case c
               when '"' then 92.chr + '"'
               when 92.chr then 92.chr + 92.chr
               else
                 if code < 32
                   escape_control(code)
                 else
                   c
                 end
               end
      end
      out << '"'
    end

    def escape_control(code)
      case code
      when 10 then 92.chr + 'n'
      when 13 then 92.chr + 'r'
      when 9 then 92.chr + 't'
      else format('%su%04x', 92.chr, code)
      end
    end
  end

  # Gốc chung: mọi tracer chỉ là một khoá cộng danh sách phương thức chuyển tiếp.
  class Node
    attr_reader :key

    def initialize(class_name, args)
      @key = AlgorithmVisualizer.new_key
      AlgorithmVisualizer.record(@key, class_name, args)
    end

    def destroy
      AlgorithmVisualizer.record(@key, 'destroy', [])
    end

    def reset
      AlgorithmVisualizer.record(@key, 'reset', [])
    end

    def self.forward(*names)
      names.each do |name|
        define_method(name) do |*args|
          AlgorithmVisualizer.record(@key, name.to_s, args)
        end
      end
    end
  end

  def self.title_args(title)
    title.nil? ? [] : [title]
  end

  class Array2DTracer < Node
    def initialize(title = nil, class_name = 'Array2DTracer')
      super(class_name, AlgorithmVisualizer.title_args(title))
    end

    forward :set, :patch, :depatch, :select, :selectRow, :selectCol,
            :deselect, :deselectRow, :deselectCol
  end

  class Array1DTracer < Node
    def initialize(title = nil, class_name = 'Array1DTracer')
      super(class_name, AlgorithmVisualizer.title_args(title))
    end

    forward :set, :patch, :depatch, :select, :deselect

    def chart(tracer)
      AlgorithmVisualizer.record(@key, 'chart', [tracer&.key])
    end
  end

  class ChartTracer < Array1DTracer
    def initialize(title = nil)
      super(title, 'ChartTracer')
    end
  end

  class ScatterTracer < Array2DTracer
    def initialize(title = nil)
      super(title, 'ScatterTracer')
    end
  end

  class LogTracer < Node
    def initialize(title = nil)
      super('LogTracer', AlgorithmVisualizer.title_args(title))
    end

    forward :set, :print, :println, :printf
  end

  class MarkdownTracer < Node
    def initialize(title = nil)
      super('MarkdownTracer', AlgorithmVisualizer.title_args(title))
    end

    forward :set
  end

  class GraphTracer < Node
    def initialize(title = nil)
      super('GraphTracer', AlgorithmVisualizer.title_args(title))
    end

    forward :set, :directed, :weighted, :addNode, :updateNode, :removeNode,
            :addEdge, :updateEdge, :removeEdge, :layoutCircle, :layoutTree,
            :layoutRandom, :visit, :leave, :select, :deselect

    def log(tracer)
      AlgorithmVisualizer.record(@key, 'log', [tracer&.key])
    end
  end

  class LayoutNode < Node
    def initialize(class_name, children)
      super(class_name, [children.map(&:key)])
    end

    def add(child, index = nil)
      AlgorithmVisualizer.record(@key, 'add', index.nil? ? [child.key] : [child.key, index])
    end

    def remove(child)
      AlgorithmVisualizer.record(@key, 'remove', [child.key])
    end

    def removeAll
      AlgorithmVisualizer.record(@key, 'removeAll', [])
    end
  end

  class VerticalLayout < LayoutNode
    def initialize(children)
      super('VerticalLayout', children)
    end
  end

  class HorizontalLayout < LayoutNode
    def initialize(children)
      super('HorizontalLayout', children)
    end
  end

  module Layout
    def self.setRoot(node)
      AlgorithmVisualizer.record(nil, 'setRoot', [node.key])
    end
  end

  module Tracer
    # Cắt một khung hình. Không truyền số dòng thì lấy từ ngăn xếp của người gọi —
    # `caller_locations` cho số dòng chính xác nên không phải bù offset như JavaScript.
    def self.delay(line_number = nil)
      line_number ||= caller_locations(1, 1)&.first&.lineno || 0
      AlgorithmVisualizer.record(nil, 'delay', [line_number])
    end
  end
end

include AlgorithmVisualizer
