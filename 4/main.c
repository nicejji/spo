#include <pthread.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// All matrices are squared
#define SIZE 1500
#define MIN_NUM -10.0
#define MAX_NUM 10.0

void mat_fill_rand(float *m, int size) {
  for (int i = 0; i < size * size; i++)
    m[i] =
        MIN_NUM + (float)rand() / (float)(RAND_MAX / (int)(MAX_NUM - MIN_NUM));
}

void mat_print(float *m, int size) {
  for (int i = 0; i < size; i++) {
    printf("| ");
    for (int j = 0; j < size; j++)
      printf("\x1b[33m%7.2f\x1b[0m ", m[i * size + j]);
    printf("|\n");
  }
}

// SINGLE THREAD
//
float calc_el(float *a, float *b, int size, int i, int j) {
  float sum = 0.0;
  for (int k = 0; k < size; k++) {
    sum += a[i * size + k] * b[k * size + j];
  }
  return sum;
}

void mat_mul(float *a, float *b, float *c, int size) {
  for (int i = 0; i < size; i++)
    for (int j = 0; j < size; j++)
      c[i * size + j] = calc_el(a, b, size, i, j);
}

// MUTLI THREAD
//
struct CalcThreadParams {
  float *a;
  float *b;
  float *c;
  int size;
  int from;
  int to;
};

void *calc_rows_thread(void *arg) {
  struct CalcThreadParams *p = arg;
  for (int i = p->from; i < p->to; i++)
    for (int j = 0; j < p->size; j++) {
      p->c[i * p->size + j] = calc_el(p->a, p->b, p->size, i, j);
    }
  return NULL;
};

void mat_mul_threaded(float *a, float *b, float *c, int size) {
  int num_cores = 8;
  int chunk_size = size / num_cores;
  int remainder = size % num_cores;
  pthread_t threads[num_cores];
  struct CalcThreadParams params[num_cores];
  for (int i = 0; i < num_cores; i++) {
    params[i].a = a;
    params[i].b = b;
    params[i].c = c;
    params[i].size = size;
    params[i].from = chunk_size * i;
    params[i].to =
        params[i].from + chunk_size + (i == num_cores - 1 ? remainder : 0);
  }
  for (int i = 0; i < num_cores; i++)
    pthread_create(&threads[i], NULL, calc_rows_thread, &params[i]);

  for (int i = 0; i < num_cores; i++)
    pthread_join(threads[i], NULL);
}

// Allocate static memory (arrays can be too big for stack)
static float a[SIZE * SIZE];
static float b[SIZE * SIZE];
static float c[SIZE * SIZE];

int main(int argc, char *argv[]) {
  bool is_threaded = argc > 1 && strcmp(argv[1], "threaded") == 0;

  printf("%d %s\n", SIZE, is_threaded ? "THREADED" : "SINGLE");

  // Fill matrices
  // srand(time(0));
  mat_fill_rand(a, SIZE);
  mat_fill_rand(b, SIZE);

  // Proccess
  if (is_threaded)
    mat_mul_threaded(a, b, c, SIZE);
  else
    mat_mul(a, b, c, SIZE);

  // Log results
  // printf("A = \n\n");
  // mat_print(a, SIZE);
  // printf("\n");
  // printf("B = \n\n");
  // mat_print(b, SIZE);
  // printf("\n");
  // printf("C = A * B = \n\n");
  // mat_print(c, SIZE);

  return 0;
}
