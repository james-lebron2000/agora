import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';

// ============================================================================
// TYPES
// ============================================================================

export interface LazyImageProps {
  /** Image source URL */
  src: string;
  /** Alt text for accessibility */
  alt: string;
  /** WebP version of the image (optional, for automatic WebP support) */
  webpSrc?: string;
  /** Low-quality image placeholder (LQIP) for blur-up effect */
  placeholderSrc?: string;
  /** CSS class names */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
  /** Aspect ratio (e.g., 16/9, 4/3) */
  aspectRatio?: string | number;
  /** Object fit style */
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  /** Object position */
  objectPosition?: string;
  /** Root margin for intersection observer */
  rootMargin?: string;
  /** Threshold for intersection observer */
  threshold?: number;
  /** Trigger loading immediately (eager loading) */
  eager?: boolean;
  /** Callback when image loads */
  onLoad?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Custom fallback component */
  fallbackComponent?: React.ReactNode;
  /** Enable blur placeholder effect */
  blurPlaceholder?: boolean;
  /** Duration of the fade-in animation (ms) */
  fadeDuration?: number;
  /** Sizes attribute for responsive images */
  sizes?: string;
  /** Srcset for responsive images */
  srcSet?: string;
  /** WebP srcset for responsive images */
  webpSrcSet?: string;
}

interface ImageState {
  isLoaded: boolean;
  isInView: boolean;
  hasError: boolean;
  supportsWebP: boolean | null;
}

// ============================================================================
// WEBP SUPPORT DETECTION
// ============================================================================

let webPSupportCache: boolean | null = null;

/**
 * Detect WebP support once and cache the result
 */
export function detectWebP(): Promise<boolean> {
  if (webPSupportCache !== null) {
    return Promise.resolve(webPSupportCache);
  }

  return new Promise((resolve) => {
    const webP = new Image();
    webP.onload = () => {
      webPSupportCache = true;
      resolve(true);
    };
    webP.onerror = () => {
      webPSupportCache = false;
      resolve(false);
    };
    // Test with a small WebP data URI
    webP.src = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a tiny blur hash placeholder (base64 encoded)
 */
function generatePlaceholder(width: number = 40, height: number = 30): string {
  // Create a simple gradient-like SVG as placeholder
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#e5e7eb"/>
        <stop offset="100%" style="stop-color:#d1d5db"/>
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#g)"/>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Check if URL is a valid image URL
 */
function isValidImageUrl(url: string): boolean {
  return typeof url === 'string' && url.length > 0;
}

// ============================================================================
// LAZY IMAGE COMPONENT
// ============================================================================

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  webpSrc,
  placeholderSrc,
  className = '',
  style = {},
  aspectRatio,
  objectFit = 'cover',
  objectPosition = 'center',
  rootMargin = '50px 0px',
  threshold = 0,
  eager = false,
  onLoad,
  onError,
  fallbackComponent,
  blurPlaceholder = true,
  fadeDuration = 400,
  sizes,
  srcSet,
  webpSrcSet,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [state, setState] = useState<ImageState>({
    isLoaded: false,
    isInView: eager,
    hasError: false,
    supportsWebP: null,
  });

  // Detect WebP support on mount
  useEffect(() => {
    if (!webpSrc && !webpSrcSet) return;

    detectWebP().then((supported) => {
      setState((prev) => ({ ...prev, supportsWebP: supported }));
    });
  }, [webpSrc, webpSrcSet]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (eager || state.isInView) return;

    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState((prev) => ({ ...prev, isInView: true }));
          observer.disconnect();
        }
      },
      {
        root: null,
        rootMargin,
        threshold,
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [eager, rootMargin, threshold, state.isInView]);

  // Handle image load
  const handleLoad = useCallback(() => {
    setState((prev) => ({ ...prev, isLoaded: true }));
    onLoad?.();
  }, [onLoad]);

  // Handle image error
  const handleError = useCallback(() => {
    setState((prev) => ({ ...prev, hasError: true }));
    onError?.(new Error(`Failed to load image: ${src}`));
  }, [src, onError]);

  // Determine the best source based on WebP support
  const { currentSrc, currentSrcSet } = useMemo(() => {
    const supportsWebP = state.supportsWebP;
    
    // If we haven't detected WebP support yet, use original
    if (supportsWebP === null) {
      return { currentSrc: src, currentSrcSet: srcSet };
    }

    // If WebP is supported and we have a WebP source, use it
    if (supportsWebP && webpSrc) {
      return { currentSrc: webpSrc, currentSrcSet: webpSrcSet };
    }

    return { currentSrc: src, currentSrcSet: srcSet };
  }, [src, webpSrc, srcSet, webpSrcSet, state.supportsWebP]);

  // Generate a default placeholder if none provided
  const defaultPlaceholder = useMemo(() => {
    if (placeholderSrc) return placeholderSrc;
    if (!blurPlaceholder) return null;
    return generatePlaceholder();
  }, [placeholderSrc, blurPlaceholder]);

  // Container styles
  const containerStyle = useMemo<React.CSSProperties>(() => {
    const baseStyle: React.CSSProperties = {
      position: 'relative',
      overflow: 'hidden',
      ...style,
    };

    if (aspectRatio) {
      if (typeof aspectRatio === 'number') {
        baseStyle.aspectRatio = String(aspectRatio);
      } else {
        // Handle string format like "16/9"
        baseStyle.aspectRatio = aspectRatio;
      }
    }

    return baseStyle;
  }, [style, aspectRatio]);

  // Image styles
  const imageStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit,
    objectPosition,
  };

  // Render error state
  if (state.hasError) {
    if (fallbackComponent) {
      return (
        <div ref={containerRef} style={containerStyle} className={className}>
          {fallbackComponent}
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        style={containerStyle}
        className={`flex items-center justify-center bg-gray-100 ${className}`}
      >
        <svg
          className="w-12 h-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={containerStyle} className={className}>
      {/* Placeholder / Blur-up layer */}
      {defaultPlaceholder && !state.isLoaded && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: state.isLoaded ? 0 : 1 }}
          transition={{ duration: fadeDuration / 1000 }}
          className="absolute inset-0"
        >
          <img
            src={defaultPlaceholder}
            alt=""
            className="w-full h-full"
            style={{
              ...imageStyle,
              filter: 'blur(20px)',
              transform: 'scale(1.1)',
            }}
            aria-hidden="true"
          />
        </motion.div>
      )}

      {/* Main image */}
      {state.isInView && isValidImageUrl(currentSrc) && (
        <motion.picture
          initial={{ opacity: 0 }}
          animate={{ opacity: state.isLoaded ? 1 : 0 }}
          transition={{ duration: fadeDuration / 1000 }}
          className="absolute inset-0"
        >
          {/* WebP source - conditionally rendered */}
          {state.supportsWebP === true && webpSrcSet && (
            <source srcSet={webpSrcSet} sizes={sizes} type="image/webp" />
          )}
          {state.supportsWebP === true && webpSrc && !webpSrcSet && (
            <source srcSet={webpSrc} sizes={sizes} type="image/webp" />
          )}
          
          {/* Fallback JPEG/PNG source */}
          {srcSet && <source srcSet={srcSet} sizes={sizes} />}
          
          <img
            ref={imgRef}
            src={currentSrc}
            alt={alt}
            style={imageStyle}
            onLoad={handleLoad}
            onError={handleError}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
          />
        </motion.picture>
      )}

      {/* Skeleton loading state (when no placeholder) */}
      {!defaultPlaceholder && !state.isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse" />
      )}
    </div>
  );
};

