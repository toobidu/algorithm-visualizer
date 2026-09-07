/**
 * Ba thuật toán JavaScript CÓ gọi tracer, dùng làm dữ liệu cho `pipeline.test.ts`.
 *
 * Trước đây test lấy chúng từ bài mẫu của ứng dụng. Ứng dụng không còn bài mẫu nữa,
 * nên fixture về nằm cạnh chính test — đúng chỗ của nó.
 */

export const bubbleSort = `// nạp thư viện trực quan hóa {
// (đã có sẵn trong môi trường chạy)
// }

// khai báo tracer {
const tracer = new Array1DTracer('Mảng');
const chart = new ChartTracer('Biểu đồ');
const logger = new LogTracer('Nhật ký');
Layout.setRoot(new VerticalLayout([tracer, chart, logger]));
tracer.chart(chart);
// }

const array = [5, 2, 9, 1, 7, 3, 8, 4];

// trực quan hóa {
tracer.set(array);
Tracer.delay();
// }

for (let i = 0; i < array.length - 1; i++) {
  for (let j = 0; j < array.length - 1 - i; j++) {
    // trực quan hóa {
    tracer.select(j, j + 1);
    Tracer.delay();
    // }
    if (array[j] > array[j + 1]) {
      const temp = array[j];
      array[j] = array[j + 1];
      array[j + 1] = temp;
      // trực quan hóa {
      tracer.patch(j, array[j]);
      tracer.patch(j + 1, array[j + 1]);
      logger.println('đổi chỗ ' + j + ' với ' + (j + 1));
      Tracer.delay();
      tracer.depatch(j);
      tracer.depatch(j + 1);
      // }
    }
    // trực quan hóa {
    tracer.deselect(j, j + 1);
    // }
  }
}

// trực quan hóa {
logger.println('xong');
Tracer.delay();
// }
`;

const binarySearch = `// khai báo tracer {
const tracer = new Array1DTracer('Mảng đã sắp xếp');
const logger = new LogTracer('Nhật ký');
Layout.setRoot(new VerticalLayout([tracer, logger]));
// }

const array = [1, 3, 5, 7, 9, 11, 13, 15, 17];
const target = 13;

// trực quan hóa {
tracer.set(array);
logger.println('tìm ' + target);
Tracer.delay();
// }

let low = 0;
let high = array.length - 1;

while (low <= high) {
  const mid = Math.floor((low + high) / 2);
  // trực quan hóa {
  tracer.select(low, high);
  tracer.patch(mid, array[mid]);
  logger.println('xét giữa tại ' + mid + ' = ' + array[mid]);
  Tracer.delay();
  tracer.depatch(mid);
  tracer.deselect(low, high);
  // }

  if (array[mid] === target) {
    // trực quan hóa {
    tracer.select(mid);
    logger.println('tìm thấy tại ' + mid);
    Tracer.delay();
    // }
    break;
  }
  if (array[mid] < target) low = mid + 1;
  else high = mid - 1;
}
`;

const graphDfs = `// khai báo tracer {
const graph = new GraphTracer('Đồ thị');
const logger = new LogTracer('Đường đi');
Layout.setRoot(new VerticalLayout([graph, logger]));
graph.log(logger);
graph.directed(false);
// }

const matrix = [
  [0, 1, 1, 0, 0],
  [1, 0, 0, 1, 1],
  [1, 0, 0, 0, 1],
  [0, 1, 0, 0, 0],
  [0, 1, 1, 0, 0],
];

// trực quan hóa {
graph.set(matrix);
graph.layoutTree(0, true);
Tracer.delay();
// }

const visited = [];

function dfs(node, parent) {
  visited[node] = true;
  // trực quan hóa {
  graph.visit(node, parent);
  Tracer.delay();
  // }
  for (let next = 0; next < matrix.length; next++) {
    if (matrix[node][next] && !visited[next]) {
      dfs(next, node);
      // trực quan hóa {
      graph.visit(node, next);
      Tracer.delay();
      // }
    }
  }
}

dfs(0, null);
`;

export const TRACER_PROGRAMS: readonly (readonly [string, string])[] = [
  ['bubble sort', bubbleSort],
  ['binary search', binarySearch],
  ['graph dfs', graphDfs],
];
