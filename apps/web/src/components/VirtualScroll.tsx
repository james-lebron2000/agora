import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  itemHeight: number;
  overscan?: number;
  className?: string;
  style?: React.CSSProperties;
  onScroll?: (scrollTop: number) => void;
  onEndReached?: () => void;
  endReachedThreshold?: number;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  loadingComponent?: React.ReactNode;
  isLoading?: boolean;
  estimatedItemCount?: number;
  scrollToIndex?: number;
}

export interface VirtualGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  columnCount: number;
  itemHeight: number;
  gap?: number;
  overscan?: number;
  className?: string;
  style?: React.CSSProperties;
  onScroll?: (scrollTop: number) => void;
  onEndReached?: () => void;
  endReachedThreshold?: number;
}

export interface VirtualListRef {
  scrollToIndex: (index: number, behavior?: ScrollBehavior) => void;
  scrollToTop: (behavior?: ScrollBehavior) => void;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  getScrollPosition: () => number;
}

// ============================================================================
// VIRTUAL LIST COMPONENT
// ============================================================================

export const VirtualList = forwardRef<VirtualListRef, VirtualListProps<any>>(
  function VirtualList<T>(
    {
      items,
      renderItem,
      itemHeight,
      overscan = 3,
      className = '',
      style = {},
      onScroll,
      onEndReached,
      endReachedThreshold = 200,
      header,
      footer,
      emptyComponent,
      loadingComponent,
      isLoading = false,
      scrollToIndex,
    }: VirtualListProps<T>,
    ref: React.Ref<VirtualListRef>
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [containerHeight, setContainerHeight] = useState(0);

    // Calculate visible range
    const totalHeight = items.length * itemHeight;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + overscan * 2;
    const endIndex = Math.min(items.length, startIndex + visibleCount);

    // Visible items
    const visibleItems = useMemo(() => {
      return items.slice(startIndex, endIndex).map((item, index) => ({
        item,
        index: startIndex + index,
        style: {
          position: 'absolute' as const,
          top: (startIndex + index) * itemHeight,
          height: itemHeight,
          left: 0,
          right: 0,
        },
      }));
    }, [items, startIndex, endIndex, itemHeight]);

    // Handle scroll
    const handleScroll = useCallback(
      (e: React.UIEvent<HTMLDivElement>) => {
        const newScrollTop = e.currentTarget.scrollTop;
        setScrollTop(newScrollTop);
        onScroll?.(newScrollTop);

        // Check if end is reached
        if (onEndReached) {
          const scrollHeight = e.currentTarget.scrollHeight;
          const clientHeight = e.currentTarget.clientHeight;
          const scrollBottom = scrollHeight - newScrollTop - clientHeight;
          if (scrollBottom < endReachedThreshold) {
            onEndReached();
          }
        }
      },
      [onScroll, onEndReached, endReachedThreshold]
    );

    // Update container height on resize
    useEffect(() => {
      const updateHeight = () => {
        if (containerRef.current) {
          setContainerHeight(containerRef.current.clientHeight);
        }
      };

      updateHeight();
      window.addEventListener('resize', updateHeight);
      return () => window.removeEventListener('resize', updateHeight);
    }, []);

    // Expose imperative methods
    useImperativeHandle(
      ref,
      () => ({
        scrollToIndex: (index: number, behavior: ScrollBehavior = 'smooth') => {
          if (containerRef.current) {
            containerRef.current.scrollTo({
              top: index * itemHeight,
              behavior,
            });
          }
        },
        scrollToTop: (behavior: ScrollBehavior = 'smooth') => {
          if (containerRef.current) {
            containerRef.current.scrollTo({ top: 0, behavior });
          }
        },
        scrollToBottom: (behavior: ScrollBehavior = 'smooth') => {
          if (containerRef.current) {
            containerRef.current.scrollTo({
              top: totalHeight,
              behavior,
            });
          }
        },
        getScrollPosition: () => scrollTop,
      }),
      [itemHeight, totalHeight, scrollTop]
    );

    // Scroll to specific index on mount
    useEffect(() => {
      if (scrollToIndex !== undefined && containerRef.current) {
        containerRef.current.scrollTop = scrollToIndex * itemHeight;
      }
    }, [scrollToIndex, itemHeight]);

    if (items.length === 0 && !isLoading) {
      return (
        <div
          ref={containerRef}
          className={`overflow-auto ${className}`}
          style={{ ...style, height: style.height || '100%' }}
        >
          {header}
          {emptyComponent || (
            <div className="flex items-center justify-center h-full text-gray-500">
              No items to display
            </div>
          )}
          {footer}
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        className={`overflow-auto ${className}`}
        style={{ ...style, height: style.height || '100%' }}
        onScroll={handleScroll}
      >
        {header}
        <div style={{ height: totalHeight, position: 'relative' }}>
          {visibleItems.map(({ item, index, style: itemStyle }) => (
            <React.Fragment key={index}>
              {renderItem(item, index, itemStyle)}
            </React.Fragment>
          ))}
        </div>
        {isLoading && loadingComponent}
        {footer}
      </div>
    );
  }
);

// ============================================================================
// VIRTUAL GRID COMPONENT
// ============================================================================

export const VirtualGrid = forwardRef<VirtualListRef, VirtualGridProps<any>>(
  function VirtualGrid<T>(
    {
      items,
      renderItem,
      columnCount,
      itemHeight,
      gap = 0,
      overscan = 1,
      className = '',
      style = {},
      onScroll,
      onEndReached,
      endReachedThreshold = 200,
    }: VirtualGridProps<T>,
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [containerHeight, setContainerHeight] = useState(0);
    const [containerWidth, setContainerWidth] = useState(0);

    const rowCount = Math.ceil(items.length / columnCount);
    const totalHeight = rowCount * (itemHeight + gap);

    // Calculate visible range
    const startRow = Math.max(0, Math.floor(scrollTop / (itemHeight + gap)) - overscan);
    const visibleRowCount = Math.ceil(containerHeight / (itemHeight + gap)) + overscan * 2;
    const endRow = Math.min(rowCount, startRow + visibleRowCount);

    // Calculate item width
    const itemWidth = useMemo(() => {
      const totalGap = gap * (columnCount - 1);
      return (containerWidth - totalGap) / columnCount;
    }, [containerWidth, columnCount, gap]);

    // Visible items
    const visibleItems = useMemo(() => {
      const result: Array<{ item: T; index: number; style: React.CSSProperties }> = [];
      for (let row = startRow; row < endRow; row++) {
        for (let col = 0; col < columnCount; col++) {
          const index = row * columnCount + col;
          if (index >= items.length) break;
          result.push({
            item: items[index],
            index,
            style: {
              position: 'absolute' as const,
              top: row * (itemHeight + gap),
              left: col * (itemWidth + gap),
              width: itemWidth,
              height: itemHeight,
            },
          });
        }
      }
      return result;
    }, [items, startRow, endRow, columnCount, itemHeight, itemWidth, gap]);

    // Handle scroll
    const handleScroll = useCallback(
      (e: React.UIEvent<HTMLDivElement>) => {
        const newScrollTop = e.currentTarget.scrollTop;
        setScrollTop(newScrollTop);
        onScroll?.(newScrollTop);

        if (onEndReached) {
          const scrollHeight = e.currentTarget.scrollHeight;
          const clientHeight = e.currentTarget.clientHeight;
          const scrollBottom = scrollHeight - newScrollTop - clientHeight;
          if (scrollBottom < endReachedThreshold) {
            onEndReached();
          }
        }
      },
      [onScroll, onEndReached, endReachedThreshold]
    );

    // Update dimensions on resize
    useEffect(() => {
      const updateDimensions = () => {
        if (containerRef.current) {
          setContainerHeight(containerRef.current.clientHeight);
          setContainerWidth(containerRef.current.clientWidth);
        }
      };

      updateDimensions();
      window.addEventListener('resize', updateDimensions);
      return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // Expose imperative methods
    useImperativeHandle(
      ref,
      () => ({
        scrollToIndex: (index: number, behavior: ScrollBehavior = 'smooth') => {
          if (containerRef.current) {
            const row = Math.floor(index / columnCount);
            containerRef.current.scrollTo({
              top: row * (itemHeight + gap),
              behavior,
            });
          }
        },
        scrollToTop: (behavior: ScrollBehavior = 'smooth') => {
          if (containerRef.current) {
            containerRef.current.scrollTo({ top: 0, behavior });
          }
        },
        scrollToBottom: (behavior: ScrollBehavior = 'smooth') => {
          if (containerRef.current) {
            containerRef.current.scrollTo({
              top: totalHeight,
              behavior,
            });
          }
        },
        getScrollPosition: () => scrollTop,
      }),
      [columnCount, itemHeight, gap, totalHeight, scrollTop]
    );

    if (items.length === 0) {
      return (
        <div
          ref={containerRef}
          className={`overflow-auto ${className}`}
          style={{ ...style, height: style.height || '100%' }}
        >
          <div className="flex items-center justify-center h-full text-gray-500">
            No items to display
          </div>
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        className={`overflow-auto ${className}`}
        style={{ ...style, height: style.height || '100%' }}
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          {visibleItems.map(({ item, index }) => (
            <React.Fragment key={index}>
              {renderItem(item, index)}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }
);

// ============================================================================
// LAZY IMAGE COMPONENT
// ============================================================================

export interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  placeholderSrc?: string;
  fallbackSrc?: string;
  loading?: 'eager' | 'lazy';
  onLoad?: () => void;
  onError?: () => void;
  aspectRatio?: number;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  style = {},
  placeholderSrc,
  fallbackSrc,
  loading = 'lazy',
  onLoad,
  onError,
  aspectRatio,
  objectFit = 'cover',
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading === 'eager') {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px',
        threshold: 0,
      }
    );

    if (imageRef.current) {
      observer.observe(imageRef.current);
    }

    return () => observer.disconnect();
  }, [loading]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    onError?.();
  }, [onError]);

  const displaySrc = hasError && fallbackSrc ? fallbackSrc : src;

  return (
    <div
      ref={imageRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        ...style,
        aspectRatio: aspectRatio,
      }}
    >
      {/* Placeholder */}
      {!isLoaded && placeholderSrc && (
        <img
          src={placeholderSrc}
          alt=""
          className="absolute inset-0 w-full h-full blur-sm"
          style={{ objectFit }}
        />
      )}

      {/* Main image */}
      {isInView && (
        <motion.img
          src={displaySrc}
          alt={alt}
          className="absolute inset-0 w-full h-full"
          style={{ objectFit }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}

      {/* Loading skeleton */}
      {!isLoaded && !placeholderSrc && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}

      {/* Error state */}
      {hasError && !fallbackSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400">
          <svg
            className="w-8 h-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// WINDOW SCROLLER (for window-based virtual scrolling)
// ============================================================================

export interface WindowScrollerProps {
  children: (params: {
    scrollTop: number;
    isScrolling: boolean;
  }) => React.ReactNode;
  onScroll?: (scrollTop: number) => void;
  scrollElement?: HTMLElement | null;
}

export const WindowScroller: React.FC<WindowScrollerProps> = ({
  children,
  onScroll,
  scrollElement,
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | undefined>();

  useEffect(() => {
    const element = scrollElement || window;

    const handleScroll = () => {
      const newScrollTop = scrollElement
        ? scrollElement.scrollTop
        : window.scrollY;
      setScrollTop(newScrollTop);
      onScroll?.(newScrollTop);

      setIsScrolling(true);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    };

    element.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      element.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [scrollElement, onScroll]);

  return <>{children({ scrollTop, isScrolling })}</>;
};

// ============================================================================
// DYNAMIC ITEM HEIGHT LIST (for variable height items)
// ============================================================================

export interface DynamicVirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number, ref: (el: HTMLElement | null) => void) => React.ReactNode;
  estimateItemHeight: (item: T, index: number) => number;
  overscan?: number;
  className?: string;
  style?: React.CSSProperties;
  onScroll?: (scrollTop: number) => void;
}

export const DynamicVirtualList = forwardRef<VirtualListRef, DynamicVirtualListProps<any>>(
  function DynamicVirtualList<T>(
    {
      items,
      renderItem,
      estimateItemHeight,
      overscan = 3,
      className = '',
      style = {},
      onScroll,
    }: DynamicVirtualListProps<T>,
    ref: React.Ref<VirtualListRef>
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [containerHeight, setContainerHeight] = useState(0);
    const itemHeightsRef = useRef<Map<number, number>>(new Map());
    const itemPositionsRef = useRef<number[]>([]);

    // Calculate cumulative positions
    const calculatePositions = useCallback(() => {
      const positions: number[] = [];
      let currentPosition = 0;
      items.forEach((item, index) => {
        positions[index] = currentPosition;
        const height = itemHeightsRef.current.get(index) || estimateItemHeight(item, index);
        currentPosition += height;
      });
      itemPositionsRef.current = positions;
      return currentPosition;
    }, [items, estimateItemHeight]);

    const totalHeight = useMemo(() => calculatePositions(), [calculatePositions]);

    // Find visible range
    const { startIndex, endIndex } = useMemo(() => {
      const positions = itemPositionsRef.current;
      let start = 0;
      let end = items.length;

      // Binary search for start index
      let left = 0;
      let right = positions.length - 1;
      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (positions[mid] < scrollTop) {
          start = mid;
          left = mid + 1;
        } else {
          right = mid - 1;
        }
      }

      // Find end index
      end = start;
      while (end < positions.length && positions[end] < scrollTop + containerHeight) {
        end++;
      }

      return {
        startIndex: Math.max(0, start - overscan),
        endIndex: Math.min(items.length, end + overscan),
      };
    }, [scrollTop, containerHeight, items.length, overscan]);

    // Measure item height
    const measureItem = useCallback((index: number, element: HTMLElement | null) => {
      if (element) {
        const height = element.getBoundingClientRect().height;
        itemHeightsRef.current.set(index, height);
      }
    }, []);

    // Handle scroll
    const handleScroll = useCallback(
      (e: React.UIEvent<HTMLDivElement>) => {
        const newScrollTop = e.currentTarget.scrollTop;
        setScrollTop(newScrollTop);
        onScroll?.(newScrollTop);
      },
      [onScroll]
    );

    // Update container height on resize
    useEffect(() => {
      const updateHeight = () => {
        if (containerRef.current) {
          setContainerHeight(containerRef.current.clientHeight);
        }
      };

      updateHeight();
      window.addEventListener('resize', updateHeight);
      return () => window.removeEventListener('resize', updateHeight);
    }, []);

    // Expose imperative methods
    useImperativeHandle(
      ref,
      () => ({
        scrollToIndex: (index: number, behavior: ScrollBehavior = 'smooth') => {
          if (containerRef.current) {
            const position = itemPositionsRef.current[index] || 0;
            containerRef.current.scrollTo({ top: position, behavior });
          }
        },
        scrollToTop: (behavior: ScrollBehavior = 'smooth') => {
          if (containerRef.current) {
            containerRef.current.scrollTo({ top: 0, behavior });
          }
        },
        scrollToBottom: (behavior: ScrollBehavior = 'smooth') => {
          if (containerRef.current) {
            containerRef.current.scrollTo({ top: totalHeight, behavior });
          }
        },
        getScrollPosition: () => scrollTop,
      }),
      [totalHeight, scrollTop]
    );

    const visibleItems = items.slice(startIndex, endIndex);

    return (
      <div
        ref={containerRef}
        className={`overflow-auto ${className}`}
        style={{ ...style, height: style.height || '100%' }}
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          {visibleItems.map((item, i) => {
            const index = startIndex + i;
            const top = itemPositionsRef.current[index] || 0;
            return (
              <div
                key={index}
                style={{
                  position: 'absolute',
                  top,
                  left: 0,
                  right: 0,
                }}
              >
                {renderItem(item, index, (el) => measureItem(index, el))}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  VirtualList,
  VirtualGrid,
  LazyImage,
  WindowScroller,
  DynamicVirtualList,
};
