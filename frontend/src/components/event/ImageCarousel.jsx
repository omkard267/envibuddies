import React, { useState, useEffect, useCallback } from 'react';

const ImageCarousel = ({ images, autoPlay = true, interval = 5000 }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  // Helper function to get image source
  const getImageSrc = (image) => {
    // Handle Cloudinary structure
    if (image && typeof image === 'object' && image.url) {
      return image.url;
    }
    // Fallback for invalid data
    return '';
  };

  // Helper function to get image alt text
  const getImageAlt = (image, index) => {
    if (image && typeof image === 'object' && image.filename) {
      return image.filename;
    }
    return `Event ${index + 1}`;
  };

  // Auto-advance slides
  useEffect(() => {
    if (!isPlaying || !autoPlay) return;

    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, interval);

    return () => clearInterval(timer);
  }, [isPlaying, autoPlay, interval, images.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isFullscreen]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  }, [images.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
  }, [images.length]);

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Touch handlers for mobile swipe
  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrevious();
    }
  };

  if (!images || images.length === 0) {
    return null;
  }

  const pickFromObject = (imgObj) => imgObj?.secure_url || imgObj?.url || imgObj?.path || imgObj?.filename || '';
  const toUrl = (val) => {
    if (!val) return '';
    const raw = String(val).trim().replace(/\\/g, '/');
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith('/')) return `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${raw}`;
    return `${imageBaseUrl}${raw}`;
  };
  const resolveImageUrl = (img) => encodeURI(toUrl(typeof img === 'string' ? img : pickFromObject(img)));

  const [fallbackSrc, setFallbackSrc] = useState(null);
  const handleImgError = (index) => (e) => {
    const original = resolveImageUrl(images[index]);
    if (original.includes('/uploads/Events/')) {
      const alt = original.replace('/uploads/Events/', '/uploads/events/');
      if (alt !== fallbackSrc) {
        setFallbackSrc(alt);
        e.currentTarget.src = alt;
      }
    }
  };

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center">
        {/* Fullscreen overlay */}
        <div className="relative w-full h-full flex items-center justify-center p-4">
          {/* Close button */}
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 z-10 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 backdrop-blur-sm transition-all duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Navigation arrows */}
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 text-white rounded-full p-3 backdrop-blur-sm transition-all duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 text-white rounded-full p-3 backdrop-blur-sm transition-all duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Main image */}
          <img
            src={getImageSrc(images[currentIndex])}
            alt={getImageAlt(images[currentIndex], currentIndex)}

            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onError={handleImgError(currentIndex)}
          />

          {/* Image counter */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full backdrop-blur-sm">
            {currentIndex + 1} / {images.length}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group">
              {/* Main carousel container */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 shadow-lg">
                    {/* Main image display */}
          <div 
            className="relative aspect-[16/9] w-full sm:aspect-[4/3] md:aspect-[16/9]"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <img
              src={getImageSrc(images[currentIndex])}
              alt={getImageAlt(images[currentIndex], currentIndex)}

              className="w-full h-full object-cover transition-all duration-500 ease-in-out"
              onError={handleImgError(currentIndex)}
            />
          
          {/* Gradient overlay for better text visibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
          
          {/* Image counter */}
          <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
            {currentIndex + 1} / {images.length}
          </div>
        </div>

        {/* Navigation arrows */}
        <button
          onClick={goToPrevious}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={goToNext}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Control buttons */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-3 py-2 shadow-lg">
          <button
            onClick={togglePlayPause}
            className="text-gray-700 hover:text-blue-600 transition-colors duration-200"
            title={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
          >
            {isPlaying ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            onClick={toggleFullscreen}
            className="text-gray-700 hover:text-blue-600 transition-colors duration-200"
            title="View fullscreen"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Thumbnail navigation */}
      {images.length > 1 && (
        <div className="mt-4 flex justify-center">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {images.map((img, index) => (
              <button
                key={img + '-' + index}
                onClick={() => goToSlide(index)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                  index === currentIndex
                    ? 'border-blue-500 shadow-lg scale-110'
                    : 'border-gray-200 hover:border-gray-300 hover:scale-105'
                }`}
              >
                <img
                  src={getImageSrc(img)}
                  alt={getImageAlt(img, index)}

                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Progress bar */}
      {isPlaying && (
        <div className="mt-3 w-full bg-gray-200 rounded-full h-1">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-1 rounded-full transition-all duration-100 ease-linear"
            style={{
              width: `${((currentIndex + 1) / images.length) * 100}%`
            }}
          />
        </div>
      )}
    </div>
  );
};

export default ImageCarousel;
