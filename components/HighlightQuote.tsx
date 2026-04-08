"use client";

import React, { useRef, useState, useCallback } from "react";

interface HighlightQuoteProps {
  quote: string;
  episode: number;
  section: number;
  playerName: string;
}

/**
 * 金句高亮组件 — 古风排版 + 一键分享
 * 设计原则：让每一句金句都值得截图发朋友圈
 */
export default function HighlightQuote({ quote, episode, section, playerName }: HighlightQuoteProps) {
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [posterUrl, setPosterUrl] = useState<string>("");

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  // 生成金句卡片图片
  const generateCard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 750, H = 500;
    canvas.width = W;
    canvas.height = H;

    // 背景渐变 — 深宫红到暗夜色
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#3d0c02");
    bg.addColorStop(0.5, "#1a0a04");
    bg.addColorStop(1, "#0d0d1a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // 暗纹装饰（四角金线）
    ctx.strokeStyle = "rgba(212, 175, 55, 0.15)";
    ctx.lineWidth = 1;
    // 左上
    ctx.beginPath(); ctx.moveTo(30, 60); ctx.lineTo(30, 30); ctx.lineTo(60, 30); ctx.stroke();
    // 右上
    ctx.beginPath(); ctx.moveTo(W-60, 30); ctx.lineTo(W-30, 30); ctx.lineTo(W-30, 60); ctx.stroke();
    // 左下
    ctx.beginPath(); ctx.moveTo(30, H-60); ctx.lineTo(30, H-30); ctx.lineTo(60, H-30); ctx.stroke();
    // 右下
    ctx.beginPath(); ctx.moveTo(W-60, H-30); ctx.lineTo(W-30, H-30); ctx.lineTo(W-30, H-60); ctx.stroke();

    // 上方金线
    ctx.strokeStyle = "rgba(212, 175, 55, 0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W * 0.25, 130);
    ctx.lineTo(W * 0.75, 130);
    ctx.stroke();

    // 金句主文
    ctx.fillStyle = "#F5E6C8";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // 根据文字长度调整字号
    const fontSize = quote.length <= 15 ? 42 : quote.length <= 25 ? 36 : 30;
    ctx.font = `${fontSize}px "Noto Serif SC", "Source Han Serif SC", "PingFang SC", serif`;

    // 自动换行
    const maxWidth = W - 120;
    const lines: string[] = [];
    let currentLine = "";
    for (const char of quote) {
      const testLine = currentLine + char;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    const lineHeight = fontSize * 1.8;
    const startY = H * 0.45 - ((lines.length - 1) * lineHeight) / 2;
    
    // 文字阴影
    ctx.shadowColor = "rgba(139, 37, 0, 0.6)";
    ctx.shadowBlur = 20;
    
    lines.forEach((line, i) => {
      ctx.fillText(line, W / 2, startY + i * lineHeight);
    });
    ctx.shadowBlur = 0;

    // 下方金线
    ctx.strokeStyle = "rgba(212, 175, 55, 0.4)";
    ctx.beginPath();
    ctx.moveTo(W * 0.25, H - 130);
    ctx.lineTo(W * 0.75, H - 130);
    ctx.stroke();

    // 底部信息
    ctx.fillStyle = "rgba(212, 175, 55, 0.6)";
    ctx.font = '20px "Noto Serif SC", "Source Han Serif SC", serif';
    ctx.fillText(`${playerName} · 第${episode}集`, W / 2, H - 90);

    // 深宫纪水印
    ctx.fillStyle = "rgba(212, 175, 55, 0.35)";
    ctx.font = '16px "Noto Serif SC", "Source Han Serif SC", serif';
    ctx.fillText("—— 深宫纪 · AI宫廷剧 ——", W / 2, H - 55);

    setPosterUrl(canvas.toDataURL("image/png"));
    setShowShareSheet(true);
  }, [quote, episode, playerName]);

  // 复制金句文案
  const copyQuote = () => {
    const text = `「${quote}」\n—— 深宫纪 · 第${episode}集\n#深宫纪 #AI宫斗 #你的后宫你做主`;
    navigator.clipboard.writeText(text).then(() => {
      showToastMsg("文案已复制");
    }).catch(() => {
      showToastMsg("复制失败");
    });
  };

  // 保存图片
  const saveImage = () => {
    if (!posterUrl) return;
    const link = document.createElement("a");
    link.download = `深宫纪_金句_第${episode}集.png`;
    link.href = posterUrl;
    link.click();
    showToastMsg("图片已保存");
  };

  return (
    <>
      {/* 金句高亮区块 */}
      <div className="my-6 sm:my-8 py-6 text-center relative">
        {/* 上方装饰线 */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 sm:w-16 h-px" style={{ background: "linear-gradient(to right, transparent, var(--palace-gold))" }} />
          <span className="text-xs tracking-widest" style={{ color: "var(--palace-gold)", opacity: 0.6 }}>✦</span>
          <div className="w-12 sm:w-16 h-px" style={{ background: "linear-gradient(to left, transparent, var(--palace-gold))" }} />
        </div>

        {/* 金句文字 */}
        <p
          className="text-lg sm:text-xl md:text-2xl leading-relaxed font-semibold px-4 sm:px-8"
          style={{
            color: "#F5E6C8",
            fontFamily: "'Noto Serif SC', 'Source Han Serif SC', 'PingFang SC', serif",
            textShadow: "0 0 20px rgba(139,37,0,0.4), 0 0 40px rgba(139,37,0,0.2)",
            letterSpacing: "0.1em",
          }}
        >
          「{quote}」
        </p>

        {/* 下方装饰线 */}
        <div className="flex items-center justify-center gap-3 mt-4">
          <div className="w-12 sm:w-16 h-px" style={{ background: "linear-gradient(to right, transparent, var(--palace-gold))" }} />
          <span className="text-xs tracking-widest" style={{ color: "var(--palace-gold)", opacity: 0.6 }}>✦</span>
          <div className="w-12 sm:w-16 h-px" style={{ background: "linear-gradient(to left, transparent, var(--palace-gold))" }} />
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            onClick={copyQuote}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all active:scale-95"
            style={{
              background: "rgba(212,175,55,0.08)",
              border: "1px solid rgba(212,175,55,0.2)",
              color: "var(--palace-gold)",
            }}
          >
            <span>📜</span> 复制金句
          </button>
          <button
            onClick={generateCard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all active:scale-95"
            style={{
              background: "rgba(139,37,0,0.15)",
              border: "1px solid rgba(212,175,55,0.3)",
              color: "var(--palace-gold)",
            }}
          >
            <span>📤</span> 生成卡片
          </button>
        </div>
      </div>

      {/* 隐藏的 Canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* 分享弹窗 */}
      {showShareSheet && posterUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-fade-in"
          onClick={() => setShowShareSheet(false)}
        >
          <div
            className="w-full max-w-[420px] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 卡片预览 */}
            <div className="w-full rounded-lg overflow-hidden shadow-2xl">
              <img src={posterUrl} alt="金句卡片" className="w-full" />
            </div>

            {/* 操作按钮 */}
            <div className="mt-4 flex gap-3 w-full">
              <button
                onClick={saveImage}
                className="flex-1 py-3 font-bold rounded-full text-sm active:scale-95 transition-transform"
                style={{ background: "var(--palace-gold)", color: "#1a0a04" }}
              >
                保存图片
              </button>
              <button
                onClick={() => { copyQuote(); setShowShareSheet(false); }}
                className="px-5 py-3 rounded-full text-sm border active:scale-95 transition-transform"
                style={{ borderColor: "rgba(212,175,55,0.4)", color: "var(--palace-gold)" }}
              >
                复制文案
              </button>
            </div>

            <button
              onClick={() => setShowShareSheet(false)}
              className="mt-3 text-xs py-2"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] px-6 py-3 font-bold rounded-full shadow-2xl animate-fade-in text-sm"
          style={{ background: "var(--palace-gold)", color: "#1a0a04" }}
        >
          {toast}
        </div>
      )}
    </>
  );
}
