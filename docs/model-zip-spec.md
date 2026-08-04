# 模型 zip 打包规范（WebLLM 模型导入用）

> 适用于：Qwen2.5-1.5B / 3B 等 MLC 转换版模型（`mlc-chat-config.json` + `params_shard_*.bin` 结构）

## 核心规则（一条）

**zip 内的所有文件必须直接放在根目录，不要套任何外层文件夹。**

即 zip 打开后第一眼就是文件列表，而不是一个 `Qwen2.5-1.5B/` 文件夹。

```
✅ 正确：                    ❌ 错误：
Qwen2.5-1.5B....zip         Qwen2.5-1.5B....zip
├── mlc-chat-config.json    └── Qwen2.5-1.5B-Instruct-q4f16_1-MLC/
├── ndarray-cache.json          ├── mlc-chat-config.json
├── params_shard_0.bin          ├── ndarray-cache.json
├── params_shard_1.bin          └── ...
└── ...（其余分片）
```

原因：APP 的「模型导入」功能按 zip 内**相对路径**写入浏览器缓存，web-llm 会在模型源 URL 目录下按相对路径拉取 `mlc-chat-config.json` / `params_shard_*.bin` 等。套一层文件夹会导致路径不匹配、模型加载失败。

## 必须包含的文件（完整清单）

| 文件 | 说明 |
|---|---|
| `mlc-chat-config.json` | 模型配置（必需，web-llm 首先读取） |
| `ndarray-cache.json` | 权重分片索引（必需） |
| `params_shard_0.bin` ~ `params_shard_N.bin` | 权重分片（1.5B 共 30 个；3B 共 62 个，**一个都不能少**） |
| `tokenizer.json` | tokenizer（必需） |
| `vocab.json` / `merges.txt` | 词表（必需） |
| `tokenizer_config.json` | tokenizer 配置（必需） |
| `tensor-cache.json` / `README.md` | 可选（无碍） |

> **无需 wasm**：运行时库（`*.wasm`）已随 APP 内置（`public/webllm/wasm/`），模型 zip 不需要包含。

## 打包命令（Windows）

在 `D:\models` 目录（已 `cd D:\models`）执行：

```powershell
Compress-Archive -Path (Get-ChildItem -File).FullName -DestinationPath "D:\Qwen2.5-1.5B-Instruct-q4f16_1-MLC.zip" -CompressionLevel Optimal
```

> - `Compress-Archive` 对 **2GB+ 限制**：1.5B（~840MB）没问题；3B（~1.7GB）建议用 **7-Zip**（右键 → 添加到压缩文件 → zip）更稳更快
> - 或直接资源管理器：全选文件 → 右键 → 发送到 → 压缩文件夹（zip）

## 打包后校验（2 分钟）

```powershell
# 1. zip 大小应约 830MB（zip 压缩对 bin 分片收益小）
(Get-Item "D:\Qwen2.5-1.5B-Instruct-q4f16_1-MLC.zip").Length / 1MB

# 2. 检查 zip 内结构：应直接是文件，无一层文件夹
Add-Type -AssemblyName System.IO.Compression.FileSystem
$z = [System.IO.Compression.ZipFile]::OpenRead("D:\Qwen2.5-1.5B-Instruct-q4f16_1-MLC.zip")
$z.Entries | Select-Object -First 5 FullName   # 应显示 mlc-chat-config.json 等（无子目录前缀）
$z.Dispose()
```

若第一条 `FullName` 都带 `Qwen2.5.../` 前缀 → 打包时选中了外层文件夹，需重打。

## 上传网盘后

- 保持 zip 原样上传（123/百度等），**不要在网盘里解压再传**（zip 单文件方便转存/离线下载）
- 用户端下载 zip → APP「模型导入」→ 选择 zip → 自动写入缓存 → 离线使用
