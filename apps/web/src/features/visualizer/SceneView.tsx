import { diffBars, diffGrid, findComparison } from '@av/viz-core';
import type { GraphScene, GridScene, Scene, SceneEvent, SceneTone } from '@av/viz-core';
import { useEffect, useRef, useState } from 'react';
import { ResizableSplit } from '../workspace/ResizableSplit';
import { playEvents, type MotionLevel } from './animate';
import { Claw, type ClawTarget } from './Claw';
import styles from './SceneView.module.scss';

interface MotionProps {
  readonly motion: MotionLevel;
  /** Trần thời lượng hoạt cảnh, theo nhịp phát hiện tại */
  readonly budgetMs: number;
}

const toneClass: Record<SceneTone, string | undefined> = {
  default: undefined,
  selected: styles['selected'],
  patched: styles['patched'],
  visited: styles['visited'],
  index: styles['index'],
  muted: styles['muted'],
};

function cx(...parts: (string | undefined)[]): string {
  return parts.filter((part) => part !== undefined).join(' ');
}

function Grid({ scene, motion, budgetMs }: { scene: GridScene } & MotionProps): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null);
  const claw = useSceneMotion(hostRef, scene, motion, budgetMs, diffGrid);
  const comparison = motion === 'off' ? undefined : findComparison(scene);

  return (
    <Panel title={scene.title}>
      <div className={styles['scroll']} ref={hostRef}>
        <table className={styles['grid']}>
          <tbody>
            <tr>
              {scene.showRowIndex ? <td className={styles['index']} /> : null}
              {scene.columnHeader.map((cell, i) => (
                <td key={i} className={styles['index']}>
                  {cell.text}
                </td>
              ))}
            </tr>
            {scene.rows.map((row, i) => (
              <tr key={i}>
                {row.header ? <td className={styles['index']}>{row.header.text}</td> : null}
                {row.cells.map((cell, j) => (
                  <td
                    key={j}
                    data-r={i}
                    data-c={j}
                    className={cx(styles['cell'], toneClass[cell.tone])}
                  >
                    {cell.text}
                    {comparison?.row === i && comparison.left === j ? (
                      <span className={styles['compare']} aria-hidden="true">
                        {comparison.relation}
                      </span>
                    ) : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <Claw target={claw} />
      </div>
    </Panel>
  );
}

/**
 * Chạy hoạt cảnh cho một panel, và trả về mục tiêu cho cánh tay gắp nếu có.
 *
 * Giữ cảnh trước trong ref của CHÍNH component này chứ không chuyển từ trên xuống: React
 * giữ định danh component theo vị trí trong cây, nên mỗi panel tự nhớ cảnh của mình là đúng và
 * không phải luồn đường dẫn panel qua cả cây cảnh.
 */
function useSceneMotion<T>(
  hostRef: React.RefObject<HTMLDivElement | null>,
  scene: T,
  motion: MotionLevel,
  budgetMs: number,
  diff: (before: T | undefined, after: T) => readonly SceneEvent[],
): ClawTarget | undefined {
  const previousRef = useRef<T | undefined>(undefined);
  const seqRef = useRef(0);
  const [claw, setClaw] = useState<ClawTarget | undefined>(undefined);

  useEffect(() => {
    const host = hostRef.current;
    const previous = previousRef.current;
    previousRef.current = scene;
    if (host === null || motion === 'off') return;

    const events = diff(previous, scene);
    if (events.length === 0) return;

    playEvents(host, events, motion, budgetMs);

    const swap = motion === 'claw' ? events.find((event) => event.kind === 'swap') : undefined;
    if (swap === undefined) return;

    const first = host.querySelector<HTMLElement>(
      `[data-r="${String(swap.row)}"][data-c="${String(swap.a)}"]`,
    );
    const second = host.querySelector<HTMLElement>(
      `[data-r="${String(swap.row)}"][data-c="${String(swap.b)}"]`,
    );
    if (first === null || second === null) return;

    const base = host.getBoundingClientRect();
    const left = first.getBoundingClientRect();
    const right = second.getBoundingClientRect();
    seqRef.current += 1;
    setClaw({
      leftX: left.left + left.width / 2 - base.left,
      rightX: right.left + right.width / 2 - base.left,
      topY: left.top - base.top,
      cellWidth: left.width,
      cellHeight: left.height,
      durationMs: Math.min(700, Math.max(200, budgetMs)),
      seq: seqRef.current,
    });
  }, [budgetMs, diff, hostRef, motion, scene]);

  return claw;
}

function Graph({ scene }: { scene: GraphScene }): React.JSX.Element {
  const [x, y, w, h] = scene.viewBox;
  return (
    <Panel title={scene.title}>
      <svg
        className={styles['graph']}
        viewBox={`${String(x)} ${String(y)} ${String(w)} ${String(h)}`}
      >
        <defs>
          <marker id="av-arrow" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
            <path d="M0,0 L0,4 L4,2 L0,0" className={styles['arrowHead']} />
          </marker>
        </defs>
        {scene.edges.map((edge, i) => (
          <g key={i} className={cx(styles['edge'], toneClass[edge.tone])}>
            <path
              d={`M${String(edge.from.x)},${String(edge.from.y)} L${String(edge.to.x)},${String(edge.to.y)}`}
              markerEnd={scene.isDirected ? 'url(#av-arrow)' : undefined}
            />
            {edge.label ? (
              <text x={edge.label.x} y={edge.label.y} className={styles['edgeLabel']}>
                {edge.label.text}
              </text>
            ) : null}
          </g>
        ))}
        {scene.nodes.map((node, i) => (
          <g
            key={i}
            className={cx(styles['node'], toneClass[node.tone])}
            transform={`translate(${String(node.x)},${String(node.y)})`}
          >
            <circle r={scene.nodeRadius} />
            <text className={styles['nodeLabel']}>{node.text}</text>
            {node.weight ? (
              <text className={styles['nodeWeight']} x={node.weight.dx}>
                {node.weight.text}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
    </Panel>
  );
}

function Bars({
  scene,
  motion,
  budgetMs,
}: { scene: Extract<Scene, { kind: 'bars' }> } & MotionProps): React.JSX.Element {
  const max = Math.max(1, ...scene.bars.map((bar) => Math.abs(bar.value)));
  const hostRef = useRef<HTMLDivElement>(null);
  useSceneMotion(hostRef, scene, motion, budgetMs, diffBars);

  return (
    <Panel title={scene.title}>
      <div className={styles['bars']} ref={hostRef}>
        {scene.bars.map((bar, i) => (
          <div key={i} className={styles['barSlot']} title={bar.label} data-r={0} data-c={i}>
            <div
              className={cx(styles['bar'], toneClass[bar.tone])}
              style={{ height: `${String((Math.abs(bar.value) / max) * 100)}%` }}
            />
            <span className={styles['barLabel']}>{bar.label}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Scatter({ scene }: { scene: Extract<Scene, { kind: 'scatter' }> }): React.JSX.Element {
  const points = scene.series.flatMap((series) => series.points);
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(0, ...xs);
  const maxX = Math.max(1, ...xs);
  const minY = Math.min(0, ...ys);
  const maxY = Math.max(1, ...ys);

  return (
    <Panel title={scene.title}>
      <svg className={styles['graph']} viewBox={`0 0 100 100`} preserveAspectRatio="none">
        {scene.series.map((series, i) =>
          series.points.map((point, j) => (
            <circle
              key={`${String(i)}-${String(j)}`}
              cx={((point.x - minX) / (maxX - minX)) * 100}
              cy={100 - ((point.y - minY) / (maxY - minY)) * 100}
              r={series.radius / 4}
              className={styles['point']}
            />
          )),
        )}
      </svg>
    </Panel>
  );
}

/**
 * Log và Markdown đều ve bang VAN BAN THUAN — ngầm #47.
 * Bản cũ dùng `dangerouslySetInnerHTML` o đây, tạo lỗ hổng XSS trên trang chia sẻ gist.
 */
function TextPanel({
  scene,
}: {
  scene: Extract<Scene, { kind: 'log' | 'markdown' }>;
}): React.JSX.Element {
  return (
    <Panel title={scene.title}>
      <pre className={styles['text']}>{scene.text}</pre>
    </Panel>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section className={styles['panel']}>
      <h2 className={styles['panelTitle']}>{title}</h2>
      <div className={styles['panelBody']}>{children}</div>
    </section>
  );
}

export function SceneView({
  scene,
  motion,
  budgetMs,
}: { scene: Scene } & MotionProps): React.JSX.Element {
  switch (scene.kind) {
    case 'grid':
      return <Grid scene={scene} motion={motion} budgetMs={budgetMs} />;
    case 'graph':
      return <Graph scene={scene} />;
    case 'bars':
      return <Bars scene={scene} motion={motion} budgetMs={budgetMs} />;
    case 'scatter':
      return <Scatter scene={scene} />;
    case 'log':
    case 'markdown':
      return <TextPanel scene={scene} />;
    case 'split':
      return (
        <ResizableSplit direction={scene.direction} weights={scene.weights}>
          {scene.children.map((child, i) => (
            <SceneView key={i} scene={child} motion={motion} budgetMs={budgetMs} />
          ))}
        </ResizableSplit>
      );
    case 'empty':
      return <div className={styles['empty']}>{scene.reason}</div>;
  }
}
