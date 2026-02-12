
import React, { useState, useEffect, useRef } from 'react';
import { Camera, Image as ImageIcon, Menu, Upload } from 'lucide-react';
import { ThemeProvider, useTheme } from './components/ThemeContext';
import { Intro } from './components/Intro';
import { CameraBooth } from './components/CameraBooth';
import { Editor } from './components/Editor';
import { Sidebar } from './components/Sidebar';
import { ViewState, Photo } from './types';
import { v4 as uuidv4 } from 'uuid';
import { playSound } from './utils/audio';
import { triggerHaptic } from './utils/haptics';

const MainContent: React.FC = () => {
  const { colors } = useTheme();
  const [view, setView] = useState<ViewState>(ViewState.Intro);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('pookieboth_photos');
    if (saved) {
      try {
        setPhotos(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load local photos", e);
      }
    }
  }, []);

  const handleCapture = (photo: Photo) => {
    setPhotos(prev => [photo, ...prev]);
    localStorage.setItem('pookieboth_photos', JSON.stringify([photo, ...photos]));
    setSelectedPhoto(photo);
    setView(ViewState.Editor);
  };

  const handleUpdatePhoto = (updated: Photo) => {
    const newPhotos = photos.map(p => p.id === updated.id ? updated : p);
    setPhotos(newPhotos);
    localStorage.setItem('pookieboth_photos', JSON.stringify(newPhotos));
    setView(ViewState.Gallery);
    setSelectedPhoto(null);
  };

  const handleDeletePhoto = () => {
    if (selectedPhoto) {
        const newPhotos = photos.filter(p => p.id !== selectedPhoto.id);
        setPhotos(newPhotos);
        localStorage.setItem('pookieboth_photos', JSON.stringify(newPhotos));
        setSelectedPhoto(null);
        setView(ViewState.Gallery);
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
              const result = e.target?.result as string;
              const img = new Image();
              img.onload = () => {
                   const newPhoto: Photo = {
                      id: uuidv4(),
                      uri: result,
                      originalImages: [result],
                      timestamp: Date.now(),
                      layout: 'single',
                      width: img.width,
                      height: img.height,
                  };
                  handleCapture(newPhoto);
              };
              img.src = result;
          };
          reader.readAsDataURL(file);
      }
  };

  // View Routing Logic
  if (view === ViewState.Intro) {
    return <Intro onComplete={() => setView(ViewState.Home)} />;
  }

  if (view === ViewState.Booth) {
    return <CameraBooth onCapture={handleCapture} onBack={() => setView(ViewState.Home)} />;
  }

  if (view === ViewState.Editor && selectedPhoto) {
    return <Editor photo={selectedPhoto} onSave={handleUpdatePhoto} onDiscard={() => setView(ViewState.Gallery)} onDelete={handleDeletePhoto} />;
  }

  return (
    <div className={`h-full w-full flex flex-col relative overflow-hidden ${colors.bg} ${colors.text} transition-colors duration-500`}>
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        onNavigate={setView} 
      />
      
      <input type="file" ref={fileInputRef} onChange={handleImport} accept="image/*" className="hidden" />
      
      {/* Top Bar */}
      <div className="h-16 flex items-center justify-between px-6 z-10 animate-fade-enter">
        <button onClick={() => { setIsSidebarOpen(true); triggerHaptic('light'); }} className="p-2 -ml-2 rounded-full hover:bg-white/50 transition btn-bouncy">
          <Menu size={24} strokeWidth={2.5} />
        </button>
        <span className="font-bold text-xl tracking-tight font-serif italic">PookieBoth</span>
        <div className="w-8"></div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
        {view === ViewState.Home && (
            <div className="flex flex-col h-full items-center justify-center p-6 gap-8 pb-24 animate-fade-enter">
                <div className={`p-8 ${colors.card} rounded-[2.5rem] shadow-xl shadow-purple-100/50 w-full max-w-sm flex flex-col items-center justify-center text-center gap-6 border border-white/50 relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-transparent to-pink-100/50 rounded-bl-[100px] pointer-events-none"></div>
                    
                    <div className="w-28 h-28 bg-gray-50 rounded-[2rem] flex items-center justify-center mb-2 relative shadow-inner animate-float">
                         <div className="absolute inset-0 bg-gradient-to-tr from-pink-200 to-blue-200 rounded-[2rem] opacity-30"></div>
                         <Camera size={48} className="text-gray-400 relative z-10" strokeWidth={1.5} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold mb-2">Ready, Set, Pose!</h2>
                        <p className="text-gray-400 text-sm leading-relaxed px-4">Create beautiful, soft aesthetic memories with our cute booth.</p>
                    </div>
                    <div className="w-full flex flex-col gap-3">
                        <button 
                            onClick={() => { setView(ViewState.Booth); playSound('pop'); triggerHaptic('medium'); }}
                            className={`w-full py-4 rounded-2xl ${colors.accent} ${colors.accentText} font-bold text-lg shadow-lg shadow-pink-200 hover:brightness-95 transition-all btn-bouncy`}
                        >
                            Start Booth
                        </button>
                        <button 
                            onClick={() => { fileInputRef.current?.click(); triggerHaptic('light'); }}
                            className="w-full py-3 rounded-2xl bg-gray-50 text-gray-500 font-semibold text-sm hover:bg-gray-100 transition-all flex items-center justify-center gap-2 btn-bouncy"
                        >
                            <Upload size={16} /> Import Photo
                        </button>
                    </div>
                </div>
            </div>
        )}

        {view === ViewState.Gallery && (
            <div className="p-4 pb-28 animate-fade-enter">
                <div className="flex items-center justify-between mb-6 px-2">
                    <h2 className="text-2xl font-bold font-serif italic">Your Gallery</h2>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{photos.length} Photos</span>
                </div>
                
                {photos.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ImageIcon size={32} className="opacity-50" />
                        </div>
                        <p>No photos yet.</p>
                        <button onClick={() => setView(ViewState.Booth)} className="mt-4 text-sm font-semibold text-pink-500 hover:underline">Take one now</button>
                    </div>
                ) : (
                    <div className="columns-2 gap-4 space-y-4">
                        {photos.map(photo => (
                            <div 
                                key={photo.id} 
                                onClick={() => { setSelectedPhoto(photo); setView(ViewState.Editor); triggerHaptic('light'); }}
                                className="break-inside-avoid bg-white rounded-2xl overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-all btn-bouncy relative group"
                            >
                                <img src={photo.uri} alt="Memory" className="w-full h-auto object-cover" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}
      </div>

      {/* Floating Bottom Nav */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4 z-20">
         <div className="glass-panel rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-2 flex gap-2">
            <button 
                onClick={() => { setView(ViewState.Home); triggerHaptic('light'); }}
                className={`p-4 rounded-full transition-all duration-300 btn-bouncy ${view === ViewState.Home ? `${colors.accent} ${colors.accentText} shadow-md` : 'hover:bg-gray-100 text-gray-400'}`}
            >
                <Camera size={24} />
            </button>
            <button 
                onClick={() => { setView(ViewState.Gallery); triggerHaptic('light'); }}
                className={`p-4 rounded-full transition-all duration-300 btn-bouncy ${view === ViewState.Gallery ? `${colors.accent} ${colors.accentText} shadow-md` : 'hover:bg-gray-100 text-gray-400'}`}
            >
                <ImageIcon size={24} />
            </button>
         </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
        <MainContent />
    </ThemeProvider>
  );
};

export default App;
