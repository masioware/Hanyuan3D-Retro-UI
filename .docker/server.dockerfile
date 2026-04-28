FROM nvidia/cuda:12.4.1-cudnn-devel-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# System deps
RUN apt-get update && apt-get install -y \
    python3.10 \
    python3.10-venv \
    python3-pip \
    git \
    wget \
    curl \
    build-essential \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    ffmpeg \
    libopengl0 \
    libglx-mesa0 \
    && rm -rf /var/lib/apt/lists/*

# Set python
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.10 1

# Upgrade pip
RUN python -m pip install --upgrade pip

# PyTorch >= 2.6 (cu124) — versão mínima exigida pelo transformers por CVE-2025-32434
RUN pip install --retries 5 --timeout 120 torch torchvision --index-url https://download.pytorch.org/whl/cu124

# Clone repo
WORKDIR /app
RUN git clone https://github.com/Tencent/Hunyuan3D-2.git .

# Instalar dependências do projeto
RUN pip install -r requirements.txt

# Hugging Face (para baixar pesos)
RUN pip install huggingface_hub

# Setup project
RUN python setup.py install
RUN pip install sentencepiece tiktoken

# Compilar extensão CUDA custom_rasterizer (requer nvcc — presente na imagem devel)
# TORCH_CUDA_ARCH_LIST must be set explicitly; without a visible GPU the arch list is
# empty and PyTorch's _get_cuda_arch_flags crashes with IndexError: list index out of range.
ENV TORCH_CUDA_ARCH_LIST="7.5"
RUN cd hy3dgen/texgen/custom_rasterizer && python3 setup.py install
RUN cd hy3dgen/texgen/differentiable_renderer && python3 setup.py install

# Diretório de output
RUN mkdir -p /app/outputs

# Default shell
CMD ["/bin/bash"]