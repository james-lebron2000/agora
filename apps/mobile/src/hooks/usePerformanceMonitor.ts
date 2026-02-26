/**
 * Performance Monitor Hook
 * Real-time FPS and performance metrics monitoring
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { InteractionManager } from 'react-native';

interface PerformanceMetrics {
  fps: number;
  jsThreadTime: number;
  frameTime: number;
  droppedFrames: number;
  memoryUsage?: number;
}

interface PerformanceReport {
  averageFps: number;
  minFps: number;
  maxFps: number;
  droppedFrameCount: number;
  jsThreadBlockTime: number;
  timestamp: number;
}

export function usePerformanceMonitor(enabled: boolean = true) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    jsThreadTime: 0,
    frameTime: 16.67,
    droppedFrames: 0,
  });
  
  const [isMonitoring, setIsMonitoring] = useState(false);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const droppedFramesRef = useRef(0);
  const metricsHistoryRef = useRef<PerformanceMetrics[]>([]);
  const rafIdRef = useRef<number>();

  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;
    setIsMonitoring(true);
    
    const measureFrame = () => {
      const now = performance.now();
      const delta = now - lastTimeRef.current;
      
      if (delta >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / delta);
        const frameTime = delta / frameCountRef.current;
        const dropped = Math.max(0, Math.round((1000 / 60 - frameTime) / (1000 / 60) * frameCountRef.current));
        
        droppedFramesRef.current += dropped;
        
        const newMetrics: PerformanceMetrics = {
          fps: Math.min(60, fps),
          jsThreadTime: delta,
          frameTime,
          droppedFrames: droppedFramesRef.current,
        };
        
        setMetrics(newMetrics);
        metricsHistoryRef.current.push(newMetrics);
        
        // Keep only last 60 seconds
        if (metricsHistoryRef.current.length > 60) {
          metricsHistoryRef.current.shift();
        }
        
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }
      
      frameCountRef.current++;
      rafIdRef.current = requestAnimationFrame(measureFrame);
    };
    
    rafIdRef.current = requestAnimationFrame(measureFrame);
  }, [isMonitoring]);

  const stopMonitoring = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
    setIsMonitoring(false);
  }, []);

  const generateReport = useCallback((): PerformanceReport => {
    const history = metricsHistoryRef.current;
    if (history.length === 0) {
      return {
        averageFps: 60,
        minFps: 60,
        maxFps: 60,
        droppedFrameCount: 0,
        jsThreadBlockTime: 0,
        timestamp: Date.now(),
      };
    }
    
    const fpsValues = history.map(m => m.fps);
    return {
      averageFps: Math.round(fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length),
      minFps: Math.min(...fpsValues),
      maxFps: Math.max(...fpsValues),
      droppedFrameCount: droppedFramesRef.current,
      jsThreadBlockTime: Math.max(...history.map(m => m.jsThreadTime)),
      timestamp: Date.now(),
    };
  }, []);

  const reset = useCallback(() => {
    droppedFramesRef.current = 0;
    metricsHistoryRef.current = [];
    frameCountRef.current = 0;
    lastTimeRef.current = performance.now();
  }, []);

  useEffect(() => {
    if (enabled) {
      startMonitoring();
    } else {
      stopMonitoring();
    }
    
    return () => {
      stopMonitoring();
    };
  }, [enabled, startMonitoring, stopMonitoring]);

  return {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    generateReport,
    reset,
  };
}

export default usePerformanceMonitor;
