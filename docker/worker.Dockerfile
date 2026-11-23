FROM eclipse-temurin:21-jre-jammy AS java
FROM debian:bookworm-slim
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG http_proxy
ARG https_proxy
COPY --from=java /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
RUN --mount=type=cache,target=/var/cache/apt rm -f /etc/apt/apt.conf.d/docker-clean && sed -i 's|http://deb.debian.org|https://deb.debian.org|g' /etc/apt/sources.list.d/debian.sources && (apt-get -o Acquire::Retries=3 update || apt-get -o Acquire::Retries=3 update) && (apt-get -o Acquire::Retries=3 -o Acquire::http::Pipeline-Depth=0 install -y --no-install-recommends python3 libseccomp2 libfreetype6 libfontconfig1 || apt-get -o Acquire::Retries=3 -o Acquire::http::Pipeline-Depth=0 install -y --no-install-recommends python3 libseccomp2 libfreetype6 libfontconfig1) && rm -rf /var/lib/apt/lists/*
COPY --from=java /opt/java/openjdk /opt/java/openjdk
WORKDIR /opt/mips
COPY runtime/Mars4_5.jar runtime/LabRunner.class ./
RUN mkdir -p /work/jobs /run/mips-worker
COPY docker/worker.py docker/launch.py docker/health.py /opt/worker/
ENV PYTHONDONTWRITEBYTECODE=1
CMD ["python3","-I","-S","/opt/worker/worker.py"]
