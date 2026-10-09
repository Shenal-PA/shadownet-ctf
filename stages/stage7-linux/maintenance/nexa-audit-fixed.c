#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

/* Remediation reference. Install without SUID only on the comparison snapshot. */
int main(void) {
    const uid_t caller_uid = getuid();
    const gid_t caller_gid = getgid();
    /* Discard any effective/saved elevated identity before launching a helper. */
    if (setresgid(caller_gid, caller_gid, caller_gid) != 0 ||
        setresuid(caller_uid, caller_uid, caller_uid) != 0) {
        perror("drop privileges");
        return 1;
    }
    if (clearenv() != 0 || setenv("PATH", "/usr/bin:/bin", 1) != 0) {
        perror("prepare environment");
        return 1;
    }
    puts("NexaCorp Maintenance Console / inventory summary");
    fflush(stdout);
    char *args[] = {"nexa-report", "--summary", NULL};
    execv("/usr/local/bin/nexa-report", args);
    perror("inventory helper unavailable");
    return 1;
}
