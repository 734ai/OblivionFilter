/*******************************************************************************

    OblivionFilter - Computer Vision Engine v2.1.0
    Copyright (C) 2025 OblivionFilter Contributors

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.

    Home: https://github.com/734ai/OblivionFilter

*******************************************************************************/

'use strict';

/******************************************************************************/

// Computer Vision Engine for Image Advertisement Detection
// Advanced image analysis and visual pattern recognition for ad blocking
const ComputerVisionEngine = (function() {

    /******************************************************************************/

    // Configuration
    const config = {
        enabled: true,
        
        // Vision models
        models: {
            adClassifier: true,
            textExtraction: true,
            logoDetection: true,
            bannerDetection: true,
            layoutAnalysis: true
        },
        
        // Detection targets
        targets: {
            bannerAds: true,
            logoAds: true,
            textOverlays: true,
            popupImages: true,
            promotionalImages: true,
            sponsoredContent: true
        },
        
        // Performance settings
        performance: {
            maxProcessingTime: 100, // ms per image
            imageResizeThreshold: 500, // Max dimension for processing
            batchSize: 5,
            cacheResults: true,
            useOffscreenCanvas: true
        }
    };

    /******************************************************************************/

    // Image preprocessing utilities
    const ImageProcessor = {
        // Create canvas for image processing
        createCanvas(width, height) {
            if (config.performance.useOffscreenCanvas && typeof OffscreenCanvas !== 'undefined') {
                return new OffscreenCanvas(width, height);
            } else {
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                return canvas;
            }
        },

        // Load image from various sources
        async loadImage(source) {
            return new Promise((resolve, reject) => {
                if (source instanceof HTMLImageElement) {
                    if (source.complete) {
                        resolve(source);
                    } else {
                        source.onload = () => resolve(source);
                        source.onerror = reject;
                    }
                } else if (typeof source === 'string') {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => resolve(img);
                    img.onerror = reject;
                    img.src = source;
                } else if (source instanceof HTMLCanvasElement) {
                    resolve(source);
                } else {
                    reject(new Error('Unsupported image source type'));
                }
            });
        },

        // Resize image if necessary
        resizeImage(image, maxDimension = config.performance.imageResizeThreshold) {
            const canvas = this.createCanvas(image.width, image.height);
            const ctx = canvas.getContext('2d');
            
            let { width, height } = image;
            
            // Calculate new dimensions
            if (width > maxDimension || height > maxDimension) {
                const ratio = Math.min(maxDimension / width, maxDimension / height);
                width = Math.floor(width * ratio);
                height = Math.floor(height * ratio);
                
                canvas.width = width;
                canvas.height = height;
            }
            
            ctx.drawImage(image, 0, 0, width, height);
            return canvas;
        },

        // Extract image data
        getImageData(image) {
            const canvas = this.resizeImage(image);
            const ctx = canvas.getContext('2d');
            return ctx.getImageData(0, 0, canvas.width, canvas.height);
        },

        // Convert to grayscale
        toGrayscale(imageData) {
            const data = imageData.data;
            const grayscale = new Uint8ClampedArray(imageData.width * imageData.height);
            
            for (let i = 0; i < data.length; i += 4) {
                const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
                grayscale[i / 4] = gray;
            }
            
            return {
                data: grayscale,
                width: imageData.width,
                height: imageData.height
            };
        },

        // Apply Gaussian blur
        gaussianBlur(grayscaleData, radius = 2) {
            const { data, width, height } = grayscaleData;
            const result = new Uint8ClampedArray(data.length);
            
            // Create Gaussian kernel
            const kernel = this.createGaussianKernel(radius);
            const kernelSize = kernel.length;
            const half = Math.floor(kernelSize / 2);
            
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    let sum = 0;
                    let weightSum = 0;
                    
                    for (let ky = 0; ky < kernelSize; ky++) {
                        for (let kx = 0; kx < kernelSize; kx++) {
                            const px = x + kx - half;
                            const py = y + ky - half;
                            
                            if (px >= 0 && px < width && py >= 0 && py < height) {
                                const weight = kernel[ky][kx];
                                sum += data[py * width + px] * weight;
                                weightSum += weight;
                            }
                        }
                    }
                    
                    result[y * width + x] = Math.round(sum / weightSum);
                }
            }
            
            return { data: result, width, height };
        },

        // Create Gaussian kernel
        createGaussianKernel(radius) {
            const size = radius * 2 + 1;
            const kernel = [];
            const sigma = radius / 3;
            
            for (let y = 0; y < size; y++) {
                const row = [];
                for (let x = 0; x < size; x++) {
                    const dx = x - radius;
                    const dy = y - radius;
                    const value = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
                    row.push(value);
                }
                kernel.push(row);
            }
            
            return kernel;
        },

        // Edge detection using Sobel operator
        detectEdges(grayscaleData) {
            const { data, width, height } = grayscaleData;
            const edges = new Uint8ClampedArray(data.length);
            
            // Sobel kernels
            const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
            const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
            
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    let gx = 0, gy = 0;
                    
                    // Apply Sobel kernels
                    for (let ky = 0; ky < 3; ky++) {
                        for (let kx = 0; kx < 3; kx++) {
                            const px = x + kx - 1;
                            const py = y + ky - 1;
                            const pixel = data[py * width + px];
                            
                            gx += pixel * sobelX[ky][kx];
                            gy += pixel * sobelY[ky][kx];
                        }
                    }
                    
                    const magnitude = Math.sqrt(gx * gx + gy * gy);
                    edges[y * width + x] = Math.min(255, magnitude);
                }
            }
            
            return { data: edges, width, height };
        }
    };

    /******************************************************************************/

    // Feature extraction for image analysis
    const FeatureExtractor = {
        // Extract color histogram
        extractColorHistogram(imageData, bins = 16) {
            const data = imageData.data;
            const histogram = {
                red: new Array(bins).fill(0),
                green: new Array(bins).fill(0),
                blue: new Array(bins).fill(0)
            };
            
            const binSize = 256 / bins;
            
            for (let i = 0; i < data.length; i += 4) {
                const r = Math.floor(data[i] / binSize);
                const g = Math.floor(data[i + 1] / binSize);
                const b = Math.floor(data[i + 2] / binSize);
                
                histogram.red[Math.min(r, bins - 1)]++;
                histogram.green[Math.min(g, bins - 1)]++;
                histogram.blue[Math.min(b, bins - 1)]++;
            }
            
            return histogram;
        },

        // Extract texture features using Local Binary Patterns
        extractLBP(grayscaleData) {
            const { data, width, height } = grayscaleData;
            const lbp = new Uint8ClampedArray(data.length);
            
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const center = data[y * width + x];
                    let pattern = 0;
                    
                    // Check 8 neighbors
                    const neighbors = [
                        data[(y - 1) * width + (x - 1)], // Top-left
                        data[(y - 1) * width + x],       // Top
                        data[(y - 1) * width + (x + 1)], // Top-right
                        data[y * width + (x + 1)],       // Right
                        data[(y + 1) * width + (x + 1)], // Bottom-right
                        data[(y + 1) * width + x],       // Bottom
                        data[(y + 1) * width + (x - 1)], // Bottom-left
                        data[y * width + (x - 1)]        // Left
                    ];
                    
                    for (let i = 0; i < 8; i++) {
                        if (neighbors[i] >= center) {
                            pattern |= (1 << i);
                        }
                    }
                    
                    lbp[y * width + x] = pattern;
                }
            }
            
            return { data: lbp, width, height };
        },

        // Calculate image moments for shape analysis
        calculateMoments(binaryData) {
            const { data, width, height } = binaryData;
            
            // Calculate spatial moments
            let m00 = 0, m10 = 0, m01 = 0;
            let m20 = 0, m11 = 0, m02 = 0;
            
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const pixel = data[y * width + x] > 128 ? 1 : 0;
                    
                    m00 += pixel;
                    m10 += x * pixel;
                    m01 += y * pixel;
                    m20 += x * x * pixel;
                    m11 += x * y * pixel;
                    m02 += y * y * pixel;
                }
            }
            
            // Calculate central moments
            const cx = m10 / m00;
            const cy = m01 / m00;
            
            const mu20 = m20 / m00 - cx * cx;
            const mu11 = m11 / m00 - cx * cy;
            const mu02 = m02 / m00 - cy * cy;
            
            return {
                area: m00,
                centroid: { x: cx, y: cy },
                orientation: 0.5 * Math.atan2(2 * mu11, mu20 - mu02),
                eccentricity: this.calculateEccentricity(mu20, mu11, mu02)
            };
        },

        // Calculate shape eccentricity
        calculateEccentricity(mu20, mu11, mu02) {
            const lambda1 = (mu20 + mu02 + Math.sqrt((mu20 - mu02) ** 2 + 4 * mu11 ** 2)) / 2;
            const lambda2 = (mu20 + mu02 - Math.sqrt((mu20 - mu02) ** 2 + 4 * mu11 ** 2)) / 2;
            
            if (lambda1 <= 0 || lambda2 <= 0) return 0;
            
            return Math.sqrt(1 - lambda2 / lambda1);
        },

        // Extract HOG (Histogram of Oriented Gradients) features
        extractHOG(grayscaleData, cellSize = 8, blockSize = 2) {
            const { data, width, height } = grayscaleData;
            
            // Calculate gradients
            const gradients = this.calculateGradients(data, width, height);
            
            // Divide image into cells
            const cellsX = Math.floor(width / cellSize);
            const cellsY = Math.floor(height / cellSize);
            
            const histograms = [];
            
            for (let cy = 0; cy < cellsY; cy++) {
                for (let cx = 0; cx < cellsX; cx++) {
                    const histogram = new Array(9).fill(0); // 9 orientation bins
                    
                    // Calculate histogram for this cell
                    for (let y = cy * cellSize; y < (cy + 1) * cellSize && y < height; y++) {
                        for (let x = cx * cellSize; x < (cx + 1) * cellSize && x < width; x++) {
                            const gradient = gradients[y * width + x];
                            const bin = Math.floor(gradient.orientation / 20); // 0-179 degrees in 9 bins
                            histogram[Math.min(bin, 8)] += gradient.magnitude;
                        }
                    }
                    
                    histograms.push(histogram);
                }
            }
            
            return {
                histograms,
                cellsX,
                cellsY,
                cellSize
            };
        },

        // Calculate image gradients
        calculateGradients(data, width, height) {
            const gradients = [];
            
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    let gx = 0, gy = 0;
                    
                    // Calculate gradients using simple differences
                    if (x > 0 && x < width - 1) {
                        gx = data[y * width + (x + 1)] - data[y * width + (x - 1)];
                    }
                    if (y > 0 && y < height - 1) {
                        gy = data[(y + 1) * width + x] - data[(y - 1) * width + x];
                    }
                    
                    const magnitude = Math.sqrt(gx * gx + gy * gy);
                    const orientation = (Math.atan2(gy, gx) * 180 / Math.PI + 180) % 180;
                    
                    gradients.push({ magnitude, orientation });
                }
            }
            
            return gradients;
        }
    };

    /******************************************************************************/

    // Advertisement pattern detection
    const AdPatternDetector = {
        // Common ad aspect ratios
        adAspectRatios: [
            { ratio: 728 / 90, name: 'leaderboard', tolerance: 0.1 },
            { ratio: 300 / 250, name: 'medium_rectangle', tolerance: 0.1 },
            { ratio: 336 / 280, name: 'large_rectangle', tolerance: 0.1 },
            { ratio: 320 / 50, name: 'mobile_banner', tolerance: 0.1 },
            { ratio: 468 / 60, name: 'banner', tolerance: 0.1 },
            { ratio: 234 / 60, name: 'half_banner', tolerance: 0.1 },
            { ratio: 88 / 31, name: 'micro_bar', tolerance: 0.1 },
            { ratio: 120 / 90, name: 'button_1', tolerance: 0.1 },
            { ratio: 120 / 60, name: 'button_2', tolerance: 0.1 },
            { ratio: 125 / 125, name: 'square_button', tolerance: 0.1 },
            { ratio: 180 / 150, name: 'rectangle', tolerance: 0.1 },
            { ratio: 160 / 600, name: 'wide_skyscraper', tolerance: 0.1 },
            { ratio: 120 / 600, name: 'skyscraper', tolerance: 0.1 }
        ],

        // Detect if image has ad-like aspect ratio
        detectAdAspectRatio(width, height) {
            const imageRatio = width / height;
            
            for (const ad of this.adAspectRatios) {
                const diff = Math.abs(imageRatio - ad.ratio) / ad.ratio;
                if (diff <= ad.tolerance) {
                    return {
                        isAdRatio: true,
                        adType: ad.name,
                        confidence: 1 - diff / ad.tolerance
                    };
                }
            }
            
            return { isAdRatio: false, adType: null, confidence: 0 };
        },

        // Detect banner-like patterns
        detectBannerPatterns(imageData) {
            const { width, height } = imageData;
            const grayscale = ImageProcessor.toGrayscale(imageData);
            
            // Check for horizontal text patterns (common in banners)
            const horizontalEdges = this.detectHorizontalEdges(grayscale);
            
            // Check for repeated patterns
            const repetition = this.detectRepetition(grayscale);
            
            // Check for border patterns
            const borders = this.detectBorders(grayscale);
            
            const score = (horizontalEdges + repetition + borders) / 3;
            
            return {
                isBanner: score > 0.6,
                confidence: score,
                features: {
                    horizontalEdges,
                    repetition,
                    borders
                }
            };
        },

        // Detect horizontal edge patterns
        detectHorizontalEdges(grayscaleData) {
            const edges = ImageProcessor.detectEdges(grayscaleData);
            const { data, width, height } = edges;
            
            let horizontalEdgeCount = 0;
            const threshold = 100;
            
            // Count horizontal edges
            for (let y = 1; y < height - 1; y++) {
                let consecutiveEdges = 0;
                
                for (let x = 0; x < width; x++) {
                    if (data[y * width + x] > threshold) {
                        consecutiveEdges++;
                    } else {
                        if (consecutiveEdges > width * 0.3) {
                            horizontalEdgeCount++;
                        }
                        consecutiveEdges = 0;
                    }
                }
            }
            
            return Math.min(horizontalEdgeCount / (height * 0.1), 1);
        },

        // Detect repetitive patterns
        detectRepetition(grayscaleData) {
            const { data, width, height } = grayscaleData;
            
            // Sample rows to check for repetition
            const sampleRows = Math.min(10, height);
            const step = Math.floor(height / sampleRows);
            
            let repetitionScore = 0;
            
            for (let i = 0; i < sampleRows - 1; i++) {
                const row1 = i * step;
                const row2 = (i + 1) * step;
                
                if (row2 >= height) break;
                
                const similarity = this.calculateRowSimilarity(data, width, row1, row2);
                repetitionScore += similarity;
            }
            
            return repetitionScore / (sampleRows - 1);
        },

        // Calculate similarity between two rows
        calculateRowSimilarity(data, width, row1, row2) {
            let similarity = 0;
            const threshold = 30;
            
            for (let x = 0; x < width; x++) {
                const pixel1 = data[row1 * width + x];
                const pixel2 = data[row2 * width + x];
                const diff = Math.abs(pixel1 - pixel2);
                
                if (diff < threshold) {
                    similarity++;
                }
            }
            
            return similarity / width;
        },

        // Detect border patterns
        detectBorders(grayscaleData) {
            const { data, width, height } = grayscaleData;
            
            // Check top and bottom borders
            const topBorder = this.checkBorderUniformity(data, width, 0, 3);
            const bottomBorder = this.checkBorderUniformity(data, width, height - 3, height);
            
            // Check left and right borders  
            const leftBorder = this.checkVerticalBorderUniformity(data, width, height, 0, 3);
            const rightBorder = this.checkVerticalBorderUniformity(data, width, height, width - 3, width);
            
            return (topBorder + bottomBorder + leftBorder + rightBorder) / 4;
        },

        // Check border uniformity
        checkBorderUniformity(data, width, startY, endY) {
            let variance = 0;
            let count = 0;
            let sum = 0;
            
            // Calculate mean
            for (let y = startY; y < endY; y++) {
                for (let x = 0; x < width; x++) {
                    sum += data[y * width + x];
                    count++;
                }
            }
            
            if (count === 0) return 0;
            
            const mean = sum / count;
            
            // Calculate variance
            for (let y = startY; y < endY; y++) {
                for (let x = 0; x < width; x++) {
                    const diff = data[y * width + x] - mean;
                    variance += diff * diff;
                }
            }
            
            variance /= count;
            
            // Low variance indicates uniform border
            return Math.max(0, 1 - variance / (255 * 255));
        },

        // Check vertical border uniformity
        checkVerticalBorderUniformity(data, width, height, startX, endX) {
            let variance = 0;
            let count = 0;
            let sum = 0;
            
            // Calculate mean
            for (let y = 0; y < height; y++) {
                for (let x = startX; x < endX; x++) {
                    sum += data[y * width + x];
                    count++;
                }
            }
            
            if (count === 0) return 0;
            
            const mean = sum / count;
            
            // Calculate variance
            for (let y = 0; y < height; y++) {
                for (let x = startX; x < endX; x++) {
                    const diff = data[y * width + x] - mean;
                    variance += diff * diff;
                }
            }
            
            variance /= count;
            
            return Math.max(0, 1 - variance / (255 * 255));
        }
    };

    /******************************************************************************/

    // Text extraction for image ads
    const TextExtractor = {
        // Simple text detection using edge patterns
        detectText(imageData) {
            const grayscale = ImageProcessor.toGrayscale(imageData);
            const edges = ImageProcessor.detectEdges(grayscale);
            
            // Look for text-like patterns
            const textRegions = this.findTextRegions(edges);
            
            return {
                hasText: textRegions.length > 0,
                textRegions,
                confidence: Math.min(textRegions.length / 5, 1)
            };
        },

        // Find potential text regions
        findTextRegions(edgeData) {
            const { data, width, height } = edgeData;
            const regions = [];
            const threshold = 100;
            
            // Scan for connected components that look like text
            for (let y = 0; y < height - 10; y += 5) {
                for (let x = 0; x < width - 20; x += 5) {
                    const region = this.analyzeRegion(data, width, height, x, y, 20, 10);
                    
                    if (region.edgeDensity > 0.3 && region.horizontalEdges > region.verticalEdges) {
                        regions.push({
                            x, y, width: 20, height: 10,
                            edgeDensity: region.edgeDensity,
                            textLikelihood: region.edgeDensity * 2 - region.uniformity
                        });
                    }
                }
            }
            
            return regions.filter(region => region.textLikelihood > 0.4);
        },

        // Analyze a specific region
        analyzeRegion(data, imageWidth, imageHeight, x, y, width, height) {
            let edgeCount = 0;
            let horizontalEdges = 0;
            let verticalEdges = 0;
            let pixelSum = 0;
            let pixelCount = 0;
            
            for (let dy = 0; dy < height && y + dy < imageHeight; dy++) {
                for (let dx = 0; dx < width && x + dx < imageWidth; dx++) {
                    const pixel = data[(y + dy) * imageWidth + (x + dx)];
                    pixelSum += pixel;
                    pixelCount++;
                    
                    if (pixel > 100) {
                        edgeCount++;
                        
                        // Check if edge is more horizontal or vertical
                        const neighbors = this.getNeighborEdges(data, imageWidth, imageHeight, x + dx, y + dy);
                        if (neighbors.horizontal > neighbors.vertical) {
                            horizontalEdges++;
                        } else {
                            verticalEdges++;
                        }
                    }
                }
            }
            
            const edgeDensity = edgeCount / pixelCount;
            const meanPixel = pixelSum / pixelCount;
            
            // Calculate uniformity (lower is better for text)
            let variance = 0;
            for (let dy = 0; dy < height && y + dy < imageHeight; dy++) {
                for (let dx = 0; dx < width && x + dx < imageWidth; dx++) {
                    const pixel = data[(y + dy) * imageWidth + (x + dx)];
                    variance += (pixel - meanPixel) ** 2;
                }
            }
            variance /= pixelCount;
            const uniformity = 1 - Math.min(variance / (255 * 255), 1);
            
            return {
                edgeDensity,
                horizontalEdges,
                verticalEdges,
                uniformity
            };
        },

        // Get neighboring edge information
        getNeighborEdges(data, width, height, x, y) {
            let horizontal = 0;
            let vertical = 0;
            
            // Check horizontal neighbors
            if (x > 0 && data[y * width + (x - 1)] > 100) horizontal++;
            if (x < width - 1 && data[y * width + (x + 1)] > 100) horizontal++;
            
            // Check vertical neighbors
            if (y > 0 && data[(y - 1) * width + x] > 100) vertical++;
            if (y < height - 1 && data[(y + 1) * width + x] > 100) vertical++;
            
            return { horizontal, vertical };
        }
    };

    /******************************************************************************/

    // Main computer vision analysis engine
    let initialized = false;
    let analysisCache = new Map();
    let statistics = {
        totalAnalyses: 0,
        adDetections: 0,
        avgProcessingTime: 0,
        cacheHitRate: 0
    };

    /******************************************************************************/

    // Initialize computer vision engine
    const initialize = function() {
        if (initialized) return;
        
        console.log('[ComputerVision] Initializing computer vision engine...');
        
        // Check for required APIs
        if (typeof ImageData === 'undefined') {
            console.warn('[ComputerVision] ImageData API not available');
            return;
        }
        
        if (typeof Canvas === 'undefined' && typeof HTMLCanvasElement === 'undefined') {
            console.warn('[ComputerVision] Canvas API not available');
            return;
        }
        
        initialized = true;
        console.log('[ComputerVision] Computer vision engine initialized successfully');
    };

    // Main image analysis function
    const analyzeImage = async function(imageSource, options = {}) {
        if (!initialized) {
            console.warn('[ComputerVision] Engine not initialized');
            return null;
        }
        
        const startTime = performance.now();
        
        try {
            // Load and preprocess image
            const image = await ImageProcessor.loadImage(imageSource);
            const imageData = ImageProcessor.getImageData(image);
            
            // Check cache
            const cacheKey = this.generateCacheKey(imageData, options);
            if (config.performance.cacheResults && analysisCache.has(cacheKey)) {
                statistics.cacheHitRate = 
                    (statistics.cacheHitRate * statistics.totalAnalyses + 1) / 
                    (statistics.totalAnalyses + 1);
                return analysisCache.get(cacheKey);
            }
            
            // Extract features
            const features = await this.extractImageFeatures(imageData);
            
            // Detect ad patterns
            const adPatterns = AdPatternDetector.detectAdAspectRatio(imageData.width, imageData.height);
            const bannerPatterns = AdPatternDetector.detectBannerPatterns(imageData);
            
            // Extract text
            const textAnalysis = TextExtractor.detectText(imageData);
            
            // Calculate final ad probability
            const adProbability = this.calculateAdProbability({
                features,
                adPatterns,
                bannerPatterns,
                textAnalysis,
                dimensions: { width: imageData.width, height: imageData.height }
            });
            
            const result = {
                isAdvertisement: adProbability > 0.6,
                confidence: adProbability,
                features,
                adPatterns,
                bannerPatterns,
                textAnalysis,
                dimensions: { width: imageData.width, height: imageData.height },
                processingTime: performance.now() - startTime,
                timestamp: Date.now()
            };
            
            // Update statistics
            this.updateStatistics(result);
            
            // Cache result
            if (config.performance.cacheResults) {
                analysisCache.set(cacheKey, result);
                
                // Limit cache size
                if (analysisCache.size > 500) {
                    const firstKey = analysisCache.keys().next().value;
                    analysisCache.delete(firstKey);
                }
            }
            
            return result;
            
        } catch (error) {
            console.error('[ComputerVision] Image analysis failed:', error);
            return null;
        }
    };

    // Extract comprehensive image features
    const extractImageFeatures = async function(imageData) {
        const grayscale = ImageProcessor.toGrayscale(imageData);
        
        return {
            colorHistogram: FeatureExtractor.extractColorHistogram(imageData),
            texture: FeatureExtractor.extractLBP(grayscale),
            moments: FeatureExtractor.calculateMoments(grayscale),
            hog: FeatureExtractor.extractHOG(grayscale),
            edges: ImageProcessor.detectEdges(grayscale)
        };
    };

    // Calculate advertisement probability
    const calculateAdProbability = function(analysis) {
        let score = 0;
        
        // Aspect ratio scoring
        if (analysis.adPatterns.isAdRatio) {
            score += analysis.adPatterns.confidence * 0.4;
        }
        
        // Banner pattern scoring
        if (analysis.bannerPatterns.isBanner) {
            score += analysis.bannerPatterns.confidence * 0.3;
        }
        
        // Text analysis scoring
        if (analysis.textAnalysis.hasText) {
            score += analysis.textAnalysis.confidence * 0.2;
        }
        
        // Size-based scoring (common ad sizes get higher scores)
        const { width, height } = analysis.dimensions;
        const area = width * height;
        
        if (area > 50000 && area < 500000) { // Common ad sizes
            score += 0.1;
        }
        
        return Math.min(score, 1.0);
    };

    // Generate cache key for image
    const generateCacheKey = function(imageData, options) {
        // Create simple hash from image data sample
        const data = imageData.data;
        let hash = 0;
        const step = Math.floor(data.length / 100); // Sample every 100th pixel
        
        for (let i = 0; i < data.length; i += step) {
            hash = ((hash << 5) - hash + data[i]) & 0xffffffff;
        }
        
        return `${hash}_${imageData.width}_${imageData.height}_${JSON.stringify(options)}`;
    };

    // Update analysis statistics
    const updateStatistics = function(result) {
        statistics.totalAnalyses++;
        
        if (result.isAdvertisement) {
            statistics.adDetections++;
        }
        
        statistics.avgProcessingTime = 
            (statistics.avgProcessingTime * (statistics.totalAnalyses - 1) + 
             result.processingTime) / statistics.totalAnalyses;
    };

    // Batch analyze multiple images
    const batchAnalyze = async function(imageSources, options = {}) {
        const results = [];
        const batchSize = config.performance.batchSize;
        
        for (let i = 0; i < imageSources.length; i += batchSize) {
            const batch = imageSources.slice(i, i + batchSize);
            const batchPromises = batch.map(source => analyzeImage(source, options));
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            // Allow other tasks to run
            if (i + batchSize < imageSources.length) {
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }
        
        return results;
    };

    // Update configuration
    const updateConfig = function(newConfig) {
        Object.assign(config, newConfig);
        console.log('[ComputerVision] Configuration updated');
    };

    // Get statistics
    const getStatistics = function() {
        return {
            ...statistics,
            cacheSize: analysisCache.size,
            initialized
        };
    };

    // Clear cache
    const clearCache = function() {
        analysisCache.clear();
        console.log('[ComputerVision] Cache cleared');
    };

    /******************************************************************************/

    // Public API
    return {
        initialize,
        analyzeImage,
        batchAnalyze,
        updateConfig,
        getStatistics,
        clearCache,
        
        // Sub-modules for direct access
        ImageProcessor,
        FeatureExtractor,
        AdPatternDetector,
        TextExtractor,
        
        // Configuration access
        get config() { return { ...config }; },
        get initialized() { return initialized; }
    };

})();

/******************************************************************************/

// Auto-initialize if in browser environment
if (typeof window !== 'undefined' && window.document) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            ComputerVisionEngine.initialize();
        });
    } else {
        ComputerVisionEngine.initialize();
    }
}

/******************************************************************************/

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ComputerVisionEngine;
}
