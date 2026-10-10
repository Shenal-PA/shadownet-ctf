FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install OpenSSH server and basic binary analysis utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssh-server \
    binutils \
    gdb \
    strace \
    ltrace \
    file \
    && rm -rf /var/lib/apt/lists/*

# Configure SSH privilege separation directory and host keys
RUN mkdir -p /var/run/sshd && \
    ssh-keygen -A

# Configure PAM and sshd to permit password login inside container
RUN sed -i 's@session\s*required\s*pam_loginuid.so@session optional pam_loginuid.so@g' /etc/pam.d/sshd && \
    sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config && \
    echo "PasswordAuthentication yes" >> /etc/ssh/sshd_config && \
    echo "PermitEmptyPasswords no" >> /etc/ssh/sshd_config

# Create challenge player user with password 'password123'
RUN useradd -m -s /bin/bash player && \
    echo "player:password123" | chpasswd

# Deploy target binary and set permissions
RUN mkdir -p /home/player/challenges/stage6
COPY target.bin /home/player/challenges/stage6/target.bin
RUN chmod 755 /home/player/challenges/stage6/target.bin

# Setup welcome message
RUN printf "============================================================\n  🎯 ShadowNet CTF - Stage 06: Reverse Engineering Sandbox\n============================================================\n\nTarget binary:\n  ~/challenges/stage6/target.bin\n\nRun with access code:\n  ~/challenges/stage6/target.bin <access_code>\n\nCopy to local host:\n  scp -P 2222 player@localhost:~/challenges/stage6/target.bin ./\n============================================================\n" > /home/player/README.txt && \
    echo "cat /home/player/README.txt" >> /home/player/.bashrc && \
    chown -R player:player /home/player

EXPOSE 22

CMD ["/usr/sbin/sshd", "-D"]
