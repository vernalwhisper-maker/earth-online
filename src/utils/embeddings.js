// 语义嵌入引擎
// 基于 Transformers.js + Xenova 中文嵌入模型
// 混合方案：预计算成就嵌入 + 运行时仅计算用户笔记

import { pipeline, env } from "@huggingface/transformers";
import achievementsData from "../data/achievements";
import useSettingsStore from "../store/settingsStore";

let extractor = null;
let achEmbeddings = null; // [{ id, embedding: Float32Array }]

/**
 * 初始化嵌入提取器 + 预计算成就嵌入。
 * 首次调用会下载 ~113MB 模型（INT8），之后缓存。
 */
export async function initEmbeddings(onProgress) {
  if (extractor && achEmbeddings) return true;
  try {
    // 检测镜像设置
    const mirror = useSettingsStore.getState().useMirror;
    if (mirror) {
      env.remoteHost = "https://hf-mirror.com";
    }
    // 创建 feature-extraction pipeline
    extractor = await pipeline("feature-extraction",
      "Xenova/text2vec-base-chinese-paraphrase",
      { quantized: true, progress_callback: onProgress }
    );

    // 预计算所有成就的嵌入（一次性，后续缓存）
    if (!achEmbeddings) {
      const texts = achievementsData.map((a) => `${a.name}：${a.description}`);
      const embeddings = await extractor(texts, { pooling: "mean", normalize: true });
      const embArray = embeddings.tolist();
      achEmbeddings = achievementsData.map((a, i) => ({
        id: a.id,
        embedding: new Float32Array(embArray[i]),
      }));
    }
    return true;
  } catch (err) {
    console.error("Embeddings init failed:", err);
    extractor = null;
    return false;
  }
}

/**
 * 计算单个文本的嵌入向量。
 */
export async function getEmbedding(text) {
  if (!extractor) return null;
  try {
    const result = await extractor(text, { pooling: "mean", normalize: true });
    return new Float32Array(result.tolist());
  } catch {
    return null;
  }
}

/**
 * 计算两个向量间的余弦相似度。
 */
export function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * 将笔记内容与所有成就进行语义匹配。
 * @param {string} noteContent - 笔记内容
 * @param {number} topN - 返回前 N 个最匹配的成就
 * @param {number} threshold - 相似度阈值，低于此值不返回
 * @returns {Array<{id: number, name: string, score: number}>}
 */
export async function matchByEmbedding(noteContent, topN = 3, threshold = 0.3) {
  if (!extractor || !achEmbeddings) return [];

  try {
    // 计算笔记嵌入
    const noteEmb = await getEmbedding(noteContent);
    if (!noteEmb) return [];

    // 与所有成就嵌入比较
    const scores = achEmbeddings.map((ach) => ({
      id: ach.id,
      name: achievementsData.find((a) => a.id === ach.id)?.name || "",
      score: cosineSimilarity(noteEmb, ach.embedding),
    }));

    // 排序 + 阈值过滤
    scores.sort((a, b) => b.score - a.score);
    return scores.filter((s) => s.score >= threshold).slice(0, topN);
  } catch (err) {
    console.error("Embedding match failed:", err);
    return [];
  }
}

/**
 * 检查嵌入引擎是否就绪。
 */
export function isEmbeddingsReady() {
  return !!extractor && !!achEmbeddings;
}
