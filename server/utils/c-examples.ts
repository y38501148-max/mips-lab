// Display-only examples. The judge accepts MIPS submissions.
const program = (body: string) => `#include <stdio.h>\n\nint main() {\n${body}\n    return 0;\n}\n`
export const cExamples: Record<string, string> = {
 M001: program(String.raw`    int a, b;
    scanf("%d%d", &a, &b);
    printf("%d\n", a + b);`),
 M002: program(String.raw`    int n, sum = 0;
    scanf("%d", &n);
    for (int i = 1; i <= n; i++) {
        sum += i;
    }
    printf("%d\n", sum);`),
 M003: program(String.raw`    int a, b;
    scanf("%d%d", &a, &b);
    while (b != 0) {
        int r = a % b;
        a = b;
        b = r;
    }
    printf("%d\n", a);`),
 M004: program(String.raw`    int n, a[100];
    scanf("%d", &n);
    for (int i = 0; i < n; i++) {
        scanf("%d", &a[i]);
    }
    int pos = 0;
    for (int i = 1; i < n; i++) {
        if (a[i] > a[pos]) {
            pos = i;
        }
    }
    printf("%d %d\n", a[pos], pos);`),
 M005: program(String.raw`    int n, a[100];
    scanf("%d", &n);
    for (int i = 0; i < n; i++) {
        scanf("%d", &a[i]);
    }
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - 1 - i; j++) {
            if (a[j] > a[j + 1]) {
                int t = a[j];
                a[j] = a[j + 1];
                a[j + 1] = t;
            }
        }
    }
    for (int i = 0; i < n; i++) {
        printf("%d%c", a[i], i == n - 1 ? '\n' : ' ');
    }`),
 M006: program(String.raw`    char s[101];
    scanf("%100s", s);
    int n = 0, ok = 1;
    while (s[n] != '\0') {
        n++;
    }
    for (int i = 0; i < n / 2; i++) {
        if (s[i] != s[n - 1 - i]) {
            ok = 0;
        }
    }
    printf("%d\n", ok);`),
 M007: program(String.raw`    int n, m, a[8][8];
    scanf("%d%d", &n, &m);
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < m; j++) {
            scanf("%d", &a[i][j]);
        }
    }
    for (int j = 0; j < m; j++) {
        for (int i = 0; i < n; i++) {
            printf("%d%c", a[i][j], i == n - 1 ? '\n' : ' ');
        }
    }`),
 M008: program(String.raw`    int n, a[6][6], b[6][6];
    scanf("%d", &n);
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            scanf("%d", &a[i][j]);
        }
    }
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            scanf("%d", &b[i][j]);
        }
    }
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            int sum = 0;
            for (int k = 0; k < n; k++) {
                sum += a[i][k] * b[k][j];
            }
            printf("%d%c", sum, j == n - 1 ? '\n' : ' ');
        }
    }`),
 M009: String.raw`#include <stdio.h>

int factorial(int n) {
    if (n == 0) return 1;
    return n * factorial(n - 1);
}

int main() {
    int n;
    scanf("%d", &n);
    printf("%d\n", factorial(n));
    return 0;
}
`,
 M010: String.raw`#include <stdio.h>

int n, a[6], used[7];

void dfs(int pos) {
    if (pos == n) {
        for (int i = 0; i < n; i++) {
            printf("%d%c", a[i], i == n - 1 ? '\n' : ' ');
        }
        return;
    }
    for (int x = 1; x <= n; x++) {
        if (!used[x]) {
            used[x] = 1;
            a[pos] = x;
            dfs(pos + 1);
            used[x] = 0;
        }
    }
}

int main() {
    scanf("%d", &n);
    dfs(0);
    return 0;
}
`,
 M011: program(String.raw`    int n, k, out[100] = {0};
    scanf("%d%d", &n, &k);
    int left = n, pos = 0, count = 0;
    while (left > 1) {
        if (!out[pos]) {
            count++;
            if (count == k) {
                out[pos] = 1;
                left--;
                count = 0;
            }
        }
        pos = (pos + 1) % n;
    }
    for (int i = 0; i < n; i++) {
        if (!out[i]) {
            printf("%d\n", i + 1);
        }
    }`),
 M012: String.raw`#include <stdio.h>

int a[300];

void quicksort(int left, int right) {
    if (left >= right) return;
    int i = left, j = right;
    int pivot = a[(left + right) / 2];
    while (i <= j) {
        while (a[i] < pivot) {
            i++;
        }
        while (a[j] > pivot) {
            j--;
        }
        if (i <= j) {
            int t = a[i];
            a[i] = a[j];
            a[j] = t;
            i++;
            j--;
        }
    }
    quicksort(left, j);
    quicksort(i, right);
}

int main() {
    int n;
    scanf("%d", &n);
    for (int i = 0; i < n; i++) {
        scanf("%d", &a[i]);
    }
    quicksort(0, n - 1);
    for (int i = 0; i < n; i++) {
        printf("%d%c", a[i], i == n - 1 ? '\n' : ' ');
    }
    return 0;
}
`,
 M013: program(String.raw`    int n;
    scanf("%d", &n);
    printf("%d\n", n);`),
 M014: program(String.raw`    int a, b;
    scanf("%d%d", &a, &b);
    printf("%d\n", a * b);`),
 M015: program(String.raw`    int a, b;
    scanf("%d%d", &a, &b);
    printf("%d %d\n", a / b, a % b);`),
 M016: program(String.raw`    int n;
    scanf("%d", &n);
    printf("%d\n", n % 2);`),
 M017: program(String.raw`    int a, b;
    scanf("%d%d", &a, &b);
    if (a > b) {
        printf("%d\n", a);
    } else {
        printf("%d\n", b);
    }`),
 M018: program(String.raw`    int n;
    scanf("%d", &n);
    if (n < 0) {
        n = -n;
    }
    printf("%d\n", n);`),
 M019: program(String.raw`    int n, a[100], sum = 0;
    scanf("%d", &n);
    for (int i = 0; i < n; i++) {
        scanf("%d", &a[i]);
    }
    for (int i = 0; i < n; i++) {
        sum += a[i];
    }
    printf("%d\n", sum);`),
 M020: program(String.raw`    int n, a[100], count = 0;
    scanf("%d", &n);
    for (int i = 0; i < n; i++) {
        scanf("%d", &a[i]);
    }
    for (int i = 0; i < n; i++) {
        if (a[i] > 0) {
            count++;
        }
    }
    printf("%d\n", count);`),
 P1001: program(String.raw`    int a, b;
    scanf("%d%d", &a, &b);
    printf("%d\n", a + b);`),
 P1425: program(String.raw`    int a, b, c, d;
    scanf("%d%d%d%d", &a, &b, &c, &d);
    int minutes = (c * 60 + d) - (a * 60 + b);
    printf("%d %d\n", minutes / 60, minutes % 60);`),
 P5703: program(String.raw`    int a, b;
    scanf("%d%d", &a, &b);
    printf("%d\n", a * b);`),
 P5704: program(String.raw`    char ch;
    scanf(" %c", &ch);
    printf("%c\n", ch - 'a' + 'A');`),
}
