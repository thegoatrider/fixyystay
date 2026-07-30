'use client'

import { QRCodeCanvas } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Printer, Download, Globe } from 'lucide-react'
import { useRef, useEffect, useState } from 'react'

function getFileFromCanvas(canvas: HTMLCanvasElement, filename: string): File {
  const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
  const arr = dataUrl.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  const blob = new Blob([u8arr], { type: mime })
  return new File([blob], filename, { type: mime })
}

export default function WebsiteQR() {
  const printRef = useRef<HTMLDivElement>(null)
  const [origin, setOrigin] = useState('')
  const [showDownloadModal, setShowDownloadModal] = useState(false)
  const [downloadImageUrl, setDownloadImageUrl] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])
  
  // URL to encode - pointing to main website
  const websiteUrl = origin

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
          <title>Fixy Stays - Business Card</title>
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
              background: linear-gradient(to bottom, #ffffff, #f0f7ff);
              box-shadow: 0 10px 25px rgba(0,0,0,0.1);
              margin: auto 0;
            }
            .header-section {
              display: flex;
              flex-direction: column;
              align-items: center;
              width: 100%;
            }
            .logo-img {
              width: 60px;
              height: 60px;
              margin-bottom: 12px;
            }
            .logo-text {
              font-size: 36px;
              font-weight: 900;
              color: #2563eb;
              margin-bottom: 4px;
              letter-spacing: -1.5px;
            }
            .tagline {
              font-size: 14px;
              font-weight: 700;
              color: #1f2937;
              margin-bottom: 24px;
              max-width: 90%;
              line-height: 1.3;
              font-style: italic;
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
              box-shadow: 0 10px 25px rgba(37, 99, 235, 0.05);
              margin-bottom: 24px;
              border: 1px solid #e5e7eb;
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
              font-size: 14px;
              font-weight: 800;
              color: #2563eb;
              margin-bottom: 6px;
              text-transform: uppercase;
              letter-spacing: 1.5px;
            }
            .website-url {
              font-size: 18px;
              color: #1f2937;
              font-weight: 700;
              margin-bottom: 24px;
            }
            .footer {
              font-size: 11px;
              color: #4b5563;
              font-weight: 600;
              letter-spacing: 1px;
              border-top: 1px solid #e5e7eb;
              padding-top: 15px;
              width: 100%;
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
              .logo-img {
                width: 100px;
                height: 100px;
                margin-bottom: 20px;
              }
              .logo-text {
                font-size: 56px;
                margin-bottom: 5px;
                letter-spacing: -2px;
              }
              .tagline {
                font-size: 22px;
                margin-bottom: 0;
                max-width: 500px;
              }
              .qr-wrapper {
                padding: 30px;
                border-radius: 30px;
                margin-bottom: 0;
                border: 2px solid #e5e7eb;
              }
              .qr-wrapper img {
                width: 350px;
                height: 350px;
              }
              .instruction {
                font-size: 20px;
                margin-bottom: 10px;
                letter-spacing: 2px;
              }
              .website-url {
                font-size: 24px;
                margin-bottom: 0;
              }
              .footer {
                font-size: 16px;
                padding-top: 20px;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header-section">
              <img src="${origin}/logo.png" class="logo-img" />
              <div class="logo-text">Fixy Stays</div>
              <div class="tagline">Alibag's premier hotel booking and data management software.</div>
            </div>
            <div class="qr-section">
              <div class="qr-wrapper">
                <img src="${qrDataUrl}" />
              </div>
            </div>
            <div class="footer-section">
              <div class="instruction">Visit us at</div>
              <div class="website-url">www.fixystays.com</div>
              <div class="footer">STAY SMART • MANAGE BETTER</div>
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
    <div className="bg-white border-2 border-blue-50 rounded-[2.5rem] p-8 shadow-2xl flex flex-col items-center gap-8 w-full max-w-sm relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-16 -mt-16 transition-all group-hover:scale-110"></div>
      
      <div className="flex items-center justify-between w-full border-b border-gray-100 pb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-lg shadow-blue-100">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-black text-gray-900 tracking-tight">Website QR</h3>
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Marketing Asset</p>
          </div>
        </div>
      </div>
      
      <div 
        ref={printRef} 
        className="p-6 bg-white rounded-[2rem] border-2 border-blue-100 shadow-xl flex items-center justify-center relative z-10"
      >
        <QRCodeCanvas
          value={websiteUrl}
          size={200}
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

      <div className="text-center space-y-2 relative z-10">
        <p className="text-lg font-black text-gray-900 italic tracking-tight">FixyStays.com</p>
        <p className="text-[11px] text-gray-500 font-bold leading-relaxed px-4">
          Alibag's premier hotel booking and data management software.
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full relative z-10">
        <Button 
          className="h-14 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 transition-all active:scale-95 rounded-2xl"
          onClick={handlePrint}
        >
          <Printer className="w-5 h-5 mr-3" /> Print Marketing Card
        </Button>
        <Button 
          variant="ghost" 
          className="h-10 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-blue-600 hover:bg-blue-50 transition-colors"
          onClick={async () => {
            const canvas = printRef.current?.querySelector('canvas')
            if (canvas) {
              const filename = 'fixystays-website-qr.jpg'

              try {
                // Synchronous file conversion preserves user gesture for Web Share API
                const file = getFileFromCanvas(canvas, filename)
                
                // 1. Try modern Web Share API for mobile (iOS/Android)
                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                  await navigator.share({
                    files: [file],
                    title: 'FixyStays Website QR',
                    text: 'Scan this QR code to visit the website.'
                  })
                  return
                }
              } catch (shareErr) {
                console.warn("Share failed, falling back to download", shareErr)
              }

              // 2. Client-side download using local canvas data URL
              try {
                const url = canvas.toDataURL('image/jpeg', 0.9)
                setDownloadImageUrl(url)
                setShowDownloadModal(true)

                const a = document.createElement('a')
                a.href = url
                a.download = filename
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
              } catch (downloadErr) {
                console.error("Client-side download failed", downloadErr)
              }
            }
          }}
        >
          <Download className="w-3.5 h-3.5 mr-2 opacity-50" /> Download Raw Image
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
                alt="Website QR Code" 
                className="w-48 h-48 object-contain shadow-md rounded-xl"
              />
            </div>
            <div className="flex gap-2 w-full mt-2">
              <Button 
                variant="outline"
                className="flex-1 h-11 border-2 border-gray-100 hover:border-blue-200 hover:bg-blue-50 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer"
                onClick={async () => {
                  const canvas = printRef.current?.querySelector('canvas')
                  if (canvas) {
                    const filename = 'fixystays-website-qr.jpg'
                    
                    try {
                      const file = getFileFromCanvas(canvas, filename)
                      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({
                          files: [file],
                          title: 'FixyStays Website QR',
                          text: 'Scan this QR code to visit the website.'
                        })
                        return
                      }
                    } catch (shareErr) {
                      console.warn("Share failed in modal", shareErr)
                    }

                    // Client-side download fallback
                    try {
                      const url = canvas.toDataURL('image/jpeg', 0.9)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = filename
                      document.body.appendChild(a)
                      a.click()
                      document.body.removeChild(a)
                    } catch (downloadErr) {
                      console.error("Client-side download failed in modal", downloadErr)
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
