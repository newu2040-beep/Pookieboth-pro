
import React, { useState, useRef, useEffect } from 'react';
import { Photo, FilterConfig, LayoutType, StickerItem, TextItem } from '../types';
import { FILTERS, FRAME_COLORS, FRAME_PATTERNS, STICKER_PACKS, FONTS } from '../constants';
import { useTheme } from './ThemeContext';
import { Check, X, Download, Share2, Trash2, Sliders, Layout, Palette, Type, Smile, Move, Maximize, RotateCw, ArrowLeft, Printer, Sun, Contrast, Droplets } from 'lucide-react';
import { playSound } from '../utils/audio';
import { triggerHaptic } from '../utils/haptics';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';

interface EditorProps {
  photo: Photo;
  onSave: (updatedPhoto: Photo) => void;
  onDiscard: () => void;
  onDelete: () => void;
}

export const Editor: React.FC<EditorProps> = ({ photo, onSave, onDiscard, onDelete }) => {
  const { colors } = useTheme();
  
  // -- State --
  const [activeTab, setActiveTab] = useState<'filter' | 'adjust' | 'layout' | 'frame' | 'decor' | 'items'>('filter');
  const [showShareModal, setShowShareModal] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  
  // Image Adjustments
  const [selectedFilter, setSelectedFilter] = useState<FilterConfig>(FILTERS.find(f => f.name === photo.filter) || FILTERS[0]);
  const [adjustments, setAdjustments] = useState({
      brightness: 100,
      contrast: 100,
      saturation: 100
  });
  
  // Layout & Spacing
  const [layout, setLayout] = useState<LayoutType>(photo.layout || (photo.originalImages.length > 1 ? 'strip4' : 'single'));
  const [paddingSize, setPaddingSize] = useState(photo.padding ?? 40);
  const [gapSize, setGapSize] = useState(photo.gap ?? 20);
  const [cornerRadius, setCornerRadius] = useState(photo.cornerRadius ?? 0);
  
  // Frame
  const [frameColor, setFrameColor] = useState(photo.frameColor || '#ffffff');
  const [framePattern, setFramePattern] = useState(photo.framePattern || 'none');
  const [showWatermark, setShowWatermark] = useState(true);
  const [showDate, setShowDate] = useState(true);

  // Layers (Stickers & Text)
  const [stickers, setStickers] = useState<StickerItem[]>(photo.stickers || []);
  const [texts, setTexts] = useState<TextItem[]>(photo.texts || []);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  
  // Text Input State
  const [isAddingText, setIsAddingText] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [textColor, setTextColor] = useState('#000000');
  const [textFont, setTextFont] = useState('Quicksand');

  // Preview & Rendering
  const [previewUri, setPreviewUri] = useState<string>(photo.uri);
  const [finalExportUri, setFinalExportUri] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceImagesRef = useRef<HTMLImageElement[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // -- Initialization --
  useEffect(() => {
    const loadImages = async () => {
        const promises = photo.originalImages.map(src => {
            return new Promise<HTMLImageElement>((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = src;
            });
        });
        
        try {
            sourceImagesRef.current = await Promise.all(promises);
            renderBaseComposite();
        } catch (e) {
            console.error("Failed to load images", e);
        }
    };
    loadImages();
  }, [photo.originalImages]);

  // Re-render base image when structural props change
  useEffect(() => {
    const timer = setTimeout(renderBaseComposite, 20);
    return () => clearTimeout(timer);
  }, [selectedFilter, adjustments, layout, frameColor, framePattern, cornerRadius, paddingSize, gapSize, showWatermark, showDate]);


  // -- Canvas Logic --

  const createPattern = (ctx: CanvasRenderingContext2D, color: string, type: string) => {
      const patternCanvas = document.createElement('canvas');
      const pCtx = patternCanvas.getContext('2d');
      if (!pCtx) return null;

      if (type === 'dots') {
          patternCanvas.width = 20;
          patternCanvas.height = 20;
          pCtx.fillStyle = color;
          pCtx.fillRect(0, 0, 20, 20);
          pCtx.fillStyle = 'rgba(0,0,0,0.05)';
          pCtx.beginPath();
          pCtx.arc(10, 10, 3, 0, 2 * Math.PI);
          pCtx.fill();
      } else if (type === 'stripes') {
          patternCanvas.width = 20;
          patternCanvas.height = 20;
          pCtx.fillStyle = color;
          pCtx.fillRect(0, 0, 20, 20);
          pCtx.fillStyle = 'rgba(0,0,0,0.05)';
          pCtx.fillRect(0, 0, 10, 20);
      } else if (type === 'check') {
          patternCanvas.width = 40;
          patternCanvas.height = 40;
          pCtx.fillStyle = color;
          pCtx.fillRect(0, 0, 40, 40);
          pCtx.fillStyle = 'rgba(0,0,0,0.05)';
          pCtx.fillRect(0, 0, 20, 20);
          pCtx.fillRect(20, 20, 20, 20);
      } else {
          return null;
      }
      return ctx.createPattern(patternCanvas, 'repeat');
  };

  const drawRoundedImage = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, r: number) => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.clip();
    
    // Combine Filter preset with manual adjustments
    // Base filter values from preset
    const f = selectedFilter;
    
    // Calculate total adjustments
    // We normalize 100 as base. 
    // e.g. f.brightness might be 110. adjustments.brightness might be 100 (normal) or 110 (+10%).
    // We combine them multiplicatively for a natural feel.
    const totalBri = (f.brightness / 100) * (adjustments.brightness / 100) * 100;
    const totalCon = (f.contrast / 100) * (adjustments.contrast / 100) * 100;
    const totalSat = (f.saturate / 100) * (adjustments.saturation / 100) * 100;

    const filterString = `
      brightness(${totalBri}%) 
      contrast(${totalCon}%) 
      saturate(${totalSat}%) 
      sepia(${f.sepia}%) 
      blur(${f.blur}px) 
      hue-rotate(${f.hueRotate}deg) 
      ${f.class.includes('grayscale') ? `grayscale(1)` : 'grayscale(0)'}
    `;
    ctx.filter = filterString;
    
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();
  };

  const renderBaseComposite = () => {
    if (!canvasRef.current || sourceImagesRef.current.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const images = sourceImagesRef.current;
    const padding = paddingSize;
    const gap = gapSize;
    const footerHeight = (showWatermark || showDate) ? 140 : padding; 
    
    const srcW = images[0].naturalWidth;
    const srcH = images[0].naturalHeight;
    const targetBaseWidth = 1200; 
    
    let width = 0, height = 0, imgW = 0, imgH = 0;

    if (layout === 'single') {
        imgW = targetBaseWidth;
        imgH = imgW * (srcH / srcW);
        width = imgW + (padding * 2);
        height = imgH + (padding * 2) + ((showWatermark || showDate) ? footerHeight - padding : 0);
    } else if (layout === 'strip4') {
        imgW = targetBaseWidth / 2;
        imgH = imgW * (srcH / srcW);
        width = imgW + (padding * 2);
        height = (imgH * 4) + (gap * 3) + (padding * 2) + ((showWatermark || showDate) ? footerHeight - padding : 0);
    } else if (layout === 'grid2x2') {
        imgW = targetBaseWidth / 2;
        imgH = imgW * (srcH / srcW);
        width = (imgW * 2) + gap + (padding * 2);
        height = (imgH * 2) + gap + (padding * 2) + ((showWatermark || showDate) ? footerHeight - padding : 0);
    }

    canvas.width = width;
    canvas.height = height;

    // Draw Background/Frame
    ctx.fillStyle = frameColor;
    ctx.fillRect(0, 0, width, height);

    if (framePattern !== 'none') {
        const pattern = createPattern(ctx, frameColor, framePattern);
        if (pattern) {
            ctx.fillStyle = pattern;
            ctx.fillRect(0, 0, width, height);
        }
    }

    const effectiveRadius = (cornerRadius / 100) * (Math.min(imgW, imgH) / 2);

    if (layout === 'single') {
        drawRoundedImage(ctx, images[0], padding, padding, imgW, imgH, effectiveRadius);
    } else if (layout === 'strip4') {
        images.slice(0, 4).forEach((img, i) => {
            const imgToDraw = img || images[i % images.length]; 
            const y = padding + i * (imgH + gap);
            drawRoundedImage(ctx, imgToDraw, padding, y, imgW, imgH, effectiveRadius);
        });
    } else if (layout === 'grid2x2') {
        const pos = [
            {x: padding, y: padding},
            {x: padding + imgW + gap, y: padding},
            {x: padding, y: padding + imgH + gap},
            {x: padding + imgW + gap, y: padding + imgH + gap},
        ];
        pos.forEach((p, i) => {
             const imgToDraw = images[i] || images[i % images.length]; 
             drawRoundedImage(ctx, imgToDraw, p.x, p.y, imgW, imgH, effectiveRadius);
        });
    }

    // Reset Filter for Text
    ctx.filter = 'none';

    if (showWatermark || showDate) {
        ctx.fillStyle = (['#000000', '#1a1a1a', '#7c2d12'].includes(frameColor)) ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let footerCenterY = height - (footerHeight / 2) + (padding/4);
        
        if (showWatermark) {
            ctx.font = 'bold 48px Quicksand';
            ctx.fillText('PookieBoth', width / 2, showDate ? footerCenterY - 20 : footerCenterY);
        }
        
        if (showDate) {
            ctx.font = '500 24px Quicksand';
            const dateStr = new Date(photo.timestamp).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
            ctx.fillText(dateStr, width / 2, showWatermark ? footerCenterY + 35 : footerCenterY);
        }
    }

    setPreviewUri(canvas.toDataURL('image/jpeg', 0.95));
  };

  const bakeFinalImage = async (): Promise<string> => {
      renderBaseComposite(); // Ensure base is fresh
      const canvas = canvasRef.current;
      if (!canvas) return photo.uri;

      const ctx = canvas.getContext('2d');
      if (!ctx) return photo.uri;

      // Draw Stickers
      stickers.forEach(sticker => {
          const x = (sticker.x / 100) * canvas.width;
          const y = (sticker.y / 100) * canvas.height;
          
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate((sticker.rotation * Math.PI) / 180);
          ctx.scale(sticker.scale, sticker.scale);
          ctx.font = '80px Arial'; 
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(sticker.emoji, 0, 0);
          ctx.restore();
      });

      // Draw Text
      texts.forEach(item => {
          const x = (item.x / 100) * canvas.width;
          const y = (item.y / 100) * canvas.height;

          ctx.save();
          ctx.translate(x, y);
          ctx.rotate((item.rotation * Math.PI) / 180);
          ctx.scale(item.scale, item.scale);
          ctx.fillStyle = item.color;
          ctx.font = `bold 60px ${item.font}`; 
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(item.text, 0, 0);
          ctx.restore();
      });

      return canvas.toDataURL('image/jpeg', 0.95);
  };

  // -- Interaction Logic (Drag/Drop) --

  const handleDrag = (e: React.MouseEvent | React.TouchEvent, id: string, type: 'sticker' | 'text') => {
    setSelectedLayerId(id);
    if (!containerRef.current) return;

    const container = containerRef.current.getBoundingClientRect();
    const startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    // Find item initial pos
    const item = type === 'sticker' 
        ? stickers.find(s => s.id === id) 
        : texts.find(t => t.id === id);
    
    if (!item) return;
    const initialPctX = item.x;
    const initialPctY = item.y;

    const moveHandler = (moveEvent: MouseEvent | TouchEvent) => {
        const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
        const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;

        const deltaXPixels = currentX - startX;
        const deltaYPixels = currentY - startY;

        const deltaXPct = (deltaXPixels / container.width) * 100;
        const deltaYPct = (deltaYPixels / container.height) * 100;

        if (type === 'sticker') {
            setStickers(prev => prev.map(s => s.id === id ? { ...s, x: initialPctX + deltaXPct, y: initialPctY + deltaYPct } : s));
        } else {
            setTexts(prev => prev.map(t => t.id === id ? { ...t, x: initialPctX + deltaXPct, y: initialPctY + deltaYPct } : t));
        }
    };

    const upHandler = () => {
        document.removeEventListener('mousemove', moveHandler);
        document.removeEventListener('mouseup', upHandler);
        document.removeEventListener('touchmove', moveHandler);
        document.removeEventListener('touchend', upHandler);
    };

    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', upHandler);
    document.addEventListener('touchmove', moveHandler, { passive: false });
    document.addEventListener('touchend', upHandler);
  };

  const updateLayerProp = (prop: 'scale' | 'rotation', val: number) => {
      if (!selectedLayerId) return;
      setStickers(prev => prev.map(s => s.id === selectedLayerId ? { ...s, [prop]: val } : s));
      setTexts(prev => prev.map(t => t.id === selectedLayerId ? { ...t, [prop]: val } : t));
  };
  
  const getSelectedLayer = () => {
      return stickers.find(s => s.id === selectedLayerId) || texts.find(t => t.id === selectedLayerId);
  };

  // -- Actions --

  const addSticker = (emoji: string) => {
      const newSticker: StickerItem = {
          id: uuidv4(),
          emoji,
          x: 50,
          y: 50,
          scale: 1,
          rotation: 0
      };
      setStickers(prev => [...prev, newSticker]);
      setSelectedLayerId(newSticker.id);
      playSound('pop');
      // Switch to items tab to edit immediately
      setActiveTab('items');
  };

  const addText = () => {
      if (!textInput.trim()) return;
      const newText: TextItem = {
          id: uuidv4(),
          text: textInput,
          x: 50,
          y: 50,
          scale: 1,
          rotation: 0,
          color: textColor,
          font: textFont
      };
      setTexts(prev => [...prev, newText]);
      setSelectedLayerId(newText.id);
      setIsAddingText(false);
      setTextInput('');
      playSound('pop');
      setActiveTab('items');
  };

  const deleteSelectedLayer = () => {
      if (!selectedLayerId) return;
      setStickers(prev => prev.filter(s => s.id !== selectedLayerId));
      setTexts(prev => prev.filter(t => t.id !== selectedLayerId));
      setSelectedLayerId(null);
      playSound('delete');
  };

  // PRINT FUNCTIONALITY
  const handlePrint = async () => {
      playSound('click');
      triggerHaptic('medium');
      const uri = await bakeFinalImage();
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
          printWindow.document.write(`
            <html>
                <head>
                    <title>Print PookieBoth</title>
                    <style>
                        body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background: #fff; }
                        img { max-width: 100%; max-height: 100%; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
                    </style>
                </head>
                <body>
                    <img src="${uri}" onload="window.print();" />
                    <script>
                        // Close after print dialog is closed (works in some browsers)
                        window.onafterprint = function() { window.close(); };
                    </script>
                </body>
            </html>
          `);
          printWindow.document.close();
      } else {
          alert('Please allow popups to print!');
      }
  };

  const handleShareClick = async () => {
      const uri = await bakeFinalImage();
      setFinalExportUri(uri);
      
      // Generate QR Code Offline
      try {
          const qrData = await QRCode.toDataURL(window.location.href, {
             color: {
                 dark: '#000000',
                 light: '#0000' // Transparent
             }
          });
          setQrCodeData(qrData);
      } catch (err) {
          console.error("QR Generation failed", err);
      }
      
      setShowShareModal(true);
      playSound('pop');
      triggerHaptic('medium');
  };

  const handleNativeShare = async () => {
      if (!finalExportUri) return;
      try {
          const res = await fetch(finalExportUri);
          const blob = await res.blob();
          const file = new File([blob], 'pookieboth.jpg', { type: 'image/jpeg' });
          if (navigator.share) {
              await navigator.share({
                  files: [file],
                  title: 'PookieBoth',
                  text: 'Check out my cute photo! ✨ #PookieBoth'
              });
              playSound('success');
          } else {
              alert("Native sharing not supported on this browser.");
          }
      } catch (e) {
          console.error(e);
      }
  };

  const handleDownload = () => {
      if (!finalExportUri) return;
      const link = document.createElement('a');
      link.download = `PookieBoth_${Date.now()}.jpg`;
      link.href = finalExportUri;
      link.click();
      playSound('success');
      triggerHaptic('success');
  };

  const handleFinalSave = async () => {
    playSound('success');
    triggerHaptic('success');
    const finalUri = await bakeFinalImage();
    const updated: Photo = {
        ...photo,
        uri: finalUri,
        layout,
        filter: selectedFilter.name,
        frameColor,
        framePattern,
        stickers,
        texts,
        cornerRadius,
        padding: paddingSize,
        gap: gapSize
    };
    onSave(updated);
  };

  const activeLayer = getSelectedLayer();

  return (
    <div className={`h-full w-full flex flex-col ${colors.bg}`}>
      
      {/* Hidden Canvas for Processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Share Modal */}
      {showShareModal && finalExportUri && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-fade-enter">
              <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl animate-pop">
                  <div className="relative bg-gray-100 p-8 flex items-center justify-center">
                      <img src={finalExportUri} className="max-h-64 rounded-lg shadow-lg" alt="Final" />
                      <button onClick={() => setShowShareModal(false)} className="absolute top-4 right-4 p-2 bg-white/50 rounded-full hover:bg-white text-gray-800 transition-all btn-bouncy">
                          <X size={20} />
                      </button>
                  </div>
                  <div className="p-6">
                      <h3 className="text-xl font-bold text-center mb-6 font-serif italic">Share your Memory</h3>
                      <div className="grid grid-cols-4 gap-4 mb-6">
                          <button onClick={handleNativeShare} className="flex flex-col items-center gap-2 group">
                              <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform btn-bouncy">
                                  <Share2 size={20} />
                              </div>
                              <span className="text-[10px] font-bold text-gray-500">Share</span>
                          </button>
                          <button onClick={handleDownload} className="flex flex-col items-center gap-2 group">
                              <div className="w-12 h-12 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform btn-bouncy">
                                  <Download size={20} />
                              </div>
                              <span className="text-[10px] font-bold text-gray-500">Save</span>
                          </button>
                          <button onClick={handlePrint} className="flex flex-col items-center gap-2 group">
                              <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform btn-bouncy">
                                  <Printer size={20} />
                              </div>
                              <span className="text-[10px] font-bold text-gray-500">Print</span>
                          </button>
                          <div className="flex flex-col items-center gap-2 group">
                              <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform btn-bouncy overflow-hidden p-1">
                                  {qrCodeData ? (
                                      <img src={qrCodeData} alt="QR" className="w-full h-full opacity-90" />
                                  ) : (
                                      <div className="w-4 h-4 rounded-full border-2 border-purple-200 border-t-purple-500 animate-spin"></div>
                                  )}
                              </div>
                              <span className="text-[10px] font-bold text-gray-500">QR</span>
                          </div>
                      </div>
                      <button onClick={() => setShowShareModal(false)} className="w-full py-3 bg-gray-100 rounded-xl font-bold text-gray-500 hover:bg-gray-200 transition-colors btn-bouncy">
                          Done
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200/50 bg-white/60 backdrop-blur-md sticky top-0 z-10">
        <button onClick={() => { triggerHaptic('selection'); onDiscard(); }} className="p-2 rounded-full hover:bg-black/5 text-gray-600 transition-colors btn-bouncy">
          <ArrowLeft size={24} />
        </button>
        <div className="flex gap-3">
            <button onClick={handlePrint} className="p-2 rounded-full text-gray-600 hover:bg-black/5 transition-colors btn-bouncy" title="Print">
                <Printer size={20} />
            </button>
            <button onClick={handleShareClick} className={`p-2 rounded-full text-gray-600 hover:bg-black/5 transition-colors btn-bouncy`} title="Share">
                <Share2 size={20} />
            </button>
            <button onClick={handleFinalSave} className={`px-4 py-1 rounded-full ${colors.accent} ${colors.accentText} font-bold shadow-sm flex items-center gap-2 hover:brightness-95 transition-all btn-bouncy`}>
                <Check size={18} /> Save
            </button>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 p-6 flex items-center justify-center overflow-hidden bg-gray-50/50 relative select-none">
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        {/* Layer Container */}
        <div 
            ref={containerRef}
            className="relative shadow-2xl shadow-gray-200/50 rounded-sm transition-all duration-300 max-h-full max-w-full flex justify-center animate-pop"
            onClick={() => { setSelectedLayerId(null); setActiveTab(activeTab === 'items' ? 'filter' : activeTab); }}
        >
            <img 
                src={previewUri} 
                alt="Preview" 
                className="max-h-[55vh] max-w-full object-contain pointer-events-none"
            />

            {/* Render Stickers Overlay */}
            {stickers.map(sticker => (
                <div
                    key={sticker.id}
                    className={`absolute flex items-center justify-center cursor-move select-none transition-transform ${selectedLayerId === sticker.id ? 'ring-2 ring-blue-400 rounded-lg bg-black/5' : ''}`}
                    style={{
                        left: `${sticker.x}%`,
                        top: `${sticker.y}%`,
                        fontSize: `${40 * sticker.scale}px`,
                        transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg)`,
                        zIndex: 10
                    }}
                    onMouseDown={(e) => { e.stopPropagation(); handleDrag(e, sticker.id, 'sticker'); setActiveTab('items'); }}
                    onTouchStart={(e) => { e.stopPropagation(); handleDrag(e, sticker.id, 'sticker'); setActiveTab('items'); }}
                >
                    {sticker.emoji}
                </div>
            ))}

            {/* Render Text Overlay */}
            {texts.map(text => (
                <div
                    key={text.id}
                    className={`absolute flex items-center justify-center cursor-move select-none whitespace-nowrap ${selectedLayerId === text.id ? 'ring-2 ring-blue-400 rounded-lg bg-black/5' : ''}`}
                    style={{
                        left: `${text.x}%`,
                        top: `${text.y}%`,
                        transform: `translate(-50%, -50%) rotate(${text.rotation}deg) scale(${text.scale})`,
                        color: text.color,
                        fontFamily: text.font === 'Pacifico' ? 'Pacifico, cursive' : text.font,
                        fontSize: '24px',
                        fontWeight: 'bold',
                        textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        zIndex: 11
                    }}
                    onMouseDown={(e) => { e.stopPropagation(); handleDrag(e, text.id, 'text'); setActiveTab('items'); }}
                    onTouchStart={(e) => { e.stopPropagation(); handleDrag(e, text.id, 'text'); setActiveTab('items'); }}
                >
                    {text.text}
                </div>
            ))}
        </div>
      </div>

      {/* Controls Panel */}
      <div className={`bg-white rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] flex flex-col z-20 transition-transform duration-300 animate-slide-up`}>
        
        {/* Main Tab Bar */}
        <div className="flex justify-between px-6 py-4 border-b border-gray-50 overflow-x-auto scrollbar-hide">
            {[
                { id: 'filter', icon: Sliders, label: 'Filter' },
                { id: 'adjust', icon: Sun, label: 'Adjust' },
                { id: 'layout', icon: Layout, label: 'Layout' },
                { id: 'decor', icon: Smile, label: 'Decor' },
                { id: 'frame', icon: Palette, label: 'Frame' },
                { id: 'items', icon: Maximize, label: 'Items' },
            ].map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id as any); playSound('click'); triggerHaptic('selection'); }} 
                    className={`flex flex-col items-center gap-1 min-w-[50px] transition-all duration-300 btn-bouncy ${activeTab === tab.id ? `${colors.text} scale-110` : 'text-gray-300'}`}
                >
                    <tab.icon size={20} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
                </button>
            ))}
        </div>

        <div className="p-6 h-56 overflow-y-auto">
            
            {/* 1. FILTER TAB */}
            {activeTab === 'filter' && (
                <div className="flex flex-col gap-4 animate-fade-enter">
                    <div className="overflow-x-auto pb-4 -mx-6 px-6 scrollbar-hide">
                        <div className="flex gap-4">
                            {FILTERS.map((filter) => (
                            <button
                                key={filter.name}
                                onClick={() => { setSelectedFilter(filter); playSound('pop'); triggerHaptic('selection'); }}
                                className={`flex flex-col items-center gap-2 min-w-[64px] transition-all btn-bouncy ${selectedFilter.name === filter.name ? 'scale-105 opacity-100' : 'opacity-60'}`}
                            >
                                <div className={`w-16 h-16 rounded-2xl overflow-hidden border-[3px] shadow-sm ${selectedFilter.name === filter.name ? `border-gray-800` : 'border-transparent'}`}>
                                    <img 
                                        src={photo.originalImages[0]} 
                                        className={`w-full h-full object-cover ${filter.class}`} 
                                        style={{filter: `brightness(${filter.brightness}%) contrast(${filter.contrast}%) saturate(${filter.saturate}%) sepia(${filter.sepia}%) hue-rotate(${filter.hueRotate}deg) blur(${filter.blur}px)`}}
                                    />
                                </div>
                                <span className="text-[10px] font-bold text-gray-600">{filter.name}</span>
                            </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* 2. ADJUST TAB (New) */}
            {activeTab === 'adjust' && (
                <div className="flex flex-col gap-6 animate-fade-enter">
                     <div className="flex items-center gap-4">
                        <Sun size={20} className="text-gray-400" />
                        <div className="flex-1 flex flex-col gap-1">
                             <div className="flex justify-between text-xs font-bold text-gray-500 uppercase">
                                 <span>Brightness</span>
                                 <span>{adjustments.brightness}%</span>
                             </div>
                             <input 
                                type="range" min="50" max="150" value={adjustments.brightness} 
                                onChange={(e) => setAdjustments({...adjustments, brightness: Number(e.target.value)})}
                                className="w-full h-1.5 bg-gray-100 rounded-full appearance-none cursor-pointer accent-gray-800"
                            />
                        </div>
                     </div>
                     <div className="flex items-center gap-4">
                        <Contrast size={20} className="text-gray-400" />
                        <div className="flex-1 flex flex-col gap-1">
                             <div className="flex justify-between text-xs font-bold text-gray-500 uppercase">
                                 <span>Contrast</span>
                                 <span>{adjustments.contrast}%</span>
                             </div>
                             <input 
                                type="range" min="50" max="150" value={adjustments.contrast} 
                                onChange={(e) => setAdjustments({...adjustments, contrast: Number(e.target.value)})}
                                className="w-full h-1.5 bg-gray-100 rounded-full appearance-none cursor-pointer accent-gray-800"
                            />
                        </div>
                     </div>
                     <div className="flex items-center gap-4">
                        <Droplets size={20} className="text-gray-400" />
                        <div className="flex-1 flex flex-col gap-1">
                             <div className="flex justify-between text-xs font-bold text-gray-500 uppercase">
                                 <span>Saturation</span>
                                 <span>{adjustments.saturation}%</span>
                             </div>
                             <input 
                                type="range" min="0" max="200" value={adjustments.saturation} 
                                onChange={(e) => setAdjustments({...adjustments, saturation: Number(e.target.value)})}
                                className="w-full h-1.5 bg-gray-100 rounded-full appearance-none cursor-pointer accent-gray-800"
                            />
                        </div>
                     </div>
                     <button 
                         onClick={() => setAdjustments({brightness: 100, contrast: 100, saturation: 100})}
                         className="self-center px-4 py-2 bg-gray-100 rounded-full text-xs font-bold text-gray-500"
                     >
                         Reset Adjustments
                     </button>
                </div>
            )}

            {/* 3. LAYOUT & SPACING TAB */}
            {activeTab === 'layout' && (
                <div className="flex flex-col gap-6 animate-fade-enter">
                     {/* Layout Selector */}
                    <div className="flex justify-center gap-6">
                        {['single', 'strip4', 'grid2x2'].map(l => (
                             (l === 'single' || photo.originalImages.length > 1) && (
                                <button 
                                    key={l}
                                    onClick={() => { setLayout(l as any); playSound('pop'); triggerHaptic('selection'); }}
                                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all btn-bouncy ${layout === l ? 'border-gray-800 bg-gray-50' : 'border-gray-100'}`}
                                >
                                    <div className="w-6 h-8 border border-gray-400 bg-white opacity-50 rounded-sm"></div>
                                    <span className="text-[10px] font-bold text-gray-500 capitalize">{l.replace('strip4', 'strip').replace('grid2x2', 'grid')}</span>
                                </button>
                             )
                        ))}
                    </div>
                    
                    {/* Spacing Sliders */}
                    <div className="bg-gray-50 p-4 rounded-2xl space-y-4">
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-bold text-gray-400 w-16 uppercase tracking-wider">Padding</span>
                            <input 
                                type="range" min="0" max="100" value={paddingSize} 
                                onChange={(e) => setPaddingSize(Number(e.target.value))}
                                className="flex-1 h-1.5 bg-white rounded-full appearance-none cursor-pointer accent-gray-800 shadow-sm"
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-bold text-gray-400 w-16 uppercase tracking-wider">Gap</span>
                            <input 
                                type="range" min="0" max="60" value={gapSize} 
                                onChange={(e) => setGapSize(Number(e.target.value))}
                                className="flex-1 h-1.5 bg-white rounded-full appearance-none cursor-pointer accent-gray-800 shadow-sm"
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-bold text-gray-400 w-16 uppercase tracking-wider">Round</span>
                            <input 
                                type="range" min="0" max="50" value={cornerRadius} 
                                onChange={(e) => setCornerRadius(Number(e.target.value))}
                                className="flex-1 h-1.5 bg-white rounded-full appearance-none cursor-pointer accent-gray-800 shadow-sm"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* 4. DECOR TAB (Stickers & Text) */}
            {activeTab === 'decor' && (
                <div className="flex flex-col gap-4 animate-fade-enter h-full">
                    {!isAddingText ? (
                        <>
                           <div className="flex justify-center gap-4 mb-2">
                                <button 
                                    onClick={() => setIsAddingText(true)}
                                    className="px-6 py-2 bg-gray-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-transform"
                                >
                                    <Type size={14} /> Add Note
                                </button>
                           </div>
                           
                           <div className="flex-1 overflow-y-auto pr-2">
                               {STICKER_PACKS.map(pack => (
                                   <div key={pack.name} className="mb-4">
                                       <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{pack.name}</h4>
                                       <div className="grid grid-cols-8 gap-2">
                                           {pack.items.map(item => (
                                               <button 
                                                    key={item}
                                                    onClick={() => addSticker(item)}
                                                    className="text-2xl hover:scale-125 transition-transform active:scale-90"
                                               >
                                                   {item}
                                               </button>
                                           ))}
                                       </div>
                                   </div>
                               ))}
                           </div>
                        </>
                    ) : (
                        <div className="flex flex-col gap-4 h-full">
                            <input 
                                autoFocus
                                type="text" 
                                placeholder="Type something cute..." 
                                value={textInput}
                                onChange={(e) => setTextInput(e.target.value)}
                                className="w-full p-3 rounded-xl border-2 border-gray-200 focus:border-black focus:outline-none text-center font-bold"
                            />
                            
                            <div className="flex justify-center gap-2">
                                {FONTS.map(f => (
                                    <button 
                                        key={f.name}
                                        onClick={() => setTextFont(f.value)}
                                        className={`px-3 py-1 rounded-lg text-xs border ${textFont === f.value ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-500'}`}
                                        style={{ fontFamily: f.value === 'Pacifico' ? 'Pacifico' : undefined }}
                                    >
                                        {f.name}
                                    </button>
                                ))}
                            </div>
                            
                            <div className="flex justify-center gap-2">
                                {['#000000', '#ffffff', '#ff6b6b', '#4ecdc4', '#ffe66d'].map(c => (
                                    <button 
                                        key={c}
                                        onClick={() => setTextColor(c)}
                                        className={`w-8 h-8 rounded-full border-2 ${textColor === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                                        style={{ backgroundColor: c, boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}
                                    />
                                ))}
                            </div>

                            <div className="flex gap-2 mt-auto">
                                <button onClick={() => setIsAddingText(false)} className="flex-1 py-3 text-xs font-bold text-gray-500 bg-gray-100 rounded-xl">Cancel</button>
                                <button onClick={addText} className="flex-1 py-3 text-xs font-bold text-white bg-black rounded-xl shadow-lg">Add Text</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 5. FRAME TAB */}
            {activeTab === 'frame' && (
                <div className="flex flex-col gap-6 animate-fade-enter">
                     {/* Patterns */}
                     <div className="flex justify-center gap-4">
                        {FRAME_PATTERNS.map(p => (
                            <button 
                                key={p.value}
                                onClick={() => { setFramePattern(p.value); playSound('pop'); triggerHaptic('selection'); }}
                                className={`px-4 py-2 rounded-xl border-2 text-xs font-bold transition-all btn-bouncy ${framePattern === p.value ? 'border-gray-800 bg-gray-50 text-black' : 'border-gray-100 text-gray-400'}`}
                            >
                                {p.name}
                            </button>
                        ))}
                    </div>

                    {/* Colors */}
                    <div className="flex flex-wrap justify-center gap-4 px-4">
                        {FRAME_COLORS.map(c => (
                            <button 
                                key={c.name}
                                onClick={() => { setFrameColor(c.value); playSound('pop'); triggerHaptic('selection'); }}
                                className={`w-10 h-10 rounded-full border-[3px] shadow-sm transition-transform btn-bouncy ${frameColor === c.value ? 'border-gray-800 scale-110' : 'border-gray-200'}`}
                                style={{ backgroundColor: c.value }}
                                title={c.name}
                            />
                        ))}
                    </div>

                    <div className="flex justify-center gap-4 border-t border-gray-100 pt-4">
                        <button 
                            onClick={() => { setShowWatermark(!showWatermark); triggerHaptic('light'); }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all btn-bouncy ${showWatermark ? 'border-gray-800 bg-gray-50 text-gray-900' : 'border-gray-100 text-gray-400'}`}
                        >
                            Watermark
                        </button>
                        <button 
                            onClick={() => { setShowDate(!showDate); triggerHaptic('light'); }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all btn-bouncy ${showDate ? 'border-gray-800 bg-gray-50 text-gray-900' : 'border-gray-100 text-gray-400'}`}
                        >
                            Date
                        </button>
                     </div>
                </div>
            )}

            {/* 6. ITEMS TAB (Renamed from TUNE) */}
            {activeTab === 'items' && (
                <div className="flex flex-col gap-4 animate-fade-enter h-full justify-center">
                    {activeLayer ? (
                         <div className="space-y-6">
                            <p className="text-center text-xs font-bold text-blue-500 uppercase tracking-widest">Editing Selected Item</p>
                            <div className="flex items-center gap-4">
                                <Move size={16} className="text-gray-400" />
                                <input 
                                    type="range" min="0.5" max="3" step="0.1" value={activeLayer.scale} 
                                    onChange={(e) => updateLayerProp('scale', Number(e.target.value))}
                                    className="flex-1 h-1.5 bg-blue-100 rounded-full appearance-none cursor-pointer accent-blue-500"
                                />
                            </div>
                             <div className="flex items-center gap-4">
                                <RotateCw size={16} className="text-gray-400" />
                                <input 
                                    type="range" min="-180" max="180" value={activeLayer.rotation} 
                                    onChange={(e) => updateLayerProp('rotation', Number(e.target.value))}
                                    className="flex-1 h-1.5 bg-blue-100 rounded-full appearance-none cursor-pointer accent-blue-500"
                                />
                            </div>
                            <button 
                                onClick={deleteSelectedLayer}
                                className="w-full py-3 bg-red-50 text-red-500 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
                            >
                                <Trash2 size={16} /> Remove Item
                            </button>
                         </div>
                    ) : (
                        <div className="space-y-6 flex flex-col items-center justify-center text-gray-400 h-full">
                            <p className="text-sm">Select a sticker or text to edit it.</p>
                             <button 
                                onClick={() => { onDelete(); playSound('delete'); }}
                                className="mt-8 w-full py-3 border border-gray-200 text-gray-400 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-gray-50"
                            >
                                <Trash2 size={16} /> Delete Photo
                            </button>
                        </div>
                    )}
                </div>
            )}

        </div>
      </div>
    </div>
  );
};