// ============================================================================
// LAZY BACKGROUND IMAGE COMPONENT
// ============================================================================

export interface LazyBackgroundImageProps {
  /** Image source URL */
  src: string;
  /** WebP version */
  webpSrc?: string;
  /** Children to render inside */
  children: React.ReactNode;
  /** CSS class names */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
  /** Root margin for intersection observer */
  rootMargin?: string;
  /** Trigger loading immediately */
  eager?: boolean;
  /** Enable parallax effect */
  parallax?: boolean;
  /** Parallax speed (0-1) */
  parallaxSpeed?: number;
  /** Callback when image loads */
  onLoad?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

export const LazyBackgroundImage: React.FC<LazyBackgroundImageProps> = ({
  src,
  webpSrc,
  children,
  className = '',
  style = {},
  rootMargin = '50px 0px',
  eager = false,
  parallax = false,
  parallaxSpeed = 0.5,
  onLoad,
  onError,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(eager);
  const [isLoaded, setIsLoaded] = useState(false);
  const [supportsWebP, setSupportsWebP] = useState<boolean | null>(null);
  const [parallaxOffset, setParallaxOffset] = useState(0);

  // Detect WebP support
  useEffect(() => {
    if (!webpSrc) return;
    detectWebP().then(setSupportsWebP);
  }, [webpSrc]);

  // Intersection Observer
  useEffect(() => {
    if (eager || isInView) return;

    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [eager, rootMargin, isInView]);

  // Parallax scroll effect
  useEffect(() => {
    if (!parallax) return;

    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const scrolled = window.innerHeight - rect.top;
      if (scrolled > 0 && rect.bottom > 0) {
        setParallaxOffset(scrolled * parallaxSpeed * 0.1);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [parallax, parallaxSpeed]);

  // Preload image
  useEffect(() => {
    if (!isInView) return;

    const imageSrc = supportsWebP && webpSrc ? webpSrc : src;
    
    const img = new Image();
    img.onload = () => {
      setIsLoaded(true);
      onLoad?.();
    };
    img.onerror = () => onError?.(new Error(`Failed to load background image: ${imageSrc}`));
    img.src = imageSrc;
  }, [isInView, src, webpSrc, supportsWebP, onLoad, onError]);

  const backgroundImage = supportsWebP && webpSrc ? webpSrc : src;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        ...style,
        backgroundImage: isLoaded ? `url(${backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: `center ${parallax ? `${parallaxOffset}px` : 'center'}`,
        transition: parallax ? 'background-position 0.1s ease-out' : undefined,
      }}
    >
      {/* Loading skeleton */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse" />
      )}
      {children}
    </div>
  );
};

// ============================================================================
// PICTURE COMPONENT WITH ART DIRECTION
// ============================================================================

export interface PictureProps {
  /** Default image source */
  src: string;
  /** Alt text */
  alt: string;
  /** Sources for different conditions */
  sources: Array<{
    srcSet: string;
    media?: string;
    type?: string;
    sizes?: string;
  }>;
  /** Class names */
  className?: string;
  /** Styles */
  style?: React.CSSProperties;
  /** Object fit */
  objectFit?: React.CSSProperties['objectFit'];
  /** Lazy load */
  lazy?: boolean;
}

export const Picture: React.FC<PictureProps> = ({
  src,
  alt,
  sources,
  className = '',
  style = {},
  objectFit = 'cover',
  lazy = true,
}) => {
  return (
    <picture className={className} style={style}>
      {sources.map((source, index) => (
        <source
          key={index}
          srcSet={source.srcSet}
          media={source.media}
          type={source.type}
          sizes={source.sizes}
        />
      ))}
      <img
        src={src}
        alt={alt}
        loading={lazy ? 'lazy' : 'eager'}
        decoding="async"
        style={{ width: '100%', height: '100%', objectFit }}
      />
    </picture>
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export default LazyImage;
export { detectWebP, generatePlaceholder };
