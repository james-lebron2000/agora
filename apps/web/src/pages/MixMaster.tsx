import { useState, useRef } from 'react';
import { Button } from '../components/button';
import { Card } from '../components/card';

export function MixMaster() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('audio/'));
    setFiles(prev => [...prev, ...droppedFiles].slice(0, 2));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).slice(0, 2);
      setFiles(selectedFiles);
    }
  };

  const handleSeparate = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    // API call would go here
    setTimeout(() => {
      setResult('stems');
      setProcessing(false);
    }, 2000);
  };

  const handleMix = async () => {
    if (files.length < 2) return;
    setProcessing(true);
    setTimeout(() => {
      setResult('mix');
      setProcessing(false);
    }, 3000);
  };

  const clearFiles = () => {
    setFiles([]);
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 mb-4 text-3xl">🎛️</div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">MixMaster</h1>
          <p className="text-slate-400 mt-2">AI-Powered Audio Mixing & Stem Separation</p>
        </div>

        {/* Upload Zone */}
        <Card 
          className="p-12 border-2 border-dashed border-purple-500/30 bg-slate-900/50 backdrop-blur-sm hover:border-purple-500/50 transition-all cursor-pointer"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            ref={fileInputRef}
            type="file" 
            accept="audio/*" 
            multiple 
            className="hidden" 
            onChange={handleFileSelect}
          />
          
          <div className="text-center">
            <div className="text-5xl mb-4">🎵</div>
            <h3 className="text-xl font-semibold mb-2">Drop Audio Files Here</h3>
            <p className="text-slate-400">or click to select (MP3, WAV, FLAC)</p>
            <p className="text-sm text-purple-400 mt-2">Max 2 files for mixing</p>
          </div>
        </Card>

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-8 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Loaded Tracks ({files.length}/2)</h3>
              <Button variant="ghost" size="sm" onClick={clearFiles}>Clear All</Button>
            </div>
            
            {files.map((file, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center font-bold">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <div className="h-2 w-24 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full w-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        {files.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              onClick={handleSeparate}
              loading={processing && !result}
              disabled={processing}
            >
              🎚️ Separate Stems (Demucs)
            </Button>
            
            <Button 
              size="lg"
              className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700"
              onClick={handleMix}
              loading={processing && !result}
              disabled={files.length < 2 || processing}
            >
              🎛️ Auto-Mix Tracks
            </Button>
          </div>
        )}

        {/* Processing State */}
        {processing && (
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-slate-800/50 rounded-full">
              <div className="h-5 w-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-purple-400">AI is analyzing audio...</span>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="mt-8">
            <Card className="p-6 bg-gradient-to-br from-green-900/30 to-emerald-900/30 border-green-500/30">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center text-2xl">✅</div>
                <div>
                  <h3 className="text-lg font-semibold text-green-400">
                    {result === 'stems' ? 'Stems Separated!' : 'Mix Complete!'}
                  </h3>
                  <p className="text-slate-400">Download your files below</p>
                </div>
              </div>
              
              <div className="space-y-2">
                {result === 'stems' ? (
                  ['Vocals', 'Drums', 'Bass', 'Other', 'Piano'].map(stem => (
                    <div key={stem} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-purple-500" />
                        {stem}.wav
                      </span>
                      <Button size="sm" variant="outline">Download</Button>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-pink-500" />
                      Mixed_Track.mp3
                    </span>
                    <Button size="sm" variant="outline">Download</Button>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Features */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6">
            <div className="text-3xl mb-3">🎚️</div>
            <h4 className="font-semibold mb-2">Stem Separation</h4>
            <p className="text-sm text-slate-400">Powered by Meta's Demucs AI. Separate vocals, drums, bass, and more.</p>
          </div>
          <div className="text-center p-6">
            <div className="text-3xl mb-3">🎛️</div>
            <h4 className="font-semibold mb-2">Auto-Mixing</h4>
            <p className="text-sm text-slate-400">AI selects optimal transition points and applies professional crossfades.</p>
          </div>
          <div className="text-center p-6">
            <div className="text-3xl mb-3">📢</div>
            <h4 className="font-semibold mb-2">Smart Mastering</h4>
            <p className="text-sm text-slate-400">Automatic loudness normalization and EQ optimization for streaming.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MixMaster;
