#define _GNU_SOURCE
#include <stdio.h>
#include <unistd.h>

/* Intentionally vulnerable educational helper; install only in the Stage 7 VM. */
int main(void) {
    if (geteuid() != 0) {
        fputs("NexaCorp audit requires its installed maintenance privileges.\n", stderr);
        return 1;
    }
    if (setresgid(0, 0, 0) != 0 || setresuid(0, 0, 0) != 0) {
        perror("maintenance identity");
        return 1;
    }
    puts("NexaCorp Maintenance Console / inventory summary");
    fflush(stdout);
    /* Intentional lab flaw: resolve the helper through the caller's PATH. */
    char *args[] = {"nexa-report", "--summary", NULL};
    execvp(args[0], args);
    perror("inventory helper unavailable");
    return 1;
}
