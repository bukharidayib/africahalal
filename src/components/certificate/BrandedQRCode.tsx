import { useEffect, useRef } from 'react';
import QRCodeStyling, { Options } from 'qr-code-styling';

const AHI_GREEN = '#1F6046';
const FINDER_BLACK = '#000000';
const LOGO_SRC = '/favicon.png';

function getQrOptions(value: string, size: number): Partial<Options> {
  return {
    type: 'canvas',
    shape: 'square',
    width: size,
    height: size,
    data: value,
    margin: 0,
    qrOptions: {
      typeNumber: 0,
      mode: 'Byte',
      errorCorrectionLevel: 'Q',
    },
    image: LOGO_SRC,
    imageOptions: {
      saveAsBlob: true,
      hideBackgroundDots: true,
      imageSize: 0.38,
      margin: 0,
      crossOrigin: 'anonymous',
    },
    dotsOptions: {
      type: 'extra-rounded',
      color: AHI_GREEN,
      roundSize: true,
    },
    backgroundOptions: {
      round: 0,
      color: '#ffffff',
    },
    cornersSquareOptions: {
      type: 'extra-rounded',
      color: FINDER_BLACK,
    },
    cornersDotOptions: {
      type: 'square',
      color: FINDER_BLACK,
    },
  };
}

interface BrandedQRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

export function BrandedQRCode({ value, size = 120, className }: BrandedQRCodeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = '';
    const qr = new QRCodeStyling(getQrOptions(value, size));
    qr.append(containerRef.current);

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [value, size]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: size, height: size }}
      aria-label="Certificate QR code"
    />
  );
}

export async function downloadBrandedQrPng(value: string, fileName: string, size = 512) {
  const qr = new QRCodeStyling(getQrOptions(value, size));
  const blob = await qr.getRawData('png');
  if (!(blob instanceof Blob)) throw new Error('QR code could not be generated.');

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
