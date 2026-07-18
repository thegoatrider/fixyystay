'use client'

import { QRCodeCanvas } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Printer, Download, QrCode } from 'lucide-react'
import { useRef, useEffect, useState } from 'react'

export interface GuestCheckinQRProps {
  propertyId: string
  propertyName: string
}

export default function GuestCheckinQR({ propertyId, propertyName }: GuestCheckinQRProps) {
  const printRef = useRef<HTMLDivElement>(null)
  const [origin, setOrigin] = useState('')

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
            @page { size: A4; margin: 0; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              min-height: 100vh;
              text-align: center;
              padding: 20px;
              background-color: white;
              box-sizing: border-box;
            }
            .container {
              border: 12px solid #2563eb;
              padding: 50px 30px;
              border-radius: 50px;
              display: flex;
              flex-direction: column;
              align-items: center;
              width: 90%;
              max-width: 650px;
              box-sizing: border-box;
            }
            .welcome-text {
              font-size: 18px;
              font-weight: 800;
              color: #4b5563;
              letter-spacing: 4px;
              margin-bottom: 8px;
              text-transform: uppercase;
            }
            .property-name {
              font-size: 32px;
              font-weight: 900;
              color: #1f2937;
              margin-bottom: 35px;
              max-width: 500px;
              line-height: 1.2;
              letter-spacing: -0.5px;
            }
            .qr-wrapper {
              background: white;
              padding: 25px;
              border-radius: 25px;
              box-shadow: 0 15px 40px rgba(0,0,0,0.06);
              margin-bottom: 35px;
              border: 1px solid #f3f4f6;
            }
            .instruction {
              font-size: 22px;
              font-weight: 800;
              color: #2563eb;
              margin-bottom: 10px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .sub-instruction {
              font-size: 16px;
              color: #4b5563;
              font-weight: 500;
            }
            .footer {
              margin-top: 45px;
              font-size: 12px;
              color: #9ca3af;
              font-weight: 700;
              letter-spacing: 2px;
              text-transform: uppercase;
              display: flex;
              align-items: center;
              justify-content: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="welcome-text">WELCOME TO</div>
            <div class="property-name">${propertyName}</div>
            <div class="qr-wrapper">
              <img src="${qrDataUrl}" style="width: 320px; height: 320px;" />
            </div>
            <div class="instruction">Scan to Check-in</div>
            <div class="sub-instruction">Please keep your ID proofs ready for scanning</div>
            <div class="footer">
              <img src="/logo.png" style="width: 20px; height: 20px; vertical-align: middle; margin-right: 8px; opacity: 0.5;" />
              Powered by Fixy Stays
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

      <div className="grid grid-cols-2 gap-4 w-full">
        <Button 
          variant="outline" 
          className="h-12 border-2 border-gray-100 hover:border-blue-200 hover:bg-blue-50 font-black text-xs uppercase tracking-wider transition-all rounded-2xl"
          onClick={async () => {
            const canvas = printRef.current?.querySelector('canvas')
            if (canvas) {
              const url = canvas.toDataURL('image/png')
              const filename = `fixy-qr-${propertyName.replace(/\s+/g, '-').toLowerCase()}.png`
              
              try {
                // Try modern Web Share API for mobile (iOS/Android)
                if (navigator.share) {
                  const blob = await (await fetch(url)).blob()
                  const file = new File([blob], filename, { type: 'image/png' })
                  // Check if canShare exists and supports files, or just try catch
                  if (!navigator.canShare || navigator.canShare({ files: [file] })) {
                    await navigator.share({
                      title: 'FixyStays Check-in QR',
                      files: [file]
                    })
                    return;
                  }
                }
              } catch (err) {
                console.error("Share failed", err)
              }

              // Fallback to traditional download for desktop/android
              const link = document.createElement('a')
              link.href = url
              link.download = filename
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)
              
              // iOS Safari fallback if share fails and download attribute is ignored
              const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
              if (isIOS) {
                setTimeout(() => {
                  alert('If the download did not start, please long-press the QR code on the screen and select "Save Image".');
                }, 500);
              }
            }
          }}
        >
          <Download className="w-4 h-4 mr-2" /> ID QR Image
        </Button>
        <Button 
          className="h-12 bg-blue-600 hover:bg-blue-700 font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-100 transition-all active:scale-95 rounded-2xl"
          onClick={handlePrint}
        >
          <Printer className="w-4 h-4 mr-2" /> Print A4 Card
        </Button>
      </div>
    </div>
  )
}
