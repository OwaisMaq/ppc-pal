
import React, { useEffect, useState } from 'react';
import { removeBackground, loadImage } from '@/lib/backgroundRemoval';

interface LogoProcessorProps {
  originalSrc: string;
  alt: string;
  className?: string;
}

const LogoProcessor = ({ originalSrc, alt, className }: LogoProcessorProps) => {
  const [processedSrc, setProcessedSrc] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const processLogo = async () => {
      try {
        setIsProcessing(true);
        
        // Fetch the original image
        const response = await fetch(originalSrc);
        const blob = await response.blob();
        
        // Load as image element
        const img = await loadImage(blob);
        
        // Remove background
        const processedBlob = await removeBackground(img);
        
        // Create URL for processed image
        const processedUrl = URL.createObjectURL(processedBlob);
        setProcessedSrc(processedUrl);
      } catch (error) {
        console.error('Failed to process logo:', error);
        // Fallback to original image
        setProcessedSrc(originalSrc);
      } finally {
        setIsProcessing(false);
      }
    };

    processLogo();
  }, [originalSrc]);

  if (isProcessing) {
    return (
      <div className={className}>
        <div className="animate-pulse bg-gray-300 rounded" style={{width: '100%', height: '100%'}} />
      </div>
    );
  }

  return (
    <img 
      src={processedSrc || originalSrc}
      alt={alt}
      className={className}
    />
  );
};

export default LogoProcessor;
