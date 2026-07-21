FROM python:3.12-slim

# opencv-python-headless still needs a couple of shared libraries present on
# the base image (libgl1 / libglib2.0-0) even though it's the "headless"
# build - it links against them at import time.
# python-magic needs libmagic for file type detection.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 libmagic1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
