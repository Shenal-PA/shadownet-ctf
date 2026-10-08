FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
RUN useradd --uid 10001 --no-create-home tokenservice && mkdir /data && chown tokenservice:tokenservice /data && chmod 700 /data
COPY server.py http_server.py .
USER tokenservice
EXPOSE 5005
CMD ["python", "http_server.py"]
