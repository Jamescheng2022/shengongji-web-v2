"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

interface StoryViewerProps {
  text: string;
  isStreaming?: boolean;
  speed?: number; // ms per char for typewriter
}

export const StoryViewer: React.FC<StoryViewerProps> = ({
  text,
  isStreaming = false,
  speed = 35,
}) => {
  const [displayed, setDisplayed] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const prevTextRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idxRef = useRef(0);

  // 跳过打字效果（点击）
  const skipTyping = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setDisplayed(text);
    setIsTyping(false);
  }, [text]);

  useEffect(() => {
    // 流式模式：直接显示全部文本（AI在实时输出）
    if (isStreaming) {
      setDisplayed(text);
      setIsTyping(true);
      prevTextRef.current = text;
      return;
    }

    // 文本没变化
    if (text === prevTextRef.current) return;
    prevTextRef.current = text;

    // 清除之前的定时器
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // 启动打字机效果
    if (text && speed > 0) {
      setDisplayed("");
      setIsTyping(true);
      idxRef.current = 0;

      timerRef.current = setInterval(() => {
        if (idxRef.current < text.length) {
          setDisplayed(text.slice(0, idxRef.current + 1));
          idxRef.current++;
        } else {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          setIsTyping(false);
        }
      }, speed);
    } else {
      setDisplayed(text);
      setIsTyping(false);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [text, isStreaming, speed]);

  return (
    <div
      className="min-h-[200px] leading-loose text-base md:text-lg cursor-pointer select-none"
      style={{ color: "var(--text-primary)", textShadow: "0 0 8px rgba(0,0,0,0.5)" }}
      onClick={skipTyping}
    >
      {/* 剧情文本 */}
      <div className="whitespace-pre-wrap">
        {displayed}
        {isTyping && <span className="typing-cursor" />}
      </div>

      {/* 点击跳过提示 */}
      {isTyping && !isStreaming && (
        <div
          className="text-xs text-center mt-4"
          style={{ color: "var(--text-secondary)", opacity: 0.4 }}
        >
          点击屏幕跳过
        </div>
      )}
    </div>
  );
};
