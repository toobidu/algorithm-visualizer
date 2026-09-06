/**
 * Thuật toán đối chứng cho bộ tuân thủ — PLAN.md Task 4.1.
 *
 * Cùng một thuật toán, viết ở mỗi ngôn ngữ, phải sinh ra command list GIỐNG HỆT nhau.
 * Bản JavaScript là bản vàng vì nó chạy được cả trong trình duyệt lẫn trên Node.
 *
 * Cố ý dùng số nguyên nhỏ và không dùng số thực: khác biệt về định dạng số thực là
 * một trục kiểm thử riêng (§3.5 quy tắc 2), không trộn vào đây.
 */
export const JAVASCRIPT = `
const tracer = new Array1DTracer('Mang');
const logger = new LogTracer('Log');
Layout.setRoot(new VerticalLayout([tracer, logger]));

const array = [5, 2, 9, 1, 7];
tracer.set(array);
Tracer.delay(1);

for (let i = 0; i < array.length - 1; i++) {
  for (let j = 0; j < array.length - 1 - i; j++) {
    tracer.select(j, j + 1);
    Tracer.delay(2);
    if (array[j] > array[j + 1]) {
      const temp = array[j];
      array[j] = array[j + 1];
      array[j + 1] = temp;
      tracer.patch(j, array[j]);
      tracer.patch(j + 1, array[j + 1]);
      logger.println('swap ' + j);
      Tracer.delay(3);
      tracer.depatch(j);
      tracer.depatch(j + 1);
    }
    tracer.deselect(j, j + 1);
  }
}
Tracer.delay(4);
`.trim();

export const PYTHON = `
from algorithm_visualizer import Array1DTracer, LogTracer, Layout, VerticalLayout, Tracer

tracer = Array1DTracer('Mang')
logger = LogTracer('Log')
Layout.setRoot(VerticalLayout([tracer, logger]))

array = [5, 2, 9, 1, 7]
tracer.set(array)
Tracer.delay(1)

for i in range(len(array) - 1):
    for j in range(len(array) - 1 - i):
        tracer.select(j, j + 1)
        Tracer.delay(2)
        if array[j] > array[j + 1]:
            array[j], array[j + 1] = array[j + 1], array[j]
            tracer.patch(j, array[j])
            tracer.patch(j + 1, array[j + 1])
            logger.println('swap ' + str(j))
            Tracer.delay(3)
            tracer.depatch(j)
            tracer.depatch(j + 1)
        tracer.deselect(j, j + 1)

Tracer.delay(4)
`.trim();

export const CPP = `
#include "algorithm-visualizer.h"
#include <vector>
#include <string>

int main() {
  Array1DTracer tracer("Mang");
  LogTracer logger("Log");
  Layout::setRoot(VerticalLayout({&tracer, &logger}));

  std::vector<int> array{5, 2, 9, 1, 7};
  tracer.set(array);
  Tracer::delay(1);

  for (int i = 0; i < (int)array.size() - 1; i++) {
    for (int j = 0; j < (int)array.size() - 1 - i; j++) {
      tracer.select(j, j + 1);
      Tracer::delay(2);
      if (array[j] > array[j + 1]) {
        std::swap(array[j], array[j + 1]);
        tracer.patch(j, array[j]);
        tracer.patch(j + 1, array[j + 1]);
        logger.println("swap " + std::to_string(j));
        Tracer::delay(3);
        tracer.depatch(j);
        tracer.depatch(j + 1);
      }
      tracer.deselect(j, j + 1);
    }
  }
  Tracer::delay(4);
  return 0;
}
`.trim();

export const GO = `
package main

func main() {
	tracer := NewArray1DTracer("Mang")
	logger := NewLogTracer("Log")
	LayoutSetRoot(NewVerticalLayout(tracer, logger))

	array := []int{5, 2, 9, 1, 7}
	tracer.Set(array)
	DelayAt(1)

	for i := 0; i+1 < len(array); i++ {
		for j := 0; j+1 < len(array)-i; j++ {
			tracer.Select(j, j+1)
			DelayAt(2)
			if array[j] > array[j+1] {
				array[j], array[j+1] = array[j+1], array[j]
				tracer.Patch(j, array[j])
				tracer.Patch(j+1, array[j+1])
				logger.Println("swap " + itoa(j))
				DelayAt(3)
				tracer.Depatch(j)
				tracer.Depatch(j + 1)
			}
			tracer.Deselect(j, j+1)
		}
	}
	DelayAt(4)
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	digits := ""
	for n > 0 {
		digits = string(rune('0'+n%10)) + digits
		n /= 10
	}
	return digits
}
`.trim();

export const RUBY = `
require_relative 'algorithm_visualizer'

tracer = Array1DTracer.new('Mang')
logger = LogTracer.new('Log')
Layout.setRoot(VerticalLayout.new([tracer, logger]))

array = [5, 2, 9, 1, 7]
tracer.set(array)
Tracer.delay(1)

(0...array.length - 1).each do |i|
  (0...array.length - 1 - i).each do |j|
    tracer.select(j, j + 1)
    Tracer.delay(2)
    if array[j] > array[j + 1]
      array[j], array[j + 1] = array[j + 1], array[j]
      tracer.patch(j, array[j])
      tracer.patch(j + 1, array[j + 1])
      logger.println('swap ' + j.to_s)
      Tracer.delay(3)
      tracer.depatch(j)
      tracer.depatch(j + 1)
    end
    tracer.deselect(j, j + 1)
  end
end
Tracer.delay(4)
`.trim();

export const PHP = `
<?php
require_once 'AlgorithmVisualizer.php';

$tracer = new Array1DTracer('Mang');
$logger = new LogTracer('Log');
Layout::setRoot(new VerticalLayout([$tracer, $logger]));

$array = [5, 2, 9, 1, 7];
$tracer->set($array);
Tracer::delay(1);

for ($i = 0; $i < count($array) - 1; $i++) {
    for ($j = 0; $j < count($array) - 1 - $i; $j++) {
        $tracer->select($j, $j + 1);
        Tracer::delay(2);
        if ($array[$j] > $array[$j + 1]) {
            $tmp = $array[$j];
            $array[$j] = $array[$j + 1];
            $array[$j + 1] = $tmp;
            $tracer->patch($j, $array[$j]);
            $tracer->patch($j + 1, $array[$j + 1]);
            $logger->println('swap ' . $j);
            Tracer::delay(3);
            $tracer->depatch($j);
            $tracer->depatch($j + 1);
        }
        $tracer->deselect($j, $j + 1);
    }
}
Tracer::delay(4);
`.trim();

export const JAVA = `
public class Main {
    public static void main(String[] args) {
        Array1DTracer tracer = new Array1DTracer("Mang");
        LogTracer logger = new LogTracer("Log");
        Layout.setRoot(new VerticalLayout(tracer, logger));

        int[] array = {5, 2, 9, 1, 7};
        tracer.set(array);
        Tracer.delay(1);

        for (int i = 0; i < array.length - 1; i++) {
            for (int j = 0; j < array.length - 1 - i; j++) {
                tracer.select(j, j + 1);
                Tracer.delay(2);
                if (array[j] > array[j + 1]) {
                    int temp = array[j];
                    array[j] = array[j + 1];
                    array[j + 1] = temp;
                    tracer.patch(j, array[j]);
                    tracer.patch(j + 1, array[j + 1]);
                    logger.println("swap " + j);
                    Tracer.delay(3);
                    tracer.depatch(j);
                    tracer.depatch(j + 1);
                }
                tracer.deselect(j, j + 1);
            }
        }
        Tracer.delay(4);
    }
}
`.trim();
