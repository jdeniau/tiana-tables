# A bastion in front of the dev databases: only its port is published, and the tunnel reaches `mysql:3306` and `postgres:5432` by their service names.
FROM alpine:3
RUN apk add --no-cache openssh \
  && ssh-keygen -A \
  && adduser -D dev \
  && passwd -u dev
# sshd keeps the first value it reads, and sshd_config includes this directory before its own lines
COPY sshd.conf /etc/ssh/sshd_config.d/dev.conf
EXPOSE 22
CMD ["/usr/sbin/sshd", "-D", "-e"]
