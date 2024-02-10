#include <pthread.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>

#define MIN_NUM -10.0
#define MAX_NUM 10.0

void mat_fill_rand(float *m, int size) {
  for (int i = 0; i < size * size; i++)
    m[i] = MIN_NUM + rand() / (RAND_MAX / (MAX_NUM - MIN_NUM));
}

void mat_print(float *m, int size) {
  for (int i = 0; i < size; i++) {
    printf("| ");
    for (int j = 0; j < size; j++)
      printf("\x1b[33m%7.2f\x1b[0m ", m[i * size + j]);
    printf("|\n");
  }
}

// All matrices are squared

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

typedef struct {
  float *a;
  float *b;
  float *c;
  int size;
  int from;
  int to;
} CalcThreadParams;

void *calc_rows_thread(void *arg) {
  CalcThreadParams *p = arg;
  for (int i = p->from; i < p->to; i++)
    for (int j = 0; j < p->size; j++) {
      p->c[i * p->size + j] = calc_el(p->a, p->b, p->size, i, j);
    }
  return NULL;
}

void mat_mul_threaded(float *a, float *b, float *c, int size) {
  long num_cores = sysconf(_SC_NPROCESSORS_ONLN);
  printf("Cores: %ld\n", num_cores);
  int chunk_size = size / num_cores;
  int remainder = size % num_cores;
  pthread_t threads[num_cores];
  CalcThreadParams params[num_cores];
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

int main(int argc, char *argv[]) {
  // Default args
  bool is_threaded = false;
  bool is_logged = false;
  int size = 1000;

  // Parse args
  for (int i = 1; i < argc; i++) {
    if (strcmp(argv[i], "threaded") == 0)
      is_threaded = true;
    if (strcmp(argv[i], "logged") == 0)
      is_logged = true;
    if (strncmp(argv[i], "size=", 5) == 0) {
      char *rest = argv[i] + 5;
      int new_size = atoi(rest);
      if (new_size != 0)
        size = new_size;
    }
  }

  // Allocate memory on the heap
  float *a = malloc(sizeof(float) * size * size);
  float *b = malloc(sizeof(float) * size * size);
  float *c = malloc(sizeof(float) * size * size);

  // Print size
  printf("Size: %d\n", size);

  // Fill matrices
  srand(time(NULL));
  rand();
  mat_fill_rand(a, size);
  mat_fill_rand(b, size);

  // Proccess
  if (is_threaded)
    mat_mul_threaded(a, b, c, size);
  else
    mat_mul(a, b, c, size);

  // Log results
  if (is_logged) {
    printf("\nResults:\n");
    printf("A = \n\n");
    mat_print(a, size);
    printf("\n");
    printf("B = \n\n");
    mat_print(b, size);
    printf("\n");
    printf("C = A * B = \n\n");
    mat_print(c, size);
  }

  // Cleanup memory
  free(c);
  free(b);
  free(a);

  return 0;
}
