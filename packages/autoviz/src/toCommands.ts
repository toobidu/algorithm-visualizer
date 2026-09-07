import { type Command, type JsonValue } from '@av/protocol';
import { inferRoles, parseHints, type Role, type Step } from './steps';

/** Trần số khung hình, tránh trace nghìn bước làm treo giao diện. */
const MAX_FRAMES = 5000;

interface Panel {
  readonly key: string;
  readonly name: string;
  readonly role: Extract<Role, 'array' | 'grid'>;
}

/**
 * Dựng command list từ chuỗi bước thực thi.
 *
 * Đây là chỗ "chế độ dán code thuần" trở thành animation: người dùng không gọi tracer nào,
 * hệ thống nhìn biến thay đổi qua từng dòng rồi tự suy ra cần vẽ gì.
 *
 * Ngôn ngữ nào cũng dùng chung hàm này, nên hành vi giống hệt nhau — không có chuyện
 * Python vẽ một kiểu còn Java vẽ kiểu khác.
 */
export function stepsToCommands(steps: readonly Step[], source: string): readonly Command[] {
  const roles = inferRoles(steps, parseHints(source));
  const commands: Command[] = [];

  const panels: Panel[] = [];
  let index = 0;
  for (const [name, role] of roles) {
    if (role !== 'array' && role !== 'grid') continue;
    const key = `av${String(index)}`;
    index += 1;
    panels.push({ key, name, role });
    commands.push({
      key,
      method: role === 'grid' ? 'Array2DTracer' : 'Array1DTracer',
      args: [name],
    });
  }

  const logKey = `av${String(index)}`;
  commands.push({ key: logKey, method: 'LogTracer', args: ['Biến'] });

  const layoutKey = `av${String(index + 1)}`;
  commands.push({
    key: layoutKey,
    method: 'VerticalLayout',
    args: [[...panels.map((panel) => panel.key), logKey]],
  });
  commands.push({ key: null, method: 'setRoot', args: [layoutKey] });

  // Con trỏ đã tô ở khung trước, để bỏ tô trước khi vẽ khung mới
  let highlighted: { panel: Panel; at: number }[] = [];
  let frames = 0;

  for (const step of steps) {
    if (frames >= MAX_FRAMES) break;

    for (const { panel, at } of highlighted) {
      commands.push(deselect(panel, at));
    }
    highlighted = [];

    for (const panel of panels) {
      const value = step.vars[panel.name];
      if (value === undefined) continue;
      commands.push({ key: panel.key, method: 'set', args: [value] });
    }

    const pointers: string[] = [];
    for (const [name, role] of roles) {
      const value = step.vars[name];
      if (value === undefined) continue;

      if (role === 'pointer' && typeof value === 'number') {
        pointers.push(`${name}=${String(value)}`);
        const panel = panelHolding(panels, step, value);
        if (panel !== undefined) {
          commands.push(select(panel, value));
          highlighted.push({ panel, at: value });
        }
      } else if (role === 'value') {
        pointers.push(`${name}=${describe(value)}`);
      }
    }

    if (pointers.length > 0) {
      commands.push({ key: logKey, method: 'set', args: [pointers.join('   ')] });
    }
    commands.push({ key: null, method: 'delay', args: [step.line] });
    frames += 1;
  }

  return commands;
}

/** Con trỏ tô lên mảng đầu tiên mà chỉ số còn nằm trong phạm vi. */
function panelHolding(panels: readonly Panel[], step: Step, at: number): Panel | undefined {
  return panels.find((panel) => {
    if (panel.role !== 'array') return false;
    const value = step.vars[panel.name];
    return Array.isArray(value) && at >= 0 && at < value.length;
  });
}

function select(panel: Panel, at: number): Command {
  return { key: panel.key, method: 'select', args: [at] };
}

function deselect(panel: Panel, at: number): Command {
  return { key: panel.key, method: 'deselect', args: [at] };
}

function describe(value: JsonValue): string {
  if (typeof value === 'string') return value;
  if (value === null) return 'null';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
