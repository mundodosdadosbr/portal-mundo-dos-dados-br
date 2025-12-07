
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { RefreshCw } from './Icons';

interface CaptchaProps {
  onGenerate: (code: string) => void;
}

export const Captcha: React.FC<CaptchaProps> = ({ onGenerate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const generateCaptcha = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 2. Background
    ctx.fillStyle = '#1e293b'; // slate-800
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 3. Generate Random Code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, 1, O, 0 to avoid confusion
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Pass code up to parent
    onGenerate(code);

    // 4. Draw Noise (Lines)
    for (let i = 0; i < 7; i++) {
      ctx.strokeStyle = `rgba(${Math.random()*255}, ${Math.random()*255}, ${Math.random()*255}, 0.5)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.stroke();
    }

    // 5. Draw Noise (Dots)
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = `rgba(${Math.random()*255}, ${Math.random()*255}, ${Math.random()*255}, 0.5)`;
      ctx.beginPath();
      ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 1, 0, 2 * Math.PI);
      ctx.fill();
    }

    // 6. Draw Text
    ctx.font = 'bold 24px monospace';
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i < code.length; i++) {
      ctx.save();
      // Position
      const x = 20 + i * 25;
      const y = canvas.height / 2;
      
      // Random rotation
      const angle = (Math.random() - 0.5) * 0.4; // -0.2 to 0.2 rad
      ctx.translate(x, y);
      ctx.rotate(angle);
      
      ctx.fillStyle = '#f1f5f9'; // white text
      ctx.fillText(code[i], 0, 0);
      ctx.restore();
    }
  }, [onGenerate]);

  useEffect(() => {
    generateCaptcha();
  }, [generateCaptcha]);

  const handleRefresh = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsRefreshing(true);
    generateCaptcha();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="flex items-center gap-3">
      <canvas 
        ref={canvasRef} 
        width={180} 
        height={50} 
        className="rounded-lg border border-slate-700 cursor-pointer shadow-inner"
        onClick={handleRefresh}
        title="Clique para gerar novo código"
      />
      <button 
        onClick={handleRefresh}
        type="button"
        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all"
        title="Recarregar Captcha"
      >
        <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
      </button>
    </div>
  );
};
