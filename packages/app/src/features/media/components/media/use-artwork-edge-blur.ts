import { useEffect, useState } from 'react';

type EdgeSide = 'top' | 'right' | 'bottom' | 'left';

interface ArtworkEdgeAnalysisOptions {
  matchColor?: string | null;
  preferEdge?: EdgeSide;
}

interface ArtworkEdgeAnalysis {
  shouldBlur: boolean;
  shouldFadeEdge: boolean;
  edgeMatchesSurface: boolean;
  preferredEdgeColor: string | null;
}

function getColorDistance(
  first: [number, number, number],
  second: [number, number, number]
): number {
  return Math.sqrt(
    (first[0] - second[0]) ** 2 + (first[1] - second[1]) ** 2 + (first[2] - second[2]) ** 2
  );
}

function getImageDataFromArtwork(imageUrl: string, crossOrigin?: 'anonymous'): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    if (crossOrigin) {
      image.crossOrigin = crossOrigin;
    }

    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { willReadFrequently: true });

        if (!context) {
          reject(new Error('Canvas context unavailable'));
          return;
        }

        canvas.width = 48;
        canvas.height = 48;
        context.drawImage(image, 0, 0, 48, 48);
        resolve(context.getImageData(0, 0, 48, 48));
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Failed to sample artwork edges'));
      }
    };

    image.onerror = () => reject(new Error('Failed to load artwork'));
    image.src = imageUrl;
  });
}

function parseRgbString(color: string): [number, number, number] | null {
  const channels = color.match(/\d+(\.\d+)?/g);
  if (!channels || channels.length < 3) {
    return null;
  }

  return [
    Number.parseFloat(channels[0]),
    Number.parseFloat(channels[1]),
    Number.parseFloat(channels[2]),
  ];
}

function toRgbString(color: [number, number, number] | null) {
  if (!color) {
    return null;
  }

  return `rgb(${Math.round(color[0])}, ${Math.round(color[1])}, ${Math.round(color[2])})`;
}

export function analyzeArtworkEdges(
  imageData: ImageData,
  options?: ArtworkEdgeAnalysisOptions
): ArtworkEdgeAnalysis {
  const { data, width, height } = imageData;
  const edgeThickness = Math.max(2, Math.round(Math.min(width, height) * 0.12));
  const edgePixels: Array<[number, number, number]> = [];
  const edgeSums = {
    top: [0, 0, 0] as [number, number, number],
    right: [0, 0, 0] as [number, number, number],
    bottom: [0, 0, 0] as [number, number, number],
    left: [0, 0, 0] as [number, number, number],
  };
  const edgeCounts = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  };
  const edgeSamples = {
    top: [] as Array<[number, number, number]>,
    right: [] as Array<[number, number, number]>,
    bottom: [] as Array<[number, number, number]>,
    left: [] as Array<[number, number, number]>,
  };

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const isTop = y < edgeThickness;
      const isBottom = y >= height - edgeThickness;
      const isLeft = x < edgeThickness;
      const isRight = x >= width - edgeThickness;

      if (!isTop && !isBottom && !isLeft && !isRight) {
        continue;
      }

      const index = (y * width + x) * 4;
      const alpha = data[index + 3];
      if (alpha < 96) {
        continue;
      }

      const color: [number, number, number] = [data[index], data[index + 1], data[index + 2]];
      edgePixels.push(color);

      if (isTop) {
        edgeSums.top[0] += color[0];
        edgeSums.top[1] += color[1];
        edgeSums.top[2] += color[2];
        edgeCounts.top += 1;
        edgeSamples.top.push(color);
      }
      if (isRight) {
        edgeSums.right[0] += color[0];
        edgeSums.right[1] += color[1];
        edgeSums.right[2] += color[2];
        edgeCounts.right += 1;
        edgeSamples.right.push(color);
      }
      if (isBottom) {
        edgeSums.bottom[0] += color[0];
        edgeSums.bottom[1] += color[1];
        edgeSums.bottom[2] += color[2];
        edgeCounts.bottom += 1;
        edgeSamples.bottom.push(color);
      }
      if (isLeft) {
        edgeSums.left[0] += color[0];
        edgeSums.left[1] += color[1];
        edgeSums.left[2] += color[2];
        edgeCounts.left += 1;
        edgeSamples.left.push(color);
      }
    }
  }

  if (edgePixels.length === 0) {
    return {
      shouldBlur: true,
      shouldFadeEdge: true,
      edgeMatchesSurface: false,
      preferredEdgeColor: null,
    };
  }

  const edgeAverage = edgePixels.reduce<[number, number, number]>(
    (sum, color) => [sum[0] + color[0], sum[1] + color[1], sum[2] + color[2]],
    [0, 0, 0]
  );
  const meanEdgeColor: [number, number, number] = [
    edgeAverage[0] / edgePixels.length,
    edgeAverage[1] / edgePixels.length,
    edgeAverage[2] / edgePixels.length,
  ];
  const meanDistance =
    edgePixels.reduce((sum, color) => sum + getColorDistance(color, meanEdgeColor), 0) /
    edgePixels.length;
  const maxDistance = edgePixels.reduce(
    (max, color) => Math.max(max, getColorDistance(color, meanEdgeColor)),
    0
  );
  const sideMeans = Object.entries(edgeSums)
    .map(([side, sum]) => {
      const count = edgeCounts[side as keyof typeof edgeCounts];
      if (count === 0) {
        return null;
      }

      return {
        side: side as EdgeSide,
        color: [sum[0] / count, sum[1] / count, sum[2] / count] as [number, number, number],
      };
    })
    .filter(
      (value): value is { side: EdgeSide; color: [number, number, number] } => value !== null
    );
  const sideSpread = sideMeans.reduce((max, sideColor, index) => {
    for (let nextIndex = index + 1; nextIndex < sideMeans.length; nextIndex += 1) {
      max = Math.max(max, getColorDistance(sideColor.color, sideMeans[nextIndex].color));
    }
    return max;
  }, 0);
  const matchColor = parseRgbString(options?.matchColor ?? '');
  const preferredSide = options?.preferEdge;
  const preferredSideMean = preferredSide
    ? (sideMeans.find((entry) => entry.side === preferredSide)?.color ?? null)
    : null;
  const preferredSideSamples = preferredSide ? edgeSamples[preferredSide] : [];
  const preferredSideVariance =
    preferredSideMean && preferredSideSamples.length > 0
      ? preferredSideSamples.reduce(
          (sum, color) => sum + getColorDistance(color, preferredSideMean),
          0
        ) / preferredSideSamples.length
      : Number.POSITIVE_INFINITY;
  const preferredEdgeMatchesSurface =
    matchColor !== null &&
    preferredSideMean !== null &&
    getColorDistance(preferredSideMean, matchColor) <= 16 &&
    preferredSideVariance <= 28;

  if (preferredEdgeMatchesSurface) {
    return {
      shouldBlur: false,
      shouldFadeEdge: false,
      edgeMatchesSurface: true,
      preferredEdgeColor: toRgbString(preferredSideMean),
    };
  }

  const shouldBlur = meanDistance > 18 || maxDistance > 42 || sideSpread > 24;

  return {
    shouldBlur,
    shouldFadeEdge: true,
    edgeMatchesSurface: false,
    preferredEdgeColor: toRgbString(preferredSideMean),
  };
}

