import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function AttendanceQrScanner({ onScan, onClose }) {
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const [scanState, setScanState] = useState("Initializing scanner...");

  useEffect(() => {
    if (!scannerRef.current) return;

    const qrCodeSuccessCallback = (decodedText, decodedResult) => {
      if (html5QrCodeRef.current?.isScanning) {
        html5QrCodeRef.current.stop().then(() => {
          onScan(decodedText);
        });
      }
    };

    const qrCodeErrorCallback = (errorMessage) => {
      // This callback can be noisy, so we'll just log it for now.
      // console.error(`QR Code no longer in front of camera.`, errorMessage);
    };

    html5QrCodeRef.current = new Html5Qrcode(scannerRef.current.id, /* verbose= */ false);

    setScanState("Requesting camera permissions...");

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length) {
          setScanState("Starting camera...");
          html5QrCodeRef.current.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
            },
            qrCodeSuccessCallback,
            qrCodeErrorCallback
          ).then(() => {
            setScanState("Scanning...");
          }).catch((err) => {
            setScanState(`Camera Error: ${err.message}. Please ensure permissions are granted.`);
          });
        } else {
          setScanState("No cameras found on this device.");
        }
      })
      .catch((err) => {
        setScanState(`Permission Error: ${err?.message || err || 'Unknown error'}. Please allow camera access.`);
      });

    return () => {
      if (html5QrCodeRef.current?.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, [onScan]);

  return (
    <div className="flex flex-col items-center text-center">
      <div id="qr-scanner" ref={scannerRef} style={{ width: '300px', height: '300px' }}></div>
      <p className="mt-2 text-sm text-gray-600">{scanState}</p>
      <button
        onClick={onClose}
        className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
      >
        Close Scanner
      </button>
    </div>
  );
} 