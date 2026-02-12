
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { RefreshCw, Grid, Zap, X, ImagePlus, AlertCircle, Loader2, Camera as CameraIcon } from 'lucide-react';
import { useTheme } from './ThemeContext';
import { Photo } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { playSound } from '../utils/audio';
import { triggerHaptic } from '../utils/haptics';

interface CameraBoothProps {
  onCapture: (photo: Photo) => void;
  onBack: () => void;
}

export const CameraBooth: React.FC<CameraBoothProps> = ({ onCapture, onBack }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { colors } = useTheme();
  
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [mode, setMode] = useState<'single' | 'booth'>('booth');
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isCapturingSequence, setIsCapturingSequence] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  // Robust stream cleanup
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          console.warn("Error stopping track", e);
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopStream();
    setCameraError(null);
    setTorchSupported(false);
    setFlash(false);

    // Give hardware a moment to release
    await new Promise(resolve => setTimeout(resolve, 300));

    if (!window.isSecureContext) {
      setCameraError("Camera requires HTTPS.");
      return;
    }

    try {
      let newStream: MediaStream | null = null;
      
      // Strategy 1: Ideal 1080p with STRICT facing mode
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
            video: { 
              facingMode: { exact: facingMode }, // Use exact to prevent flipping
              width: { ideal: 1920 }, 
              height: { ideal: 1080 } 
            },
            audio: false
        });
      } catch (e) {
        console.warn("HQ Camera exact facing mode failed, relaxing resolution...", e);
        
        // Strategy 2: Standard resolution with STRICT facing mode
        try {
             newStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { exact: facingMode } },
                audio: false
            });
        } catch (e2) {
            console.warn("Exact facing mode failed, trying preferred facing mode...", e2);
            
            // Strategy 3: Preferred facing mode (might fallback to wrong camera, but better than nothing)
            try {
                newStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: facingMode },
                    audio: false
                });
            } catch (e3) {
                 console.warn("Preferred facing mode failed, trying any video...", e3);

                 // Strategy 4: Hail Mary
                 try {
                     newStream = await navigator.mediaDevices.getUserMedia({
                         video: true,
                         audio: false
                     });
                 } catch (e4) {
                     throw new Error("Could not start video source");
                 }
            }
        }
      }
      
      if (!newStream) throw new Error("No video stream returned");

      streamRef.current = newStream;

      // Check Torch
      try {
          const track = newStream.getVideoTracks()[0];
          const capabilities = (track.getCapabilities && track.getCapabilities()) || {};
          // @ts-ignore
          if (capabilities.torch) setTorchSupported(true);
      } catch (e) {
          console.warn("Could not check torch capabilities", e);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        // Wait for data before playing
        videoRef.current.onloadedmetadata = async () => {
            try {
                await videoRef.current?.play();
                setIsStreaming(true);
            } catch (playError) {
                console.error("Play error:", playError);
            }
        };
      }
    } catch (err: any) {
      console.error("Camera start error:", err);
      let msg = "Unable to access camera.";
      
      if (err.name === 'NotAllowedError') msg = "Camera permission denied.";
      if (err.name === 'NotReadableError') msg = "Camera is busy. Try closing other apps.";
      if (err.name === 'OverconstrainedError') msg = "Camera matching settings not found.";
      if (err.message && err.message.includes("Could not start video source")) msg = "Hardware locked. Please restart device.";
      
      setCameraError(msg);
    }
  }, [facingMode, stopStream]);

  // Initial load
  useEffect(() => {
    startCamera();
    return () => stopStream();
  }, [startCamera, stopStream]);

  // Handle Torch Toggling
  useEffect(() => {
    const applyTorch = async () => {
        const stream = streamRef.current;
        if (!stream || !torchSupported) return;
        
        const track = stream.getVideoTracks()[0];
        if (!track) return;

        try {
            // @ts-ignore
            await track.applyConstraints({ advanced: [{ torch: flash }] });
        } catch (e) {
            console.warn('Torch apply failed', e);
        }
    };
    applyTorch();
  }, [flash, torchSupported]); 

  // Auto-capture logic for booth mode
  useEffect(() => {
    if (isCapturingSequence && capturedImages.length < 4) {
        startCountdown();
    } else if (isCapturingSequence && capturedImages.length === 4) {
        finishSession();
    }
  }, [capturedImages.length, isCapturingSequence]);

  const startCountdown = () => {
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev === 1) {
          clearInterval(interval);
          captureFrame();
          return null;
        }
        if (prev) {
            playSound('pop');
            triggerHaptic('light');
        }
        return prev ? prev - 1 : null;
      });
    }, 1000);
    playSound('pop');
    triggerHaptic('light');
  };

  const startCapture = () => {
    if (!isStreaming) {
      startCamera(); 
      return;
    }
    triggerHaptic('medium');
    playSound('click');
    if (mode === 'single') {
        startCountdown();
    } else {
        setCapturedImages([]);
        setIsCapturingSequence(true);
    }
  };

  const captureFrame = () => {
    playSound('shutter');
    triggerHaptic('heavy');
    
    // Screen Flash Logic (Software Flash)
    if (flash && (!torchSupported || facingMode === 'user')) {
      const flashEl = document.createElement('div');
      flashEl.style.position = 'fixed';
      flashEl.style.inset = '0';
      flashEl.style.backgroundColor = 'white';
      flashEl.style.zIndex = '9999';
      flashEl.style.transition = 'opacity 400ms ease-out';
      flashEl.style.opacity = '1';
      document.body.appendChild(flashEl);
      
      void flashEl.offsetWidth; // Force reflow
      
      requestAnimationFrame(() => {
          flashEl.style.opacity = '0';
          setTimeout(() => document.body.removeChild(flashEl), 400);
      });
    }

    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // MIRRORING LOGIC: Only mirror if it's the USER camera
        if (facingMode === 'user') {
          context.translate(canvas.width, 0);
          context.scale(-1, 1);
        }
        
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        
        if (mode === 'single') {
             finishSingleCapture(dataUrl, canvas.width, canvas.height);
        } else {
            setCapturedImages(prev => [...prev, dataUrl]);
        }
      }
    }
  };

  const finishSingleCapture = (uri: string, width: number, height: number) => {
    const newPhoto: Photo = {
      id: uuidv4(),
      uri: uri,
      originalImages: [uri],
      timestamp: Date.now(),
      layout: 'single',
      width: width,
      height: height
    };
    onCapture(newPhoto);
  };

  const finishSession = () => {
      setIsCapturingSequence(false);
      playSound('success');
      triggerHaptic('success');
      const newPhoto: Photo = {
          id: uuidv4(),
          uri: capturedImages[0], 
          originalImages: capturedImages,
          timestamp: Date.now(),
          layout: 'strip4',
          width: 1080, 
          height: 1920 
      };
      onCapture(newPhoto);
  };

  const toggleCamera = () => {
    triggerHaptic('selection');
    // Simple state toggle is enough, startCamera will pick it up
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleImportClick = () => {
      triggerHaptic('selection');
      fileInputRef.current?.click();
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
              const result = e.target?.result as string;
              const img = new Image();
              img.onload = () => {
                   finishSingleCapture(result, img.width, img.height);
              };
              img.src = result;
          };
          reader.readAsDataURL(file);
      }
  };

  return (
    <div className="relative h-full w-full bg-black flex flex-col">
      <input type="file" ref={fileInputRef} onChange={handleFileImport} accept="image/*" className="hidden" />

      {/* Top Controls */}
      <div className="absolute top-0 left-0 right-0 z-20 p-6 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
        <button onClick={() => { triggerHaptic('selection'); onBack(); }} className="p-3 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition btn-bouncy">
          <X size={24} />
        </button>
        
        {!isCapturingSequence && isStreaming && (
            <div className="glass-panel rounded-full p-1.5 flex gap-1">
                <button 
                    onClick={() => { setMode('single'); triggerHaptic('selection'); }} 
                    className={`px-5 py-2 rounded-full text-xs font-bold transition-all duration-300 ${mode === 'single' ? 'bg-white text-black shadow-sm' : 'text-white/70 hover:text-white'}`}
                >
                    Single
                </button>
                <button 
                    onClick={() => { setMode('booth'); triggerHaptic('selection'); }} 
                    className={`px-5 py-2 rounded-full text-xs font-bold transition-all duration-300 ${mode === 'booth' ? 'bg-white text-black shadow-sm' : 'text-white/70 hover:text-white'}`}
                >
                    Booth
                </button>
            </div>
        )}

        <div className="flex gap-4">
          <button onClick={() => { setFlash(!flash); triggerHaptic('selection'); }} className={`p-3 rounded-full backdrop-blur-md transition btn-bouncy ${flash ? 'bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.5)]' : 'bg-white/10 text-white'}`}>
            <Zap size={20} fill={flash ? "currentColor" : "none"} />
          </button>
          <button onClick={() => { setShowGrid(!showGrid); triggerHaptic('selection'); }} className={`p-3 rounded-full backdrop-blur-md transition btn-bouncy ${showGrid ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>
            <Grid size={20} />
          </button>
        </div>
      </div>

      {/* Camera Viewport */}
      <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center rounded-b-[2.5rem] rounded-t-[2.5rem] mx-2 my-2 mask-camera shadow-2xl">
        
        {(!isStreaming || cameraError) && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-900 text-white p-8 text-center animate-fade-enter">
                {cameraError ? (
                    <>
                        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 mb-4 animate-pop">
                            <AlertCircle size={32} />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Camera Issue</h3>
                        <p className="text-gray-400 mb-6 max-w-xs">{cameraError}</p>
                        <button 
                            onClick={startCamera}
                            className={`px-8 py-3 rounded-xl ${colors.accent} ${colors.accentText} font-bold hover:brightness-110 transition-all flex items-center gap-2 btn-bouncy`}
                        >
                            <CameraIcon size={20} /> Retry
                        </button>
                    </>
                ) : (
                   <div className="flex flex-col items-center">
                     <Loader2 size={48} className="animate-spin text-white/30 mb-4" />
                     <p className="text-white/50 text-sm">Initializing...</p>
                   </div>
                )}
            </div>
        )}
        
        {/* VIDEO ELEMENT: Only mirror (scale-x-[-1]) if facingMode is USER */}
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted
          className={`h-full w-full object-cover transition-transform duration-500 ${facingMode === 'user' ? 'scale-x-[-1]' : ''} ${!isStreaming ? 'opacity-0' : 'opacity-100'}`}
        />
        <canvas ref={canvasRef} className="hidden" />
        
        {isStreaming && (
            <>
                {showGrid && (
                  <div className="absolute inset-0 z-10 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-50 animate-fade-enter">
                    <div className="border-r border-b border-white/30"></div>
                    <div className="border-r border-b border-white/30"></div>
                    <div className="border-b border-white/30"></div>
                    <div className="border-r border-b border-white/30"></div>
                    <div className="border-r border-b border-white/30"></div>
                    <div className="border-b border-white/30"></div>
                    <div className="border-r border-white/30"></div>
                    <div className="border-r border-white/30"></div>
                    <div></div>
                  </div>
                )}

                {countdown && (
                  <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/20 backdrop-blur-sm">
                    <span className="text-white text-[10rem] font-bold animate-pop drop-shadow-2xl">
                      {countdown}
                    </span>
                  </div>
                )}

                {mode === 'booth' && isCapturingSequence && (
                    <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4 z-30">
                        {[0, 1, 2, 3].map(i => (
                            <div 
                                key={i} 
                                className={`w-4 h-4 rounded-full transition-all duration-300 shadow-lg border border-black/10 ${i < capturedImages.length ? 'bg-white scale-125' : 'bg-white/30'}`} 
                            />
                        ))}
                    </div>
                )}
            </>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="h-36 bg-black flex items-center justify-around px-8 pb-6 relative z-40">
        <button 
             onClick={handleImportClick}
             disabled={isCapturingSequence}
             className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition btn-bouncy disabled:opacity-30 disabled:scale-100"
        >
             <ImagePlus size={26} />
        </button>
        
        <button 
          onClick={startCapture}
          disabled={isCapturingSequence || (!isStreaming && !cameraError)}
          className={`relative w-24 h-24 rounded-full border-[6px] border-white/20 flex items-center justify-center transition-all ${isCapturingSequence ? 'opacity-50 cursor-not-allowed' : 'btn-bouncy hover:scale-105 active:scale-95'}`}
        >
          <div className={`w-20 h-20 rounded-full bg-white transition-all duration-200 shadow-[0_0_20px_rgba(255,255,255,0.4)] ${countdown ? 'scale-90 opacity-90' : 'scale-100'}`}></div>
        </button>

        <button 
          onClick={toggleCamera}
          disabled={isCapturingSequence || !isStreaming}
          className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition btn-bouncy disabled:opacity-30 disabled:scale-100"
        >
          <RefreshCw size={26} />
        </button>
      </div>
    </div>
  );
};
