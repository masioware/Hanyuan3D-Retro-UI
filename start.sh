#!/bin/bash

docker run --gpus all -it \
  --name hunyuan3d-api \
  --rm \
  --shm-size=8g \
  --ipc=host \
  -p 8000:8000 \
  -e HF_HOME=/root/.cache/huggingface \
  -e TRANSFORMERS_CACHE=/root/.cache/huggingface \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  -v ~/.u2net:/root/.u2net \
  hunyuan3d \
  bash -c "python api_server.py --host 0.0.0.0 --port 8000"
  # bash -c "python api_server.py --host 0.0.0.0 --port 8000 --enable_tex"