# Runtime chế độ tự trực quan hóa cho Ruby.
#
# TracePoint là hook sạch nhất trong cả nhóm: nó cho biết mỗi dòng vừa chạy và toàn bộ
# biến cục bộ tại đó, mà không phải sửa một ký tự nào của code người dùng.
#
# Chỉ in ra bước; phần suy ra vẽ gì nằm ở @av/autoviz, dùng chung cho mọi ngôn ngữ.

require 'json'

module AvPlain
  PREFIX = 30.chr + '@AV|'

  # Trần số bước: thuật toán nặng có thể sinh hàng triệu bước và làm nghẽn stdout
  MAX_STEPS = 20_000

  @steps = 0
  @trace = nil

  class << self
    def render(value)
      case value
      when Integer then value.abs <= 9_007_199_254_740_991 ? value : value.to_s
      when Float
        return { '$num' => 'NaN' } if value.nan?
        return { '$num' => value.positive? ? 'Infinity' : '-Infinity' } if value.infinite?
        value
      when String, TrueClass, FalseClass, NilClass then value
      when Array then value.map { |item| render(item) }
      end
    end

    def start
      @trace = TracePoint.new(:line) do |tp|
        next unless tp.path.end_with?('main.rb')
        next if @steps >= MAX_STEPS

        @steps += 1
        binding_at = tp.binding
        vars = {}
        binding_at.local_variables.each do |name|
          next if name.to_s.start_with?('_')

          rendered = render(binding_at.local_variable_get(name))
          vars[name.to_s] = rendered unless rendered.nil?
        end
        $stdout.puts PREFIX + JSON.generate({ 'line' => tp.lineno, 'vars' => vars })
      end
      @trace.enable
    end

    def stop
      @trace&.disable
    end
  end
end
