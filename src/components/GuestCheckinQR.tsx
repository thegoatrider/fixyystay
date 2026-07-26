'use client'

import { QRCodeCanvas } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Printer, Download, QrCode } from 'lucide-react'
import { useRef, useEffect, useState } from 'react'

export interface GuestCheckinQRProps {
  propertyId: string
  propertyName: string
}

function getFileFromCanvas(canvas: HTMLCanvasElement, filename: string): File {
  const dataUrl = canvas.toDataURL('image/png')
  const arr = dataUrl.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  const blob = new Blob([u8arr], { type: mime })
  return new File([blob], filename, { type: mime })
}

export default function GuestCheckinQR({ propertyId, propertyName }: GuestCheckinQRProps) {
  const printRef = useRef<HTMLDivElement>(null)
  const [origin, setOrigin] = useState('')
  const [showDownloadModal, setShowDownloadModal] = useState(false)
  const [downloadImageUrl, setDownloadImageUrl] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])
  
  // URL to encode
  const checkinUrl = `${origin}/checkin?p=${propertyId}`

  const handlePrint = () => {
    const printContent = printRef.current
    if (!printContent) return

    const canvas = printContent.querySelector('canvas')
    if (!canvas) return
    
    const qrDataUrl = canvas.toDataURL('image/png')

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <html>
        <head>
          <title>Fixy Stays - Guest Check-in QR</title>
          <style>
            * {
              box-sizing: border-box;
            }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              min-height: 100vh;
              text-align: center;
              padding: 20px;
              background-color: #f3f4f6;
              margin: 0;
            }
            .container {
              border: 12px solid #2563eb;
              padding: 40px 20px;
              border-radius: 30px;
              display: flex;
              flex-direction: column;
              align-items: center;
              width: 100%;
              max-width: 500px;
              background-color: white;
              box-shadow: 0 10px 25px rgba(0,0,0,0.1);
              margin: auto 0;
            }
            .header-section {
              display: flex;
              flex-direction: column;
              align-items: center;
              width: 100%;
            }
            .welcome-text {
              font-size: 14px;
              font-weight: 800;
              color: #4b5563;
              letter-spacing: 3px;
              margin-bottom: 8px;
              text-transform: uppercase;
            }
            .property-name {
              font-size: 24px;
              font-weight: 900;
              color: #1f2937;
              margin-bottom: 24px;
              max-width: 90%;
              line-height: 1.2;
              letter-spacing: -0.5px;
              text-align: center;
            }
            .qr-section {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
            .qr-wrapper {
              background: white;
              padding: 15px;
              border-radius: 20px;
              box-shadow: 0 10px 25px rgba(0,0,0,0.05);
              margin-bottom: 24px;
              border: 1px solid #f3f4f6;
            }
            .qr-wrapper img {
              width: 220px;
              height: 220px;
              display: block;
            }
            .footer-section {
              display: flex;
              flex-direction: column;
              align-items: center;
              width: 100%;
            }
            .instruction {
              font-size: 18px;
              font-weight: 800;
              color: #2563eb;
              margin-bottom: 6px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .sub-instruction {
              font-size: 14px;
              color: #4b5563;
              font-weight: 500;
              margin-bottom: 24px;
            }
            .footer {
              font-size: 11px;
              color: #9ca3af;
              font-weight: 700;
              letter-spacing: 2px;
              text-transform: uppercase;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            
            @media (max-height: 700px) {
              body {
                justify-content: flex-start;
              }
              .container {
                margin: 20px 0;
              }
            }

            @media print {
              @page { 
                size: A4 portrait; 
                margin: 0; 
              }
              html, body {
                width: 210mm;
                height: 297mm;
                background-color: white;
                padding: 0;
                margin: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              body {
                justify-content: center;
              }
              .container {
                border: 12px solid #2563eb;
                padding: 60px 40px;
                border-radius: 50px;
                width: 170mm;
                height: 257mm;
                max-width: none;
                margin: 0;
                box-shadow: none;
                justify-content: space-between;
              }
              .welcome-text {
                font-size: 20px;
                margin-bottom: 12px;
              }
              .property-name {
                font-size: 36px;
                margin-bottom: 0;
                max-width: 550px;
              }
              .qr-wrapper {
                padding: 30px;
                border-radius: 30px;
                margin-bottom: 0;
              }
              .qr-wrapper img {
                width: 350px;
                height: 350px;
              }
              .instruction {
                font-size: 26px;
                margin-bottom: 12px;
              }
              .sub-instruction {
                font-size: 18px;
                margin-bottom: 40px;
              }
              .footer {
                font-size: 14px;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header-section">
              <div class="welcome-text">WELCOME TO</div>
              <div class="property-name">${propertyName}</div>
            </div>
            <div class="qr-section">
              <div class="qr-wrapper">
                <img src="${qrDataUrl}" />
              </div>
            </div>
            <div class="footer-section">
              <div class="instruction">Scan to Check-in</div>
              <div class="sub-instruction">Please keep your ID proofs ready for scanning</div>
              <div class="footer">
                <img src="${origin}/logo.png" style="width: 20px; height: 20px; vertical-align: middle; margin-right: 8px; opacity: 0.5;" />
                Powered by Fixy Stays
              </div>
            </div>
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  if (!origin) return null

  return (
    <div className="bg-white border rounded-3xl p-8 shadow-xl border-blue-50 flex flex-col items-center gap-8 w-full max-w-sm">
      <div className="flex items-center justify-between w-full border-b border-gray-100 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-100">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <h3 className="font-black text-gray-900 tracking-tight">Reception Card</h3>
        </div>
      </div>
      
      <div 
        ref={printRef} 
        className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-[2.5rem] border-2 border-dashed border-blue-200 shadow-inner flex items-center justify-center"
      >
        <div className="bg-white p-4 rounded-[1.5rem] shadow-2xl">
          <QRCodeCanvas
            value={checkinUrl}
            size={220}
            level="H"
            includeMargin={false}
            imageSettings={{
              src: "/logo.png",
              x: undefined,
              y: undefined,
              height: 48,
              width: 48,
              excavate: true,
            }}
          />
        </div>
      </div>

      <div className="text-center space-y-2">
        <p className="text-lg font-black text-gray-900 italic">Self Check-in Portal</p>
        <p className="text-xs text-gray-500 font-medium leading-relaxed">
          Print this A4 card and place it at your property entrance. Guests scan to complete ID verification instantly.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full">
        <Button 
          variant="outline" 
          className="h-12 w-full sm:flex-1 border-2 border-gray-100 hover:border-blue-200 hover:bg-blue-50 font-black text-xs uppercase tracking-wider transition-all rounded-2xl"
          onClick={async () => {
            const canvas = printRef.current?.querySelector('canvas')
            if (canvas) {
              const filename = `fixy-qr-${propertyName.replace(/\s+/g, '-').toLowerCase()}.png`
              
              try {
                // Synchronous file conversion preserves user gesture for Web Share API
                const file = getFileFromCanvas(canvas, filename)
                
                // 1. Try modern Web Share API for mobile (iOS/Android)
                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                  await navigator.share({
                    files: [file],
                    title: 'FixyStays Check-in QR',
                    text: 'Scan this QR code to check-in.'
                  })
                  return
                }
              } catch (shareErr) {
                console.warn("Share failed, falling back to download", shareErr)
              }

              // 2. Fallback: Trigger traditional download & display modal
              const url = canvas.toDataURL('image/png')
              setDownloadImageUrl(url)
              setShowDownloadModal(true)

              try {
                const link = document.createElement('a')
                link.href = url
                link.download = filename
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
              } catch (downloadErr) {
                console.error("Direct download failed", downloadErr)
              }
            }
          }}
        >
          <Download className="w-4 h-4 mr-2" /> ID QR Image
        </Button>
        <Button 
          className="h-12 w-full sm:flex-1 bg-blue-600 hover:bg-blue-700 font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-100 transition-all active:scale-95 rounded-2xl"
          onClick={handlePrint}
        >
          <Printer className="w-4 h-4 mr-2" /> Print A4 Card
        </Button>
      </div>

      {showDownloadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl border border-gray-100 flex flex-col items-center gap-4">
            <h4 className="font-black text-gray-900 text-lg italic uppercase tracking-tight">Save QR Code</h4>
            <p className="text-xs text-gray-500 font-semibold px-2">
              If the download didn't start automatically, you can long-press the image below and select <span className="text-blue-600">"Save Image"</span> or click the Download button.
            </p>
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 mt-2">
              <img 
                src={downloadImageUrl} 
                alt="Property QR Code" 
                className="w-48 h-48 object-contain shadow-md rounded-xl animate-in zoom-in-95 duration-200"
              />
            </div>
            <div className="flex gap-2 w-full mt-2">
              <Button 
                variant="outline"
                className="flex-1 h-11 border-2 border-gray-100 hover:border-blue-200 hover:bg-blue-50 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer"
                onClick={async () => {
                  const canvas = printRef.current?.querySelector('canvas')
                  if (canvas) {
                    const filename = `fixy-qr-${propertyName.replace(/\s+/g, '-').toLowerCase()}.png`
                    
                    try {
                      const file = getFileFromCanvas(canvas, filename)
                      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({
                          files: [file],
                          title: 'FixyStays Check-in QR',
                          text: 'Scan this QR code to check-in.'
                        })
                        return
                      }
                    } catch (shareErr) {
                      console.warn("Share failed in modal", shareErr)
                    }

                    // Try direct download fallback (no window.open to prevent locked screens in mobile webviews)
                    try {
                      const url = canvas.toDataURL('image/png')
                      const link = document.createElement('a')
                      link.href = url
                      link.download = filename
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)
                    } catch (downloadErr) {
                      console.error("Direct download failed in modal", downloadErr)
                    }
                  }
                }}
              >
                Download
              </Button>
              <Button 
                className="flex-1 h-11 bg-gray-900 hover:bg-black font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer text-white"
                onClick={() => {
                  setShowDownloadModal(false)
                  setDownloadImageUrl('')
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
