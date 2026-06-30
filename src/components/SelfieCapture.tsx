"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, X, RefreshCcw, Check } from "lucide-react";

interface SelfieCaptureProps {
  onCapture: (dataUri: string) => void;
  onCancel: () => void;
}

export function SelfieCapture({ onCapture, onCancel }: SelfieCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setIsInitializing(true);
    setError(null);
    setCapturedImage(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user" },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setError("Unable to access camera. Please check permissions.");
    } finally {
      setIsInitializing(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current frame to canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Mirror the image since it's a front-facing camera
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Compress to JPEG
    const dataUri = canvas.toDataURL('image/jpeg', 0.7);
    setCapturedImage(dataUri);
    stopCamera();
  };

  const confirmPhoto = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  const retakePhoto = () => {
    startCamera();
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '1rem', background: '#000', color: '#fff', border: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>Take a Selfie</h3>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>
        
        <div style={{ position: 'relative', width: '100%', aspectRatio: '3/4', backgroundColor: '#222', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: '1rem' }}>
          {isInitializing && !capturedImage && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
              Initializing camera...
            </div>
          )}
          
          {error && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', padding: '1rem' }}>
              <p style={{ color: 'var(--danger-color)' }}>{error}</p>
              <button className="btn btn-secondary" onClick={startCamera}>Retry</button>
            </div>
          )}
          
          {!capturedImage && !error && (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} 
            />
          )}
          
          {capturedImage && (
            <img 
              src={capturedImage} 
              alt="Captured selfie" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          )}
          
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          {!capturedImage ? (
            <button 
              className="btn btn-primary" 
              onClick={capturePhoto} 
              disabled={!!error || isInitializing}
              style={{ padding: '0.75rem 2rem', borderRadius: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Camera size={20} /> Capture
            </button>
          ) : (
            <>
              <button 
                className="btn btn-secondary" 
                onClick={retakePhoto}
                style={{ padding: '0.75rem 1.5rem', borderRadius: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <RefreshCcw size={20} /> Retake
              </button>
              <button 
                className="btn btn-success" 
                onClick={confirmPhoto}
                style={{ padding: '0.75rem 1.5rem', borderRadius: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Check size={20} /> Use Photo
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