export function shouldBlurArtworkEdges(
  imageData: ImageData,
  options?: ArtworkEdgeAnalysisOptions
): boolean {
  return analyzeArtworkEdges(imageData, options).shouldBlur;
}

const artworkEdgeAnalysisCache = new Map<string, ArtworkEdgeAnalysis>();

export function useArtworkEdgeBlur(
  artwork: string | null | undefined,
  options?: ArtworkEdgeAnalysisOptions
) {
  const [analysis, setAnalysis] = useState<ArtworkEdgeAnalysis>({
    shouldBlur: true,
    shouldFadeEdge: true,
    edgeMatchesSurface: false,
    preferredEdgeColor: null,
  });
  const matchColor = options?.matchColor ?? null;
  const preferEdge = options?.preferEdge;
  const cacheKey = [artwork ?? '', preferEdge ?? '', matchColor ?? ''].join('::');

  useEffect(() => {
    if (!artwork) {
      setAnalysis({
        shouldBlur: true,
        shouldFadeEdge: true,
        edgeMatchesSurface: false,
        preferredEdgeColor: null,
      });
      return;
    }

    const cached = artworkEdgeAnalysisCache.get(cacheKey);
    if (cached) {
      setAnalysis(cached);
      return;
    }

    let cancelled = false;
    const crossOrigin =
      artwork.startsWith('blob:') || artwork.startsWith('data:') ? undefined : 'anonymous';

    void getImageDataFromArtwork(artwork, crossOrigin)
      .then((imageData) =>
        analyzeArtworkEdges(imageData, {
          matchColor,
          preferEdge,
        })
      )
      .catch<ArtworkEdgeAnalysis>(() => ({
        shouldBlur: true,
        shouldFadeEdge: true,
        edgeMatchesSurface: false,
        preferredEdgeColor: null,
      }))
      .then((nextValue) => {
        artworkEdgeAnalysisCache.set(cacheKey, nextValue);
        if (!cancelled) {
          setAnalysis(nextValue);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [artwork, cacheKey, matchColor, preferEdge]);

  return analysis;
}
