/**
 * Mô tả hình học để ve — PLAN.md Task 1.3.
 *
 * Renderer trả về du lieu thuần chu KHONG trả về JSX: `viz-core` không được phụ thuộc React
 * (ngầm #14). Nhỏ vậy snapshot test chạy được trên Node ma không cần trình duyệt, và sau này
 * doi sang Canvas hay WebGL không phải viết lại lop này.
 *
 * Mau được gọi bang TEN NGU NGHIA chu không phải ma mau, để hai theme dùng chung một mô tả.
 */
export type SceneTone = 'default' | 'selected' | 'patched' | 'visited' | 'index' | 'muted';

export interface SceneCell {
  readonly text: string;
  readonly tone: SceneTone;
}

/** Bang o cho Array1D va Array2D. Hang tieu de chi so duoc dung san o day. */
export interface GridScene {
  readonly kind: 'grid';
  readonly title: string;
  /** Array1D khong hien cot chi so ben trai — khac biet duy nhat so voi Array2D */
  readonly showRowIndex: boolean;
  readonly columnHeader: readonly SceneCell[];
  readonly rows: readonly {
    readonly header: SceneCell | undefined;
    readonly cells: readonly SceneCell[];
  }[];
}

export interface BarScene {
  readonly kind: 'bars';
  readonly title: string;
  readonly bars: readonly {
    readonly value: number;
    readonly label: string;
    readonly tone: SceneTone;
  }[];
}

export interface ScatterScene {
  readonly kind: 'scatter';
  readonly title: string;
  readonly series: readonly {
    readonly points: readonly { readonly x: number; readonly y: number }[];
    readonly radius: number;
  }[];
}

export interface GraphScene {
  readonly kind: 'graph';
  readonly title: string;
  readonly viewBox: readonly [number, number, number, number];
  readonly isDirected: boolean;
  readonly isWeighted: boolean;
  readonly nodeRadius: number;
  readonly edges: readonly {
    readonly from: { readonly x: number; readonly y: number };
    readonly to: { readonly x: number; readonly y: number };
    readonly label:
      | { readonly x: number; readonly y: number; readonly text: string; readonly angle: number }
      | undefined;
    readonly tone: SceneTone;
  }[];
  readonly nodes: readonly {
    readonly x: number;
    readonly y: number;
    readonly text: string;
    readonly weight: { readonly text: string; readonly dx: number } | undefined;
    readonly tone: SceneTone;
  }[];
}

export interface TextScene {
  readonly kind: 'log' | 'markdown';
  readonly title: string;
  readonly text: string;
}

export interface SplitScene {
  readonly kind: 'split';
  readonly direction: 'horizontal' | 'vertical';
  readonly weights: readonly number[];
  readonly children: readonly Scene[];
}

export interface EmptyScene {
  readonly kind: 'empty';
  readonly reason: string;
}

export type Scene =
  GridScene | BarScene | ScatterScene | GraphScene | TextScene | SplitScene | EmptyScene;
